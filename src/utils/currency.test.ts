import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectLocaleCurrency,
  convertFromJpy,
  convertToJpy,
  fetchLiveJpyRates,
  isRateSnapshotFresh,
  DEFAULT_FALLBACK_RATES,
} from './currency';

test('detectLocaleCurrency maps common browser locales accurately', () => {
  assert.equal(detectLocaleCurrency('en-US'), 'USD');
  assert.equal(detectLocaleCurrency('en-IN'), 'INR');
  assert.equal(detectLocaleCurrency('en-GB'), 'GBP');
  assert.equal(detectLocaleCurrency('de-DE'), 'EUR');
  assert.equal(detectLocaleCurrency('ja-JP'), 'USD');
});

test('JPY conversions roundtrip cleanly with custom rates', () => {
  const rates = { ...DEFAULT_FALLBACK_RATES, USD: 0.0067 };
  const usd = convertFromJpy(10000, 'USD', rates);
  assert.equal(Math.round(usd), 67);
  const backToJpy = convertToJpy(usd, 'USD', rates);
  assert.equal(Math.round(backToJpy), 10000);
});

test('fetchLiveJpyRates falls back to frankfurter.app when open.er-api fails', async () => {
  let calls = 0;
  const mockFetch = (async (url: string | URL | Request) => {
    calls += 1;
    const str = String(url);
    if (str.includes('open.er-api.com')) {
      return new Response('down', { status: 503 });
    }
    return new Response(
      JSON.stringify({
        base: 'JPY',
        rates: { USD: 0.0066, EUR: 0.0061 },
      }),
      { status: 200 }
    );
  }) as typeof fetch;

  const snap = await fetchLiveJpyRates(mockFetch);
  assert.equal(calls, 2);
  assert.equal(snap.provider, 'frankfurter');
  assert.equal(snap.rates.USD, 0.0066);
  assert.equal(isRateSnapshotFresh(snap), true);
});
