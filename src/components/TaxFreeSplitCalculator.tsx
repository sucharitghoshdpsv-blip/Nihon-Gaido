import React, { useMemo, useState } from 'react';
import { Receipt, Users, CheckCircle2, Plus } from 'lucide-react';
import type { ExpenseEntry } from '../utils/budget';
import {
  convertFromJpy,
  formatCurrencyAmount,
  formatJpy,
} from '../utils/currency';
import {
  calculateGroupBillSplit,
  calculateJapanTaxFree,
} from '../utils/taxSplitCalculator';

interface TaxFreeSplitCalculatorProps {
  homeCurrency: string;
  rates: Record<string, number>;
  selectedCityName: string;
  onAddExpense: (entry: Omit<ExpenseEntry, 'id' | 'createdAt'>) => void;
}

export const TaxFreeSplitCalculator: React.FC<TaxFreeSplitCalculatorProps> = ({
  homeCurrency,
  rates,
  selectedCityName,
  onAddExpense,
}) => {
  // Tax-free state
  const [receiptAmount, setReceiptAmount] = useState('6600');
  const [inputMode, setInputMode] = useState<'tax_included' | 'before_tax'>('tax_included');
  const [taxRate, setTaxRate] = useState<8 | 10>(10);

  // Split-bill state
  const [billSubtotal, setBillSubtotal] = useState('9800');
  const [dinersCount, setDinersCount] = useState('3');
  const [otoshiPerPerson, setOtoshiPerPerson] = useState('400');
  const [roundTo100, setRoundTo100] = useState(true);
  const [loggedFeedback, setLoggedFeedback] = useState(false);

  const taxCalc = useMemo(
    () =>
      calculateJapanTaxFree(
        parseFloat(receiptAmount) || 0,
        inputMode,
        taxRate
      ),
    [receiptAmount, inputMode, taxRate]
  );

  const splitCalc = useMemo(
    () =>
      calculateGroupBillSplit({
        billSubtotalJpy: parseFloat(billSubtotal) || 0,
        diners: parseInt(dinersCount, 10) || 1,
        otoshiPerPersonJpy: parseFloat(otoshiPerPerson) || 0,
        serviceTipPercent: 0,
        roundToNearest100: roundTo100,
      }),
    [billSubtotal, dinersCount, otoshiPerPerson, roundTo100]
  );

  const handleLogShareToExpenses = () => {
    if (splitCalc.roundedPerPersonJpy <= 0) return;
    onAddExpense({
      title: `Split Dining Share (${splitCalc.diners} diners)`,
      amountJpy: splitCalc.roundedPerPersonJpy,
      category: 'food',
      city: selectedCityName,
      date: new Date().toISOString().slice(0, 10),
    });
    setLoggedFeedback(true);
    window.setTimeout(() => setLoggedFeedback(false), 3000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left: Japan Tax-Free Calculator */}
      <section
        aria-label="Tax-Free Refund Calculator"
        className="lg:col-span-6 liquid-glass rounded-2xl p-6 flex flex-col justify-between gap-5"
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Receipt className="w-5 h-5 text-accent-token shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-xl font-semibold text-primary-token">
                  Tax-Free Refund Checker
                </h2>
                <p className="text-xs text-muted-token">
                  Same-day ¥5,000 before-tax minimum at Don Quijote, Uniqlo &amp; drugstores
                </p>
              </div>
            </div>
            <span
              className={`text-xs font-semibold whitespace-nowrap shrink-0 ${
                taxCalc.qualifiesForTaxFree ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {taxCalc.qualifiesForTaxFree ? 'Eligible' : 'Below ¥5,000'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="taxfree-amount" className="block text-xs text-muted-token mb-1">
                Receipt Total (JPY)
              </label>
              <input
                id="taxfree-amount"
                type="number"
                min={0}
                value={receiptAmount}
                onChange={(e) => setReceiptAmount(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm font-mono font-semibold bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
              />
            </div>
            <div>
              <label htmlFor="taxfree-mode" className="block text-xs text-muted-token mb-1">
                Tag Price Basis
              </label>
              <select
                id="taxfree-mode"
                value={inputMode}
                onChange={(e) =>
                  setInputMode(e.target.value as 'tax_included' | 'before_tax')
                }
                className="w-full rounded-xl px-3 py-2 text-xs bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
              >
                <option value="tax_included">Tax-Included (税込)</option>
                <option value="before_tax">Before Tax (税抜)</option>
              </select>
            </div>
            <div>
              <label htmlFor="taxfree-rate" className="block text-xs text-muted-token mb-1">
                Consumption Tax
              </label>
              <select
                id="taxfree-rate"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value) as 8 | 10)}
                className="w-full rounded-xl px-3 py-2 text-xs bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
              >
                <option value={10}>10% General Goods</option>
                <option value={8}>8% Snacks &amp; Drinks</option>
              </select>
            </div>
          </div>

          {/* Progress Bar toward ¥5,000 before tax */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono tabular-nums">
              <span className="text-secondary-token">
                Before-Tax Value: {formatJpy(taxCalc.beforeTaxJpy)} / ¥5,000
              </span>
              <span className="text-accent-token font-semibold">{taxCalc.progressPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  taxCalc.qualifiesForTaxFree ? 'bg-emerald-400' : 'bg-[var(--accent)]'
                }`}
                style={{ width: `${taxCalc.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 grid grid-cols-3 gap-3">
          <div>
            <p className="text-[11px] text-muted-token">Estimated Refund</p>
            <p className="font-mono text-lg font-bold text-emerald-400 tabular-nums">
              {formatJpy(taxCalc.refundAmountJpy)}
            </p>
            <p className="text-[11px] font-mono text-secondary-token tabular-nums">
              {formatCurrencyAmount(
                convertFromJpy(taxCalc.refundAmountJpy, homeCurrency, rates),
                homeCurrency
              )}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-token">Net After Refund</p>
            <p className="font-mono text-lg font-bold text-primary-token tabular-nums">
              {formatJpy(taxCalc.netPayableAfterRefundJpy)}
            </p>
            <p className="text-[11px] font-mono text-secondary-token tabular-nums">
              {formatCurrencyAmount(
                convertFromJpy(taxCalc.netPayableAfterRefundJpy, homeCurrency, rates),
                homeCurrency
              )}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-token">
              {taxCalc.qualifiesForTaxFree ? 'Passport Rule' : 'Need More'}
            </p>
            <p className="font-mono text-sm font-semibold text-accent-token tabular-nums mt-0.5">
              {taxCalc.qualifiesForTaxFree
                ? 'Seal Sealed Bag'
                : `+${formatJpy(taxCalc.shortfallBeforeTaxJpy)}`}
            </p>
            <p className="text-[11px] text-muted-token">
              {taxCalc.qualifiesForTaxFree
                ? 'Keep physical passport handy'
                : 'before tax needed'}
            </p>
          </div>
        </div>
      </section>

      {/* Right: Group Dining Split-Bill Calculator */}
      <section
        aria-label="Group Dining Split-Bill Calculator"
        className="lg:col-span-6 liquid-glass rounded-2xl p-6 flex flex-col justify-between gap-5"
      >
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Users className="w-5 h-5 text-accent-token shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display text-xl font-semibold text-primary-token">
                  Izakaya Split-Bill Calculator
                </h2>
                <p className="text-xs text-muted-token">
                  Splits group tabs cleanly with optional otoshi seating cover &amp; ¥100 rounding
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRoundTo100((v) => !v)}
              aria-pressed={roundTo100}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap shrink-0 ${
                roundTo100
                  ? 'bg-accent-token'
                  : 'liquid-glass text-secondary-token hover:text-primary-token'
              }`}
            >
              {roundTo100 ? '¥100 Cash Round: On' : 'Exact Split'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="split-subtotal" className="block text-xs text-muted-token mb-1">
                Table Bill (JPY)
              </label>
              <input
                id="split-subtotal"
                type="number"
                min={0}
                value={billSubtotal}
                onChange={(e) => setBillSubtotal(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm font-mono font-semibold bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
              />
            </div>
            <div>
              <label htmlFor="split-diners" className="block text-xs text-muted-token mb-1">
                Diners
              </label>
              <input
                id="split-diners"
                type="number"
                min={1}
                max={20}
                value={dinersCount}
                onChange={(e) => setDinersCount(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm font-mono font-semibold bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
              />
            </div>
            <div>
              <label htmlFor="split-otoshi" className="block text-xs text-muted-token mb-1">
                Otoshi Cover / Person
              </label>
              <input
                id="split-otoshi"
                type="number"
                min={0}
                step={50}
                value={otoshiPerPerson}
                onChange={(e) => setOtoshiPerPerson(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm font-mono font-semibold bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-muted-token">Per Person Share</p>
              <p className="font-mono text-xl font-bold text-accent-token tabular-nums">
                {formatJpy(splitCalc.roundedPerPersonJpy)}
              </p>
              <p className="text-[11px] font-mono text-secondary-token tabular-nums">
                ≈{' '}
                {formatCurrencyAmount(
                  convertFromJpy(splitCalc.roundedPerPersonJpy, homeCurrency, rates),
                  homeCurrency
                )}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-token">Grand Total (No Tipping)</p>
              <p className="font-mono text-xl font-bold text-primary-token tabular-nums">
                {formatJpy(splitCalc.grandTotalJpy)}
              </p>
              <p className="text-[11px] font-mono text-muted-token tabular-nums">
                {splitCalc.poolRemainderJpy > 0
                  ? `+${formatJpy(splitCalc.poolRemainderJpy)} coin pool change`
                  : `${splitCalc.diners} × ${formatJpy(splitCalc.exactPerPersonJpy)}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogShareToExpenses}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-accent-token whitespace-nowrap shrink-0"
          >
            {loggedFeedback ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Added to Ledger
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Log My Share
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
};
