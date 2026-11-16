export interface TaxFreeCalculation {
  enteredJpy: number;
  beforeTaxJpy: number;
  taxRatePercent: 8 | 10;
  taxAmountJpy: number;
  thresholdBeforeTaxJpy: number;
  qualifiesForTaxFree: boolean;
  shortfallBeforeTaxJpy: number;
  refundAmountJpy: number;
  netPayableAfterRefundJpy: number;
  progressPercent: number;
}

export interface SplitBillCalculation {
  billSubtotalJpy: number;
  otoshiTotalJpy: number;
  serviceTipJpy: number;
  grandTotalJpy: number;
  diners: number;
  exactPerPersonJpy: number;
  roundedPerPersonJpy: number;
  poolRemainderJpy: number;
}

export const JAPAN_TAX_FREE_THRESHOLD_JPY = 5000;

export function calculateJapanTaxFree(
  amountJpy: number,
  inputMode: 'tax_included' | 'before_tax',
  taxRatePercent: 8 | 10 = 10
): TaxFreeCalculation {
  const safeAmount = Math.max(0, Math.round(Number.isFinite(amountJpy) ? amountJpy : 0));
  const multiplier = 1 + taxRatePercent / 100;

  const beforeTaxJpy =
    inputMode === 'tax_included'
      ? Math.round(safeAmount / multiplier)
      : safeAmount;

  const taxAmountJpy =
    inputMode === 'tax_included'
      ? Math.max(0, safeAmount - beforeTaxJpy)
      : Math.round(beforeTaxJpy * (taxRatePercent / 100));

  const totalWithTaxJpy = beforeTaxJpy + taxAmountJpy;
  const qualifiesForTaxFree = beforeTaxJpy >= JAPAN_TAX_FREE_THRESHOLD_JPY;
  const shortfallBeforeTaxJpy = qualifiesForTaxFree
    ? 0
    : JAPAN_TAX_FREE_THRESHOLD_JPY - beforeTaxJpy;

  const refundAmountJpy = qualifiesForTaxFree ? taxAmountJpy : 0;
  const netPayableAfterRefundJpy = qualifiesForTaxFree ? beforeTaxJpy : totalWithTaxJpy;
  const progressPercent = Math.min(
    100,
    Math.round((beforeTaxJpy / JAPAN_TAX_FREE_THRESHOLD_JPY) * 100)
  );

  return {
    enteredJpy: safeAmount,
    beforeTaxJpy,
    taxRatePercent,
    taxAmountJpy,
    thresholdBeforeTaxJpy: JAPAN_TAX_FREE_THRESHOLD_JPY,
    qualifiesForTaxFree,
    shortfallBeforeTaxJpy,
    refundAmountJpy,
    netPayableAfterRefundJpy,
    progressPercent,
  };
}

export function calculateGroupBillSplit(params: {
  billSubtotalJpy: number;
  diners: number;
  otoshiPerPersonJpy?: number;
  serviceTipPercent?: number;
  roundToNearest100?: boolean;
}): SplitBillCalculation {
  const subtotal = Math.max(0, Math.round(Number.isFinite(params.billSubtotalJpy) ? params.billSubtotalJpy : 0));
  const diners = Math.min(20, Math.max(1, Math.round(Number.isFinite(params.diners) ? params.diners : 1)));
  const otoshiEach = Math.max(0, Math.round(params.otoshiPerPersonJpy || 0));
  const tipPct = Math.min(30, Math.max(0, Number(params.serviceTipPercent || 0)));

  const otoshiTotalJpy = otoshiEach * diners;
  const serviceTipJpy = Math.round((subtotal + otoshiTotalJpy) * (tipPct / 100));
  const grandTotalJpy = subtotal + otoshiTotalJpy + serviceTipJpy;

  const exactPerPersonJpy = Math.ceil(grandTotalJpy / diners);
  const roundedPerPersonJpy = params.roundToNearest100
    ? Math.ceil(exactPerPersonJpy / 100) * 100
    : exactPerPersonJpy;

  const poolRemainderJpy = Math.max(0, roundedPerPersonJpy * diners - grandTotalJpy);

  return {
    billSubtotalJpy: subtotal,
    otoshiTotalJpy,
    serviceTipJpy,
    grandTotalJpy,
    diners,
    exactPerPersonJpy,
    roundedPerPersonJpy,
    poolRemainderJpy,
  };
}
