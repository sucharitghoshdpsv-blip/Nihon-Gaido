import React, { useState } from 'react';
import { BriefcaseMedical, Volume2 } from 'lucide-react';
import {
  SURVIVAL_GUIDE_CARDS,
  type SurvivalCategory,
} from '../data/survivalGuideData';
import { speakJapanese } from '../utils/speech';
import { LiquidTabs } from './ui/liquid-glass-navbar';

const CATEGORIES: Array<'All' | SurvivalCategory> = [
  'All',
  'Cold & Pharmacy',
  'IC Card & ATM',
  'Takkyubin Luggage',
  'Konbini Counter',
];

export const KonbiniPharmacyGuide: React.FC = () => {
  const [selectedCat, setSelectedCat] = useState<'All' | SurvivalCategory>('All');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const visibleCards =
    selectedCat === 'All'
      ? SURVIVAL_GUIDE_CARDS
      : SURVIVAL_GUIDE_CARDS.filter((c) => c.category === selectedCat);

  const activeShowCard = expandedCardId
    ? SURVIVAL_GUIDE_CARDS.find((c) => c.id === expandedCardId) || null
    : null;

  return (
    <section
      aria-label="Konbini and Pharmacy Survival Guide"
      className="liquid-glass rounded-2xl p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <BriefcaseMedical className="w-5 h-5 text-accent-token shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display text-xl font-semibold text-primary-token">
              Konbini &amp; Pharmacy Survival Vault
            </h2>
            <p className="text-xs text-muted-token mt-0.5">
              Point-and-show Japanese counter cards for medicine, IC top-ups, Takkyubin luggage forwarding &amp; ATMs.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-muted-token whitespace-nowrap">
          {visibleCards.length} Quick-Reference Cards · Offline Ready
        </span>
      </div>

      {/* Category Filter Row */}
      <LiquidTabs
        items={CATEGORIES.map((cat) => ({ id: cat, label: cat }))}
        value={selectedCat}
        onChange={(cat) => setSelectedCat(cat)}
        ariaLabel="Survival Categories"
        size="sm"
      />

      {/* Enlarged Show-to-Clerk Banner when selected */}
      {activeShowCard && (
        <div className="rounded-xl p-5 liquid-glass-elevated border border-[var(--accent)]/50 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-accent-token">
              Show Screen to Clerk / Pharmacist · {activeShowCard.title}
            </span>
            <button
              type="button"
              onClick={() => setExpandedCardId(null)}
              className="text-xs font-semibold text-secondary-token hover:text-primary-token"
            >
              Close Card
            </button>
          </div>
          <p className="font-display text-2xl sm:text-3xl font-bold text-primary-token leading-snug">
            {activeShowCard.japaneseShowCard}
          </p>
          <p className="text-xs font-mono text-accent-token">{activeShowCard.romaji}</p>
          <p className="text-xs text-secondary-token">{activeShowCard.englishPrompt}</p>
        </div>
      )}

      {/* Survival Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleCards.map((card) => (
          <div
            key={card.id}
            className="rounded-xl p-4 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 flex flex-col justify-between gap-3"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-mono text-muted-token">
                    {card.category} · {card.estimatedCost}
                  </p>
                  <h3 className="font-display text-base font-semibold text-primary-token">
                    {card.title}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label={`Play Japanese audio for ${card.title}`}
                  onClick={() => speakJapanese(card.japaneseShowCard)}
                  className="p-2 rounded-lg liquid-glass text-accent-token hover:border-accent-token shrink-0"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-lg p-3 bg-black/5 dark:bg-black/30 space-y-1">
                <p className="font-display text-base font-bold text-primary-token">
                  {card.japaneseShowCard}
                </p>
                <p className="text-[11px] font-mono text-accent-token">{card.romaji}</p>
                <p className="text-xs text-secondary-token">{card.englishPrompt}</p>
              </div>

              <p className="text-xs text-secondary-token leading-relaxed">
                {card.practicalTip}
              </p>
            </div>

            <div className="pt-2 border-t border-black/10 dark:border-amber-200/10 flex items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() =>
                  setExpandedCardId((curr) => (curr === card.id ? null : card.id))
                }
                className="font-semibold text-accent-token hover:underline"
              >
                {expandedCardId === card.id ? 'Hide Clerk Card' : 'Enlarge Show-to-Clerk Card →'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
