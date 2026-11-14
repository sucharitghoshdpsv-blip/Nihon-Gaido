export interface ExchangeRateSnapshot {
  base: 'JPY';
  rates: Record<string, number>;
  fetchedAt: number;
  provider: 'open.er-api' | 'frankfurter' | 'cached-fallback';
}

export const SUPPORTED_CURRENCIES: Array<{ code: string; symbol: string; name: string }> = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
];

export const DEFAULT_FALLBACK_RATES: Record<string, number> = {
  JPY: 1,
  USD: 0.0065,
  EUR: 0.0060,
  GBP: 0.0051,
  INR: 0.55,
  AUD: 0.0099,
  CAD: 0.0090,
  SGD: 0.0087,
  KRW: 9.05,
  TWD: 0.21,
  CHF: 0.0057,
};

const LOCALE_TO_CURRENCY: Record<string, string> = {
  US: 'USD',
  GB: 'GBP',
  UK: 'GBP',
  IN: 'INR',
  AU: 'AUD',
  CA: 'CAD',
  SG: 'SGD',
  KR: 'KRW',
  TW: 'TWD',
  CH: 'CHF',
  DE: 'EUR',
  FR: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  AT: 'EUR',
  BE: 'EUR',
  IE: 'EUR',
  FI: 'EUR',
  JP: 'USD',
};

export function detectLocaleCurrency(localeString?: string): string {
  const raw =
    localeString ||
    (typeof navigator !== 'undefined' ? navigator.language : 'en-US') ||
    'en-US';
  const parts = raw.replace('_', '-').split('-');
  const region = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
  if (region && LOCALE_TO_CURRENCY[region]) {
    return LOCALE_TO_CURRENCY[region];
  }
  const lang = parts[0].toLowerCase();
  if (lang === 'hi') return 'INR';
  if (lang === 'ko') return 'KRW';
  if (lang === 'de' || lang === 'fr' || lang === 'es' || lang === 'it') return 'EUR';
  return 'USD';
}

export function convertFromJpy(
  jpyAmount: number,
  targetCurrency: string,
  rates: Record<string, number>
): number {
  if (!Number.isFinite(jpyAmount)) return 0;
  if (targetCurrency === 'JPY') return jpyAmount;
  const rate = rates[targetCurrency] ?? DEFAULT_FALLBACK_RATES[targetCurrency] ?? DEFAULT_FALLBACK_RATES.USD;
  return jpyAmount * rate;
}

export function convertToJpy(
  foreignAmount: number,
  sourceCurrency: string,
  rates: Record<string, number>
): number {
  if (!Number.isFinite(foreignAmount)) return 0;
  if (sourceCurrency === 'JPY') return foreignAmount;
  const rate = rates[sourceCurrency] ?? DEFAULT_FALLBACK_RATES[sourceCurrency] ?? DEFAULT_FALLBACK_RATES.USD;
  if (rate <= 0) return 0;
  return foreignAmount / rate;
}

export function formatJpy(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `¥${safe.toLocaleString('en-US')}`;
}

export function formatCurrencyAmount(amount: number, currencyCode: string): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  if (currencyCode === 'JPY' || currencyCode === 'KRW') {
    const meta = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
    const sym = currencyCode === 'JPY' ? '¥' : meta?.symbol ?? '₩';
    return `${sym}${Math.round(safe).toLocaleString('en-US')}`;
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    return `${currencyCode} ${safe.toFixed(2)}`;
  }
}

export function isRateSnapshotFresh(snapshot: ExchangeRateSnapshot | null, now = Date.now(), maxAgeMs = 3600_000): boolean {
  if (!snapshot) return false;
  return now - snapshot.fetchedAt < maxAgeMs;
}

export async function fetchLiveJpyRates(
  fetcher: typeof fetch = fetch
): Promise<ExchangeRateSnapshot> {
  // Primary: open.er-api.com
  try {
    const res = await fetcher('https://open.er-api.com/v6/latest/JPY');
    if (res.ok) {
      const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
      if (data && data.rates && typeof data.rates.USD === 'number') {
        return {
          base: 'JPY',
          rates: { ...DEFAULT_FALLBACK_RATES, ...data.rates, JPY: 1 },
          fetchedAt: Date.now(),
          provider: 'open.er-api',
        };
      }
    }
  } catch {
    // Fallback below
  }

  // Fallback: frankfurter.app
  try {
    const res = await fetcher('https://api.frankfurter.app/latest?from=JPY');
    if (res.ok) {
      const data = (await res.json()) as { rates?: Record<string, number> };
      if (data && data.rates && typeof data.rates.USD === 'number') {
        return {
          base: 'JPY',
          rates: { ...DEFAULT_FALLBACK_RATES, ...data.rates, JPY: 1 },
          fetchedAt: Date.now(),
          provider: 'frankfurter',
        };
      }
    }
  } catch {
    // Cached fallback below
  }

  return {
    base: 'JPY',
    rates: { ...DEFAULT_FALLBACK_RATES },
    fetchedAt: Date.now(),
    provider: 'cached-fallback',
  };
}
