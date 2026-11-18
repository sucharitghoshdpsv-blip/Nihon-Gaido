import React, { useMemo, useState } from 'react';
import { Backpack, CheckSquare, CloudRain, Plus, Square, Trash2 } from 'lucide-react';
import type { ItineraryPlan } from '../data/japanData';
import type { CityWeatherSummary } from '../utils/weather';
import {
  buildDynamicPackingItems,
  hasTempleOrTatamiStops,
  type PackingChecklistItem,
} from '../utils/packingChecklist';
import { LiquidTabs } from './ui/liquid-glass-navbar';

interface PackingChecklistPanelProps {
  cityName: string;
  weather: CityWeatherSummary | null;
  itinerary: ItineraryPlan;
  checkedIds: string[];
  customItems: Array<{ id: string; label: string }>;
  onToggleItem: (itemId: string) => void;
  onAddCustomItem: (label: string) => void;
  onRemoveCustomItem: (id: string) => void;
}

export const PackingChecklistPanel: React.FC<PackingChecklistPanelProps> = ({
  cityName,
  weather,
  itinerary,
  checkedIds,
  customItems,
  onToggleItem,
  onAddCustomItem,
  onRemoveCustomItem,
}) => {
  const [filterCat, setFilterCat] = useState<'All' | PackingChecklistItem['category']>('All');
  const [newItemLabel, setNewItemLabel] = useState('');

  const items = useMemo(
    () =>
      buildDynamicPackingItems({
        cityName,
        weather,
        itinerary,
        checkedIds,
        customItems,
      }),
    [cityName, weather, itinerary, checkedIds, customItems]
  );

  const visibleItems =
    filterCat === 'All' ? items : items.filter((item) => item.category === filterCat);

  const checkedCount = items.filter((i) => i.checked).length;
  const maxPrecip = weather?.days?.length
    ? Math.max(...weather.days.map((d) => d.precipPercent))
    : null;
  const minTemp = weather?.days?.length
    ? Math.min(...weather.days.map((d) => d.tempMinC))
    : null;
  const templeDetected = hasTempleOrTatamiStops(itinerary);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemLabel.trim()) return;
    onAddCustomItem(newItemLabel.trim());
    setNewItemLabel('');
  };

  return (
    <section
      aria-label="Dynamic Pre-Departure Packing Checklist"
      className="liquid-glass rounded-2xl p-6 flex flex-col justify-between gap-4"
    >
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Backpack className="w-5 h-5 text-accent-token shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-xl font-semibold text-primary-token">
                Smart Packing &amp; Pre-Departure Checklist
              </h2>
              <p className="text-xs text-muted-token">
                Auto-adjusted from {cityName} 3-Day Weather Outlook &amp; planned stops
              </p>
            </div>
          </div>

          <span className="font-mono text-xs font-semibold text-accent-token tabular-nums whitespace-nowrap shrink-0">
            {checkedCount} / {items.length} Packed
          </span>
        </div>

        {/* Context Detection Summary Bar */}
        <div className="rounded-xl px-3.5 py-2.5 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 flex flex-wrap items-center gap-3 text-xs text-secondary-token">
          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
            <CloudRain className="w-3.5 h-3.5 text-accent-token" />
            {maxPrecip !== null
              ? `${cityName} Outlook: Max ${maxPrecip}% precip · Low ${Math.round(minTemp ?? 12)}°C`
              : `${cityName} Outlook: Syncing live forecast`}
          </span>
          <span className="text-muted-token">·</span>
          <span>
            {templeDetected
              ? 'Temple/Tatami stops detected (slip-on shoes + goshuincho added)'
              : 'Urban walking stops active'}
          </span>
        </div>
      </div>

      {/* Category Filter */}
      <LiquidTabs
        items={[
          { id: 'All', label: 'All' },
          { id: 'Weather Auto', label: 'Weather Auto' },
          { id: 'Itinerary Auto', label: 'Itinerary Auto' },
          { id: 'Core Japan', label: 'Core Japan' },
        ]}
        value={filterCat}
        onChange={(cat) => setFilterCat(cat)}
        ariaLabel="Packing Categories"
        size="xs"
      />

      {/* Checklist Rows */}
      <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
        {visibleItems.map((item) => {
          const isCustom = customItems.some((c) => c.id === item.id);
          return (
            <div
              key={item.id}
              className="rounded-xl p-3 bg-black/5 dark:bg-black/30 border border-black/10 dark:border-amber-200/15 flex items-start justify-between gap-3"
            >
              <button
                type="button"
                onClick={() => onToggleItem(item.id)}
                className="flex items-start gap-2.5 text-left min-w-0 flex-1"
              >
                {item.checked ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-accent-token shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      item.checked ? 'line-through text-muted-token' : 'text-primary-token'
                    }`}
                  >
                    {item.label}
                  </p>
                  <p className="text-[11px] text-muted-token leading-snug">
                    {item.category} · {item.reason}
                  </p>
                </div>
              </button>

              {isCustom && (
                <button
                  type="button"
                  aria-label={`Delete ${item.label}`}
                  onClick={() => onRemoveCustomItem(item.id)}
                  className="p-1.5 text-muted-token hover:text-rose-400 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Personal Packing Item */}
      <form onSubmit={handleAddSubmit} className="flex items-center gap-2 pt-2 border-t border-black/10 dark:border-amber-200/15">
        <label htmlFor="custom-packing-input" className="sr-only">
          Add personal packing item
        </label>
        <input
          id="custom-packing-input"
          type="text"
          value={newItemLabel}
          onChange={(e) => setNewItemLabel(e.target.value)}
          placeholder="Add item (e.g., Type-A Japan plug adapter)..."
          className="flex-1 rounded-xl px-3 py-2 text-xs bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-accent-token whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </form>
    </section>
  );
};
