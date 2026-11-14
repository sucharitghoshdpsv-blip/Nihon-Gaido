import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Loader2,
  MapPin,
  Navigation,
  Sparkles,
  Train,
  Trash2,
} from 'lucide-react';
import {
  CITY_GUIDES,
  type CityGuide,
  type DistrictLandmark,
  type ItineraryPlan,
} from '../data/japanData';
import { convertFromJpy, formatCurrencyAmount, formatJpy } from '../utils/currency';

interface ItineraryMapsViewProps {
  itinerary: ItineraryPlan;
  onUpdateItinerary: (plan: ItineraryPlan) => void;
  offlineCityIds: string[];
  onToggleOfflineCity: (city: CityGuide) => void;
  selectedCity: CityGuide;
  onSelectCity: (city: CityGuide) => void;
  homeCurrency: string;
  rates: Record<string, number>;
}

const INTEREST_OPTIONS = [
  'Culinary & Markets',
  'Temples & Heritage',
  'Modern Architecture',
  'Onsen & Nature',
  'Artisan Crafts',
];

export const ItineraryMapsView: React.FC<ItineraryMapsViewProps> = ({
  itinerary,
  onUpdateItinerary,
  offlineCityIds,
  onToggleOfflineCity,
  selectedCity,
  onSelectCity,
  homeCurrency,
  rates,
}) => {
  const [daysCount, setDaysCount] = useState(3);
  const [pace, setPace] = useState<'relaxed' | 'balanced' | 'packed'>('balanced');
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['Tokyo', 'Kyoto']);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'Culinary & Markets',
    'Temples & Heritage',
  ]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genNotice, setGenNotice] = useState<string | null>(null);
  const [activeLandmark, setActiveLandmark] = useState<DistrictLandmark>(
    selectedCity.landmarks[0]
  );

  const toggleItem = (list: string[], value: string, setter: (v: string[]) => void) => {
    if (list.includes(value)) {
      if (list.length > 1) setter(list.filter((i) => i !== value));
    } else {
      setter([...list, value]);
    }
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenError(null);
    setGenNotice(null);
    setGenerating(true);

    try {
      const res = await fetch('/api/gemini/itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days: daysCount,
          pace,
          regions: selectedRegions,
          interests: selectedInterests,
          dailyBudgetJpy: 18000,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not generate itinerary.');
      onUpdateItinerary({
        tripTitle: data.tripTitle,
        summary: data.summary,
        days: data.days,
      });
      if (data.fallbackNotice) setGenNotice(data.fallbackNotice);
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Itinerary planner error.');
    } finally {
      setGenerating(false);
    }
  };

  const isSelectedCityOffline = offlineCityIds.includes(selectedCity.id);

  return (
    <div className="space-y-8">
      {/* Interactive Japan Map + Offline Region Pack */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6 liquid-glass rounded-2xl p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-primary-token">
                Japan Rail & Region Map
              </h2>
              <p className="text-xs text-muted-token">
                Tap any city hub to inspect its district map and cache offline guide data.
              </p>
            </div>
            <span className="text-xs font-mono text-accent-token whitespace-nowrap">
              {offlineCityIds.length} / {CITY_GUIDES.length} Offline
            </span>
          </div>

          {/* Stylized Vector Map of Japan Archipelago */}
          <div className="relative rounded-2xl bg-black/5 dark:bg-black/45 border border-black/10 dark:border-amber-200/15 p-4 overflow-hidden">
            <svg
              viewBox="0 0 420 360"
              className="w-full h-[290px]"
              role="img"
              aria-label="Interactive map of Japan cities"
            >
              {/* Stylized archipelago landmass silhouettes */}
              <path
                d="M300 45 L355 55 L368 95 L322 118 L292 98 Z"
                className="fill-slate-300/60 dark:fill-amber-200/10 stroke-slate-400/50 dark:stroke-amber-300/30"
                strokeWidth="1.5"
              />
              <path
                d="M286 132 L305 175 L296 245 L268 265 L235 262 L212 285 L165 292 L135 280 L165 256 L210 220 L236 185 L266 138 Z"
                className="fill-slate-300/60 dark:fill-amber-200/10 stroke-slate-400/50 dark:stroke-amber-300/30"
                strokeWidth="1.5"
              />
              <path
                d="M148 296 L186 294 L182 316 L152 316 Z"
                className="fill-slate-300/60 dark:fill-amber-200/10 stroke-slate-400/50 dark:stroke-amber-300/30"
                strokeWidth="1.5"
              />
              <path
                d="M112 290 L138 295 L134 340 L108 336 Z"
                className="fill-slate-300/60 dark:fill-amber-200/10 stroke-slate-400/50 dark:stroke-amber-300/30"
                strokeWidth="1.5"
              />

              {/* Shinkansen rail spine */}
              <polyline
                points="312,84 268,238 218,210 208,262 196,274 215,280"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="text-accent-token opacity-65"
              />

              {CITY_GUIDES.map((city) => {
                const active = city.id === selectedCity.id;
                const savedOffline = offlineCityIds.includes(city.id);
                const labelOffsets: Record<string, { dx: number; dy: number; anchor: 'start' | 'end' }> = {
                  Tokyo: { dx: 13, dy: 4, anchor: 'start' },
                  Kyoto: { dx: -12, dy: -8, anchor: 'end' },
                  Osaka: { dx: -13, dy: 12, anchor: 'end' },
                  Nara: { dx: 13, dy: 12, anchor: 'start' },
                  Kanazawa: { dx: 13, dy: 4, anchor: 'start' },
                  Sapporo: { dx: 13, dy: 4, anchor: 'start' },
                };
                const offset = labelOffsets[city.id] || { dx: 12, dy: 4, anchor: 'start' as const };
                return (
                  <g
                    key={city.id}
                    className="cursor-pointer"
                    onClick={() => {
                      onSelectCity(city);
                      setActiveLandmark(city.landmarks[0]);
                    }}
                  >
                    <circle
                      cx={city.mapCoords.x}
                      cy={city.mapCoords.y}
                      r={active ? 10 : 6.5}
                      className={
                        active
                          ? 'fill-[var(--accent)] stroke-white dark:stroke-black'
                          : savedOffline
                            ? 'fill-emerald-500 stroke-white dark:stroke-black'
                            : 'fill-slate-600 dark:fill-amber-100/70 stroke-white dark:stroke-black'
                      }
                      strokeWidth="2"
                    />
                    <text
                      x={city.mapCoords.x + offset.dx}
                      y={city.mapCoords.y + offset.dy}
                      textAnchor={offset.anchor}
                      className="text-[11px] font-semibold fill-current text-primary-token"
                    >
                      {city.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-token">
            <span>Selected: {selectedCity.id} ({selectedCity.district})</span>
            <button
              type="button"
              onClick={() => onToggleOfflineCity(selectedCity)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isSelectedCityOffline
                  ? 'liquid-glass text-emerald-400 border-emerald-500/40'
                  : 'bg-accent-token'
              }`}
            >
              {isSelectedCityOffline ? (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Saved Offline ({selectedCity.offlineSizeMb} MB) · Remove
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Save {selectedCity.id} Offline ({selectedCity.offlineSizeMb} MB)
                </>
              )}
            </button>
          </div>
        </div>

        {/* District Landmark Explorer */}
        <div className="lg:col-span-6 liquid-glass rounded-2xl p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-primary-token">
                {selectedCity.id} District Explorer
              </h2>
              <p className="text-xs text-muted-token">
                {selectedCity.district} · {isSelectedCityOffline ? 'Available Offline' : 'Online Mode'}
              </p>
            </div>
            <Navigation className="w-5 h-5 text-accent-token" />
          </div>

          {/* Interactive District Pin Canvas */}
          <div className="relative h-[220px] rounded-2xl bg-black/5 dark:bg-black/45 border border-black/10 dark:border-amber-200/15 overflow-hidden">
            {/* Architectural grid lines */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(246,201,69,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(246,201,69,0.25) 1px, transparent 1px)',
                backgroundSize: '36px 36px',
              }}
            />
            {selectedCity.landmarks.map((lm) => {
              const isSelected = activeLandmark.id === lm.id;
              return (
                <button
                  key={lm.id}
                  type="button"
                  onClick={() => setActiveLandmark(lm)}
                  style={{ left: `${lm.xPct}%`, top: `${lm.yPct}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-transform ${
                    isSelected
                      ? 'bg-accent-token scale-105 shadow-lg z-10'
                      : 'liquid-glass-elevated text-primary-token hover:scale-105'
                  }`}
                >
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="whitespace-nowrap">{lm.name}</span>
                </button>
              );
            })}
          </div>

          {/* Selected Landmark Detail */}
          <div className="rounded-xl p-4 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display font-semibold text-primary-token">
                  {activeLandmark.name} · {activeLandmark.japanese}
                </p>
                <p className="text-xs text-muted-token capitalize">{activeLandmark.kind}</p>
              </div>
              <div className="text-right font-mono">
                <p className="text-sm font-semibold text-accent-token tabular-nums">
                  {activeLandmark.estimatedJpy === 0
                    ? 'Free Entry'
                    : formatJpy(activeLandmark.estimatedJpy)}
                </p>
                {activeLandmark.estimatedJpy > 0 && (
                  <p className="text-[11px] text-muted-token tabular-nums">
                    ≈ {formatCurrencyAmount(convertFromJpy(activeLandmark.estimatedJpy, homeCurrency, rates), homeCurrency)}
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-secondary-token leading-relaxed">{activeLandmark.note}</p>
          </div>
        </div>
      </section>

      {/* AI Personalized Itinerary Builder & Output */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleGeneratePlan}
          className="lg:col-span-4 liquid-glass rounded-2xl p-6 space-y-5"
        >
          <div>
            <h2 className="font-display text-xl font-semibold text-primary-token">
              AI Itinerary Planner
            </h2>
            <p className="text-xs text-muted-token mt-0.5">
              Powered by High Thinking (gemini-4-carbon)
            </p>
          </div>

          <div>
            <label htmlFor="trip-days" className="block text-xs font-medium text-secondary-token mb-1.5">
              Trip Duration: <span className="font-mono text-accent-token">{daysCount} days</span>
            </label>
            <input
              id="trip-days"
              type="range"
              min={1}
              max={7}
              value={daysCount}
              onChange={(e) => setDaysCount(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-secondary-token mb-2">Pace</span>
            <div className="grid grid-cols-3 gap-2">
              {(['relaxed', 'balanced', 'packed'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPace(p)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium capitalize ${
                    pace === p ? 'bg-accent-token' : 'liquid-glass text-secondary-token'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-secondary-token mb-2">
              Regions to Include
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CITY_GUIDES.map((c) => {
                const active = selectedRegions.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleItem(selectedRegions, c.id, setSelectedRegions)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                      active ? 'bg-accent-token' : 'liquid-glass text-secondary-token'
                    }`}
                  >
                    {c.id}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-secondary-token mb-2">Interests</span>
            <div className="flex flex-wrap gap-1.5">
              {INTEREST_OPTIONS.map((interest) => {
                const active = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleItem(selectedInterests, interest, setSelectedInterests)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                      active ? 'bg-accent-token' : 'liquid-glass text-secondary-token'
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

          {genError && <p className="text-xs text-rose-400">{genError}</p>}
          {genNotice && <p className="text-xs text-muted-token">{genNotice}</p>}

          <button
            type="submit"
            disabled={generating}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-accent-token disabled:opacity-60"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Planning Route…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Custom Itinerary
              </>
            )}
          </button>
        </form>

        {/* Rendered Itinerary */}
        <div className="lg:col-span-8 space-y-4">
          <div className="liquid-glass-elevated rounded-2xl p-6">
            <h2 className="font-display text-2xl font-bold text-primary-token">
              {itinerary.tripTitle}
            </h2>
            <p className="text-sm text-secondary-token mt-1 leading-relaxed">
              {itinerary.summary}
            </p>
          </div>

          {itinerary.days.map((day) => {
            const dayTotalJpy = day.stops.reduce((acc, s) => acc + (s.estimatedJpy || 0), 0);
            const dayNative = convertFromJpy(dayTotalJpy, homeCurrency, rates);
            return (
              <div key={day.dayNumber} className="liquid-glass rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-black/10 dark:border-amber-200/15">
                  <div>
                    <p className="text-xs text-muted-token">
                      Day {day.dayNumber} · {day.region}
                    </p>
                    <h3 className="font-display text-lg font-semibold text-primary-token">
                      {day.theme}
                    </h3>
                  </div>
                  <div className="text-right font-mono">
                    <p className="text-sm font-semibold text-accent-token tabular-nums">
                      Est. {formatJpy(dayTotalJpy)}
                    </p>
                    <p className="text-xs text-muted-token tabular-nums">
                      ≈ {formatCurrencyAmount(dayNative, homeCurrency)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {day.stops.map((stop, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 py-2 border-b last:border-b-0 border-black/5 dark:border-amber-200/10"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-token">
                          <span className="font-mono text-accent-token">{stop.time}</span>
                          <span>·</span>
                          <span>{stop.area}</span>
                        </div>
                        <p className="font-semibold text-primary-token">{stop.name}</p>
                        <p className="text-xs text-secondary-token">{stop.description}</p>
                        <p className="text-xs text-muted-token flex items-center gap-1.5">
                          <Train className="w-3.5 h-3.5 text-accent-token shrink-0" />
                          <span>{stop.transitNote}</span>
                        </p>
                      </div>
                      <div className="sm:text-right font-mono shrink-0">
                        <p className="text-sm font-semibold text-primary-token tabular-nums">
                          {formatJpy(stop.estimatedJpy)}
                        </p>
                        <p className="text-xs text-muted-token tabular-nums">
                          {formatCurrencyAmount(
                            convertFromJpy(stop.estimatedJpy, homeCurrency, rates),
                            homeCurrency
                          )}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-2 text-xs text-secondary-token pt-2">
                  <CheckCircle2 className="w-4 h-4 text-accent-token shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-primary-token">Etiquette Note: </strong>
                    {day.etiquetteTip}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
