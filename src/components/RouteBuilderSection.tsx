import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Footprints,
  GripVertical,
  Plus,
  Train,
  Trash2,
} from 'lucide-react';
import type { ItineraryPlan } from '../data/japanData';
import { convertFromJpy, formatCurrencyAmount, formatJpy } from '../utils/currency';
import { reorderStops, summarizeDayTransit } from '../utils/transitCalculator';

interface RouteBuilderSectionProps {
  itinerary: ItineraryPlan;
  onUpdateItinerary: (plan: ItineraryPlan) => void;
  homeCurrency: string;
  rates: Record<string, number>;
}

const PRESET_SPOTS = [
  { name: 'Shibuya Crossing & Hachiko', area: 'Shibuya', estimatedJpy: 0, time: '10:00' },
  { name: 'Yanaka Ginza Old Town', area: 'Taito', estimatedJpy: 1500, time: '16:30' },
  { name: 'Senso-ji Temple & Nakamise', area: 'Asakusa', estimatedJpy: 600, time: '09:00' },
  { name: 'Fushimi Inari Taisha', area: 'Kyoto South', estimatedJpy: 0, time: '07:30' },
  { name: 'Gion & Kiyomizu Lane', area: 'Higashiyama', estimatedJpy: 500, time: '15:00' },
  { name: 'Dotonbori & Hozenji Alley', area: 'Namba', estimatedJpy: 2400, time: '19:00' },
];

export const RouteBuilderSection: React.FC<RouteBuilderSectionProps> = ({
  itinerary,
  onUpdateItinerary,
  homeCurrency,
  rates,
}) => {
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [customSpotName, setCustomSpotName] = useState('');
  const [customSpotArea, setCustomSpotArea] = useState('');
  const [customSpotTime, setCustomSpotTime] = useState('14:00');
  const [customSpotCost, setCustomSpotCost] = useState('1200');

  const safeDayIdx = Math.min(selectedDayIdx, Math.max(0, itinerary.days.length - 1));
  const activeDay = itinerary.days[safeDayIdx];

  const transitSummary = useMemo(
    () => (activeDay ? summarizeDayTransit(activeDay.stops) : null),
    [activeDay]
  );

  if (!activeDay || !transitSummary) {
    return null;
  }

  const updateDayStops = (nextStops: typeof activeDay.stops) => {
    const nextDays = itinerary.days.map((d, idx) =>
      idx === safeDayIdx ? { ...d, stops: nextStops } : d
    );
    onUpdateItinerary({ ...itinerary, days: nextDays });
  };

  const handleMoveStop = (fromIndex: number, toIndex: number) => {
    const nextStops = reorderStops(activeDay.stops, fromIndex, toIndex);
    updateDayStops(nextStops);
  };

  const handleRemoveStop = (idxToRemove: number) => {
    if (activeDay.stops.length <= 1) return;
    updateDayStops(activeDay.stops.filter((_, i) => i !== idxToRemove));
  };

  const handleAddSpot = (spot: {
    name: string;
    area: string;
    estimatedJpy: number;
    time: string;
  }) => {
    const nextStops = [
      ...activeDay.stops,
      {
        time: spot.time,
        name: spot.name,
        area: spot.area,
        transitNote: `Auto-calculated via ${activeDay.region} IC transfer`,
        estimatedJpy: spot.estimatedJpy,
        description: `Added to Day ${activeDay.dayNumber} custom transit sequence.`,
      },
    ];
    updateDayStops(nextStops);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSpotName.trim()) return;
    handleAddSpot({
      name: customSpotName.trim(),
      area: customSpotArea.trim() || activeDay.region,
      time: customSpotTime.trim() || '15:00',
      estimatedJpy: Math.max(0, Math.round(Number(customSpotCost) || 0)),
    });
    setCustomSpotName('');
    setCustomSpotArea('');
  };

  return (
    <section
      aria-label="Smart Day-by-Day Route Builder"
      className="liquid-glass-elevated rounded-2xl p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-primary-token">
            Smart Day-by-Day Route Builder
          </h2>
          <p className="text-xs text-muted-token mt-0.5">
            Drag and drop spots (or use arrow buttons) to recalculate station transfers, walking minutes, and Suica/PASMO fares.
          </p>
        </div>

        {/* Day Selector */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Select Itinerary Day">
          {itinerary.days.map((day, idx) => (
            <button
              key={day.dayNumber}
              type="button"
              onClick={() => setSelectedDayIdx(idx)}
              aria-pressed={idx === safeDayIdx}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                idx === safeDayIdx
                  ? 'bg-accent-token'
                  : 'liquid-glass text-secondary-token hover:text-primary-token'
              }`}
            >
              Day {day.dayNumber} · {day.region}
            </button>
          ))}
        </div>
      </div>

      {/* Live Day Transit Totals Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl p-4 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15">
        <div>
          <p className="text-xs text-muted-token">Estimated Transit Time</p>
          <p className="font-mono text-lg font-bold text-primary-token tabular-nums mt-0.5">
            {transitSummary.totalTransitMinutes} min
          </p>
          <p className="text-[11px] text-secondary-token tabular-nums">
            {transitSummary.totalRailMinutes}m rail · {transitSummary.totalWalkMinutes}m walking
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-token">Est. Suica / PASMO IC Fares</p>
          <p className="font-mono text-lg font-bold text-accent-token tabular-nums mt-0.5">
            {formatJpy(transitSummary.totalIcFareJpy)}
          </p>
          <p className="text-[11px] font-mono text-secondary-token tabular-nums">
            ≈{' '}
            {formatCurrencyAmount(
              convertFromJpy(transitSummary.totalIcFareJpy, homeCurrency, rates),
              homeCurrency
            )}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-token">Active Sequence</p>
          <p className="font-mono text-lg font-bold text-primary-token tabular-nums mt-0.5">
            {activeDay.stops.length} spots · {transitSummary.legs.length} legs
          </p>
          <p className="text-[11px] text-secondary-token truncate">{activeDay.theme}</p>
        </div>
      </div>

      {/* Draggable Stops + Calculated Transit Legs */}
      <div className="space-y-2.5">
        {activeDay.stops.map((stop, idx) => {
          const legAfter = transitSummary.legs[idx];
          const isBeingDraggedOver = dragOverIndex === idx && dragIndex !== idx;
          return (
            <React.Fragment key={`${stop.name}-${idx}`}>
              <div
                draggable
                onDragStart={() => setDragIndex(idx)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverIndex !== idx) setDragOverIndex(idx);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null && dragIndex !== idx) {
                    handleMoveStop(dragIndex, idx);
                  }
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
                className={`rounded-xl p-3.5 border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-grab active:cursor-grabbing ${
                  isBeingDraggedOver
                    ? 'bg-accent-soft-token border-[var(--accent)]'
                    : 'bg-black/5 dark:bg-black/30 border-black/10 dark:border-amber-200/15'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <GripVertical
                    className="w-4 h-4 text-muted-token shrink-0 mt-1"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-token font-mono">
                      <span className="text-accent-token font-semibold">Stop {idx + 1}</span>
                      <span>·</span>
                      <span>{stop.time}</span>
                      <span>·</span>
                      <span>{stop.area}</span>
                    </div>
                    <p className="font-semibold text-sm text-primary-token truncate">
                      {stop.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                  <span className="text-xs font-mono text-secondary-token tabular-nums mr-2">
                    {stop.estimatedJpy === 0 ? 'Free' : formatJpy(stop.estimatedJpy)}
                  </span>
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveStop(idx, idx - 1)}
                    aria-label={`Move ${stop.name} earlier`}
                    className="p-1.5 rounded-lg liquid-glass text-secondary-token hover:text-primary-token disabled:opacity-35"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === activeDay.stops.length - 1}
                    onClick={() => handleMoveStop(idx, idx + 1)}
                    aria-label={`Move ${stop.name} later`}
                    className="p-1.5 rounded-lg liquid-glass text-secondary-token hover:text-primary-token disabled:opacity-35"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={activeDay.stops.length <= 1}
                    onClick={() => handleRemoveStop(idx)}
                    aria-label={`Remove ${stop.name}`}
                    className="p-1.5 rounded-lg liquid-glass text-muted-token hover:text-rose-400 disabled:opacity-35"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {legAfter && (
                <div className="ml-4 pl-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs border-l border-dashed border-black/20 dark:border-amber-200/30 text-secondary-token">
                  <div className="flex flex-wrap items-center gap-2">
                    <Train className="w-3.5 h-3.5 text-accent-token shrink-0" />
                    <span className="font-medium text-primary-token">
                      {legAfter.fromStation} → {legAfter.toStation}
                    </span>
                    <span className="text-muted-token">· {legAfter.lineName}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono tabular-nums">
                    {legAfter.railMinutes > 0 && (
                      <span>{legAfter.railMinutes}m rail</span>
                    )}
                    <span className="inline-flex items-center gap-1 text-muted-token">
                      <Footprints className="w-3 h-3" />
                      {legAfter.walkMinutes}m walk
                    </span>
                    <span className="font-semibold text-accent-token">
                      {legAfter.icFareJpy === 0 ? '¥0 IC' : `IC ${formatJpy(legAfter.icFareJpy)}`}
                    </span>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Quick Preset Spot Adder + Custom Spot Form */}
      <div className="pt-4 border-t border-black/10 dark:border-amber-200/15 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-token mr-1">Quick Add Spot:</span>
          {PRESET_SPOTS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleAddSpot(preset)}
              className="px-2.5 py-1 rounded-lg text-xs liquid-glass text-secondary-token hover:text-primary-token transition-colors whitespace-nowrap shrink-0"
            >
              + {preset.name.split('&')[0].trim()}
            </button>
          ))}
        </div>

        <form onSubmit={handleCustomSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-5">
            <label htmlFor="route-custom-name" className="sr-only">
              Spot name
            </label>
            <input
              id="route-custom-name"
              type="text"
              value={customSpotName}
              onChange={(e) => setCustomSpotName(e.target.value)}
              placeholder="Add custom spot (e.g., Shibuya Crossing)"
              className="w-full rounded-xl px-3 py-2 text-xs bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
            />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="route-custom-area" className="sr-only">
              Station or district
            </label>
            <input
              id="route-custom-area"
              type="text"
              value={customSpotArea}
              onChange={(e) => setCustomSpotArea(e.target.value)}
              placeholder="District / Sta."
              className="w-full rounded-xl px-3 py-2 text-xs bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="route-custom-time" className="sr-only">
              Visit time
            </label>
            <input
              id="route-custom-time"
              type="text"
              value={customSpotTime}
              onChange={(e) => setCustomSpotTime(e.target.value)}
              placeholder="14:00"
              className="w-full rounded-xl px-3 py-2 text-xs font-mono bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-accent-token whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Spot
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
