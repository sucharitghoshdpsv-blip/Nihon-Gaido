import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Plus,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  EXPENSE_CATEGORIES,
  summarizeBudget,
  type ExpenseCategory,
  type ExpenseEntry,
} from '../utils/budget';
import {
  SUPPORTED_CURRENCIES,
  convertFromJpy,
  convertToJpy,
  formatCurrencyAmount,
  formatJpy,
  type ExchangeRateSnapshot,
} from '../utils/currency';
import { CITY_GUIDES } from '../data/japanData';
import { TaxFreeSplitCalculator } from './TaxFreeSplitCalculator';

interface BudgetConverterViewProps {
  expenses: ExpenseEntry[];
  onAddExpense: (entry: Omit<ExpenseEntry, 'id' | 'createdAt'>) => void;
  onDeleteExpense: (id: string) => void;
  dailyBudgetJpy: number;
  onChangeDailyBudget: (val: number) => void;
  tripDays: number;
  onChangeTripDays: (val: number) => void;
  homeCurrency: string;
  onChangeHomeCurrency: (code: string) => void;
  rateSnapshot: ExchangeRateSnapshot;
  refreshingRates: boolean;
  onRefreshRates: () => void;
  selectedCityName?: string;
}

export const BudgetConverterView: React.FC<BudgetConverterViewProps> = ({
  expenses,
  onAddExpense,
  onDeleteExpense,
  dailyBudgetJpy,
  onChangeDailyBudget,
  tripDays,
  onChangeTripDays,
  homeCurrency,
  onChangeHomeCurrency,
  rateSnapshot,
  refreshingRates,
  onRefreshRates,
  selectedCityName = 'Tokyo',
}) => {
  // Bidirectional converter state
  const [converterJpy, setConverterJpy] = useState<string>('10000');
  const [converterForeign, setConverterForeign] = useState<string>(() =>
    convertFromJpy(10000, homeCurrency, rateSnapshot.rates).toFixed(2)
  );

  // Expense form state
  const [title, setTitle] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [inputCurrency, setInputCurrency] = useState<'JPY' | 'HOME'>('JPY');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [city, setCity] = useState('Tokyo');
  const [date, setDate] = useState('2026-11-14');
  const [formError, setFormError] = useState<string | null>(null);

  const summary = summarizeBudget(expenses, dailyBudgetJpy, tripDays);

  const handleJpyChange = (val: string) => {
    setConverterJpy(val);
    const num = parseFloat(val);
    if (Number.isFinite(num)) {
      setConverterForeign(convertFromJpy(num, homeCurrency, rateSnapshot.rates).toFixed(2));
    } else {
      setConverterForeign('');
    }
  };

  const handleForeignChange = (val: string) => {
    setConverterForeign(val);
    const num = parseFloat(val);
    if (Number.isFinite(num)) {
      setConverterJpy(String(Math.round(convertToJpy(num, homeCurrency, rateSnapshot.rates))));
    } else {
      setConverterJpy('');
    }
  };

  const handleCurrencyChange = (nextCurrency: string) => {
    onChangeHomeCurrency(nextCurrency);
    const num = parseFloat(converterJpy);
    if (Number.isFinite(num)) {
      setConverterForeign(convertFromJpy(num, nextCurrency, rateSnapshot.rates).toFixed(2));
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rawNum = parseFloat(amountInput);
    if (!title.trim()) {
      setFormError('Enter an expense description.');
      return;
    }
    if (!Number.isFinite(rawNum) || rawNum <= 0) {
      setFormError('Enter an amount greater than zero.');
      return;
    }
    setFormError(null);

    const amountJpy =
      inputCurrency === 'JPY'
        ? Math.round(rawNum)
        : Math.round(convertToJpy(rawNum, homeCurrency, rateSnapshot.rates));

    onAddExpense({
      title: title.trim(),
      amountJpy,
      category,
      city,
      date,
    });
    setTitle('');
    setAmountInput('');
  };

  // SVG Donut calculation
  const totalForChart = Math.max(1, summary.totalSpentJpy);
  let cumulativeAngle = 0;

  return (
    <div className="space-y-8">
      {/* Top Row: Budget Summary Metrics + Live JPY Converter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Budget Summary */}
        <section className="lg:col-span-7 liquid-glass-elevated rounded-2xl p-6 flex flex-col justify-between gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-primary-token">
                Japan Trip Budget
              </h1>
              <p className="text-xs text-muted-token mt-0.5">
                All JPY amounts include live {homeCurrency} estimates
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium">
              {summary.status === 'over' ? (
                <span className="inline-flex items-center gap-1.5 text-rose-400">
                  <AlertTriangle className="w-4 h-4" />
                  Over Budget ({summary.percentUsed}%)
                </span>
              ) : summary.status === 'warning' ? (
                <span className="inline-flex items-center gap-1.5 text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  Near Cap ({summary.percentUsed}%)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  On Track ({summary.percentUsed}%)
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-token">Total Spent</p>
              <p className="font-mono text-xl font-bold text-accent-token tabular-nums mt-0.5">
                {formatJpy(summary.totalSpentJpy)}
              </p>
              <p className="font-mono text-xs text-secondary-token tabular-nums">
                {formatCurrencyAmount(
                  convertFromJpy(summary.totalSpentJpy, homeCurrency, rateSnapshot.rates),
                  homeCurrency
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-token">Remaining</p>
              <p className="font-mono text-xl font-bold text-primary-token tabular-nums mt-0.5">
                {formatJpy(summary.remainingJpy)}
              </p>
              <p className="font-mono text-xs text-secondary-token tabular-nums">
                {formatCurrencyAmount(
                  convertFromJpy(summary.remainingJpy, homeCurrency, rateSnapshot.rates),
                  homeCurrency
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-token">Total Budget</p>
              <p className="font-mono text-xl font-bold text-primary-token tabular-nums mt-0.5">
                {formatJpy(summary.totalBudgetJpy)}
              </p>
              <p className="font-mono text-xs text-secondary-token tabular-nums">
                {formatCurrencyAmount(
                  convertFromJpy(summary.totalBudgetJpy, homeCurrency, rateSnapshot.rates),
                  homeCurrency
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-token">Daily Avg</p>
              <p className="font-mono text-xl font-bold text-primary-token tabular-nums mt-0.5">
                {formatJpy(summary.dailyAverageJpy)}
              </p>
              <p className="font-mono text-xs text-secondary-token tabular-nums">
                {formatCurrencyAmount(
                  convertFromJpy(summary.dailyAverageJpy, homeCurrency, rateSnapshot.rates),
                  homeCurrency
                )}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-black/10 dark:border-amber-200/15">
            <div>
              <label htmlFor="daily-cap-input" className="block text-xs text-muted-token mb-1">
                Daily Target (JPY)
              </label>
              <input
                id="daily-cap-input"
                type="number"
                min={1000}
                step={500}
                value={dailyBudgetJpy}
                onChange={(e) => onChangeDailyBudget(Number(e.target.value) || 18000)}
                className="w-full rounded-xl px-3 py-2 text-sm font-mono bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
              />
            </div>
            <div>
              <label htmlFor="trip-days-budget" className="block text-xs text-muted-token mb-1">
                Trip Days
              </label>
              <input
                id="trip-days-budget"
                type="number"
                min={1}
                max={30}
                value={tripDays}
                onChange={(e) => onChangeTripDays(Number(e.target.value) || 7)}
                className="w-full rounded-xl px-3 py-2 text-sm font-mono bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
              />
            </div>
          </div>
        </section>

        {/* Live JPY <-> Home Currency Converter */}
        <section className="lg:col-span-5 liquid-glass rounded-2xl p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-primary-token">
                Live JPY Converter
              </h2>
              <p className="text-xs text-muted-token">
                Source: {rateSnapshot.provider} · Updated{' '}
                {new Date(rateSnapshot.fetchedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={onRefreshRates}
              disabled={refreshingRates}
              aria-label="Refresh exchange rates"
              className="p-2 rounded-xl liquid-glass text-accent-token hover:border-accent-token disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshingRates ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="conv-jpy" className="block text-xs text-muted-token mb-1">
                Japanese Yen (JPY)
              </label>
              <input
                id="conv-jpy"
                type="number"
                value={converterJpy}
                onChange={(e) => handleJpyChange(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-base font-mono font-semibold bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
              />
            </div>

            <div className="flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4 text-accent-token" />
            </div>

            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-5">
                <label htmlFor="home-curr-select" className="block text-xs text-muted-token mb-1">
                  Home Currency
                </label>
                <select
                  id="home-curr-select"
                  value={homeCurrency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="w-full rounded-xl px-2.5 py-2.5 text-sm font-mono bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-7">
                <label htmlFor="conv-foreign" className="block text-xs text-muted-token mb-1">
                  Converted Amount
                </label>
                <input
                  id="conv-foreign"
                  type="number"
                  step="0.01"
                  value={converterForeign}
                  onChange={(e) => handleForeignChange(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-base font-mono font-semibold bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-black/10 dark:border-amber-200/15 flex items-center justify-between text-xs font-mono text-secondary-token">
            <span>¥1,000 = {formatCurrencyAmount(convertFromJpy(1000, homeCurrency, rateSnapshot.rates), homeCurrency)}</span>
            <span>1 {homeCurrency} = {formatJpy(convertToJpy(1, homeCurrency, rateSnapshot.rates))}</span>
          </div>
        </section>
      </div>

      {/* Tax-Free Threshold & Group Split-Bill Calculators */}
      <TaxFreeSplitCalculator
        homeCurrency={homeCurrency}
        rates={rateSnapshot.rates}
        selectedCityName={selectedCityName}
        onAddExpense={onAddExpense}
      />

      {/* Category Breakdown Chart + Add Expense Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Category Breakdown Chart */}
        <section className="lg:col-span-6 liquid-glass rounded-2xl p-6 space-y-5">
          <h2 className="font-display text-xl font-semibold text-primary-token">
            Category Breakdown
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <svg
              viewBox="0 0 120 120"
              className="w-36 h-36 shrink-0"
              role="img"
              aria-label="Expense category breakdown donut chart"
            >
              <circle
                cx="60"
                cy="60"
                r="44"
                fill="none"
                stroke="currentColor"
                strokeWidth="16"
                className="text-black/10 dark:text-white/10"
              />
              {summary.categories.map((cat) => {
                if (cat.totalJpy <= 0) return null;
                const circumference = 2 * Math.PI * 44;
                const fraction = cat.totalJpy / totalForChart;
                const dash = fraction * circumference;
                const offset = -(cumulativeAngle * circumference);
                cumulativeAngle += fraction;
                return (
                  <circle
                    key={cat.category}
                    cx="60"
                    cy="60"
                    r="44"
                    fill="none"
                    stroke={cat.color}
                    strokeWidth="16"
                    strokeDasharray={`${dash} ${circumference}`}
                    strokeDashoffset={offset}
                    transform="rotate(-90 60 60)"
                  />
                );
              })}
              <text
                x="60"
                y="57"
                textAnchor="middle"
                className="text-[10px] fill-current text-muted-token"
              >
                SPENT
              </text>
              <text
                x="60"
                y="70"
                textAnchor="middle"
                className="text-[11px] font-mono font-bold fill-current text-primary-token"
              >
                {summary.percentUsed}%
              </text>
            </svg>

            <div className="flex-1 w-full space-y-3">
              {summary.categories.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-primary-token flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm inline-block shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.label}
                    </span>
                    <span className="font-mono text-secondary-token tabular-nums">
                      {formatJpy(cat.totalJpy)} ·{' '}
                      {formatCurrencyAmount(
                        convertFromJpy(cat.totalJpy, homeCurrency, rateSnapshot.rates),
                        homeCurrency
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Log Expense Form */}
        <section className="lg:col-span-6 liquid-glass rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-xl font-semibold text-primary-token">
            Log Travel Expense
          </h2>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="exp-title" className="block text-xs text-muted-token mb-1">
                  Description
                </label>
                <input
                  id="exp-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Gion Kaiseki Lunch"
                  className="w-full rounded-xl px-3.5 py-2 text-sm bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
                />
              </div>
              <div>
                <label htmlFor="exp-amount" className="block text-xs text-muted-token mb-1">
                  Amount ({inputCurrency === 'JPY' ? 'JPY' : homeCurrency})
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="exp-amount"
                    type="number"
                    min={1}
                    step="any"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="3200"
                    className="flex-1 rounded-xl px-3 py-2 text-sm font-mono bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
                  />
                  <button
                    type="button"
                    onClick={() => setInputCurrency((c) => (c === 'JPY' ? 'HOME' : 'JPY'))}
                    className="px-3 py-2 rounded-xl text-xs font-mono liquid-glass text-accent-token whitespace-nowrap shrink-0"
                  >
                    {inputCurrency === 'JPY' ? 'JPY' : homeCurrency}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5">
                <label htmlFor="exp-category" className="block text-xs text-muted-token mb-1">
                  Category
                </label>
                <select
                  id="exp-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full rounded-xl px-3 py-2 text-sm bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="exp-city" className="block text-xs text-muted-token mb-1">
                  City
                </label>
                <select
                  id="exp-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
                >
                  {CITY_GUIDES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-4">
                <label htmlFor="exp-date" className="block text-xs text-muted-token mb-1">
                  Date
                </label>
                <input
                  id="exp-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-sm font-mono bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
                />
              </div>
            </div>

            {formError && <p className="text-xs text-rose-400">{formError}</p>}

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent-token whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          </form>
        </section>
      </div>

      {/* Expense Ledger */}
      <section className="liquid-glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-primary-token">
            Expense Ledger
          </h2>
          <span className="text-xs font-mono text-muted-token">
            {expenses.length} entries
          </span>
        </div>

        {expenses.length === 0 ? (
          <p className="text-sm text-secondary-token py-6 text-center">
            No expenses logged yet. Add your first meal, rail fare, or shrine entry above.
          </p>
        ) : (
          <div className="divide-y divide-black/10 dark:divide-amber-200/15">
            {expenses.map((exp) => {
              const catMeta = EXPENSE_CATEGORIES.find((c) => c.id === exp.category);
              const converted = convertFromJpy(exp.amountJpy, homeCurrency, rateSnapshot.rates);
              return (
                <div
                  key={exp.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-medium text-primary-token">{exp.title}</p>
                    <p className="text-xs text-muted-token">
                      {catMeta?.label || exp.category} · {exp.city} · {exp.date}
                    </p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right font-mono">
                      <p className="text-sm font-semibold text-accent-token tabular-nums">
                        {formatJpy(exp.amountJpy)}
                      </p>
                      <p className="text-xs text-muted-token tabular-nums">
                        {formatCurrencyAmount(converted, homeCurrency)}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete ${exp.title}`}
                      onClick={() => onDeleteExpense(exp.id)}
                      className="p-2 rounded-lg text-muted-token hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
