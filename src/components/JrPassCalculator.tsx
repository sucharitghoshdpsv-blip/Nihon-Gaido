import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, CheckCircle2, Ticket } from 'lucide-react';
import { convertFromJpy, formatCurrencyAmount, formatJpy } from '../utils/currency';
import {
  INTERCITY_LEGS,
  RAIL_PASS_OPTIONS,
  compareRailPassVsSingle,
  type RailPassOption,
} from '../utils/transitCalculator';

interface JrPassCalculatorProps {
  homeCurrency: string;
  rates: Record<string, number>;
}

export const JrPassCalculator: React.FC<JrPassCalculatorProps> = ({
  homeCurrency,
  rates,
}) => {
  const [selectedLegs, setSelectedLegs] = useState<string[]>([
    'tyo-kyo',
    'kyo-nar',
    'nar-osa',
  ]);
  const [passId, setPassId] = useState<RailPassOption['id']>('jr-7');
  const [roundTrip, setRoundTrip] = useState(false);

  const toggleLeg = (id: string) => {
    setSelectedLegs((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const result = useMemo(
    () => compareRailPassVsSingle(selectedLegs, passId, roundTrip),
    [selectedLegs, passId, roundTrip]
  );

  const maxComparison = Math.max(
    1,
    result.pointToPointTotalJpy,
    result.effectivePassCostJpy
  );
  const singlePct = Math.round((result.pointToPointTotalJpy / maxComparison) * 100);
  const passPct = Math.round((result.effectivePassCostJpy / maxComparison) * 100);

  return (
    <section
      aria-label="JR Pass versus Point-to-Point Calculator"
      className="liquid-glass rounded-2xl p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Ticket className="w-5 h-5 text-accent-token shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display text-xl font-semibold text-primary-token">
              JR Pass vs. Point-to-Point Calculator
            </h2>
            <p className="text-xs text-muted-token mt-0.5">
              Toggle your planned intercity rail legs to verify if a pass beats individual SmartEX/JR tickets.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRoundTrip((v) => !v)}
          aria-pressed={roundTrip}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            roundTrip
              ? 'bg-accent-token'
              : 'liquid-glass text-secondary-token hover:text-primary-token'
          }`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          {roundTrip ? 'Mode: Round Trip (×2)' : 'Mode: One-Way Legs'}
        </button>
      </div>

      {/* Pass Tier Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {RAIL_PASS_OPTIONS.map((pass) => {
          const active = passId === pass.id;
          return (
            <button
              key={pass.id}
              type="button"
              onClick={() => setPassId(pass.id)}
              aria-pressed={active}
              className={`rounded-xl p-3.5 text-left border transition-colors flex flex-col justify-between gap-1.5 ${
                active
                  ? 'liquid-glass-elevated border-[var(--accent)] ring-1 ring-[var(--accent)]'
                  : 'bg-black/5 dark:bg-black/30 border-black/10 dark:border-amber-200/15 hover:border-accent-token'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-sm font-semibold text-primary-token">
                  {pass.name}
                </span>
                <span className="font-mono text-xs font-bold text-accent-token tabular-nums shrink-0">
                  {formatJpy(pass.priceJpy)}
                </span>
              </div>
              <p className="text-[11px] text-secondary-token leading-relaxed">{pass.notes}</p>
            </button>
          );
        })}
      </div>

      {/* Intercity Leg Selector */}
      <div>
        <p className="text-xs font-medium text-muted-token mb-2">
          Select Planned Intercity Legs ({selectedLegs.length} chosen)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {INTERCITY_LEGS.map((leg) => {
            const active = selectedLegs.includes(leg.id);
            return (
              <button
                key={leg.id}
                type="button"
                onClick={() => toggleLeg(leg.id)}
                aria-pressed={active}
                className={`rounded-xl p-3 text-left border transition-colors space-y-1 ${
                  active
                    ? 'bg-accent-soft-token border-[var(--accent)]/60'
                    : 'bg-black/5 dark:bg-black/30 border-black/10 dark:border-amber-200/15 text-secondary-token hover:text-primary-token'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-primary-token">
                    {leg.from} → {leg.to}
                  </span>
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      active ? 'text-accent-token' : 'text-muted-token opacity-35'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-muted-token tabular-nums">
                  <span>{leg.durationLabel}</span>
                  <span>
                    {formatJpy(leg.singleTicketJpy * (roundTrip ? 2 : 1))}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Side-by-Side Fare Verdict */}
      <div className="rounded-xl p-4 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-token">Point-to-Point Single Tickets</p>
            <p className="font-mono text-xl font-bold text-primary-token tabular-nums mt-0.5">
              {formatJpy(result.pointToPointTotalJpy)}
            </p>
            <p className="text-xs font-mono text-secondary-token tabular-nums">
              {formatCurrencyAmount(
                convertFromJpy(result.pointToPointTotalJpy, homeCurrency, rates),
                homeCurrency
              )}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-token">Effective Pass Total</p>
            <p className="font-mono text-xl font-bold text-primary-token tabular-nums mt-0.5">
              {formatJpy(result.effectivePassCostJpy)}
            </p>
            <p className="text-xs font-mono text-secondary-token tabular-nums">
              {result.uncoveredTicketsJpy > 0
                ? `Pass + ${formatJpy(result.uncoveredTicketsJpy)} uncovered`
                : formatCurrencyAmount(
                    convertFromJpy(result.effectivePassCostJpy, homeCurrency, rates),
                    homeCurrency
                  )}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-token">Recommendation</p>
            <p
              className={`font-display text-base font-bold mt-0.5 ${
                result.recommendPass ? 'text-emerald-400' : 'text-accent-token'
              }`}
            >
              {result.pointToPointTotalJpy === 0
                ? 'Choose Rail Legs'
                : result.recommendPass
                  ? 'Buy the Rail Pass'
                  : 'Buy Single Tickets'}
            </p>
            <p className="text-xs text-secondary-token">{result.verdictLabel}</p>
          </div>
        </div>

        {/* Comparison bars */}
        <div className="space-y-2 text-[11px] font-mono tabular-nums">
          <div className="space-y-1">
            <div className="flex justify-between text-secondary-token">
              <span>Single Tickets</span>
              <span>{formatJpy(result.pointToPointTotalJpy)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${singlePct}%` }}
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-secondary-token">
              <span>Selected Pass + Uncovered Legs</span>
              <span>{formatJpy(result.effectivePassCostJpy)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${passPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
