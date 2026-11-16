import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateGroupBillSplit, calculateJapanTaxFree } from './taxSplitCalculator';

test('calculateJapanTaxFree checks ¥5,000 before-tax exemption threshold and refund math', () => {
  const below = calculateJapanTaxFree(4800, 'before_tax', 10);
  assert.equal(below.qualifiesForTaxFree, false);
  assert.equal(below.shortfallBeforeTaxJpy, 200);
  assert.equal(below.refundAmountJpy, 0);

  const taxIncludedQualifying = calculateJapanTaxFree(5500, 'tax_included', 10);
  assert.equal(taxIncludedQualifying.beforeTaxJpy, 5000);
  assert.equal(taxIncludedQualifying.qualifiesForTaxFree, true);
  assert.equal(taxIncludedQualifying.refundAmountJpy, 500);
  assert.equal(taxIncludedQualifying.netPayableAfterRefundJpy, 5000);
});

test('calculateGroupBillSplit splits total with otoshi seating charge and ¥100 cash rounding', () => {
  const split = calculateGroupBillSplit({
    billSubtotalJpy: 12400,
    diners: 4,
    otoshiPerPersonJpy: 400,
    serviceTipPercent: 0,
    roundToNearest100: true,
  });
  assert.equal(split.otoshiTotalJpy, 1600);
  assert.equal(split.grandTotalJpy, 14000);
  assert.equal(split.exactPerPersonJpy, 3500);
  assert.equal(split.roundedPerPersonJpy, 3500);
  assert.equal(split.poolRemainderJpy, 0);

  const uneven = calculateGroupBillSplit({
    billSubtotalJpy: 10000,
    diners: 3,
    otoshiPerPersonJpy: 0,
    roundToNearest100: true,
  });
  assert.equal(uneven.exactPerPersonJpy, 3334);
  assert.equal(uneven.roundedPerPersonJpy, 3400);
  assert.equal(uneven.poolRemainderJpy, 200);
});
