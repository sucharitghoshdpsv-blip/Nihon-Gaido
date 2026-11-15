import React, { useCallback, useEffect, useState } from 'react';
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  RefreshCw,
  Snowflake,
  Sun,
  Wind,
} from 'lucide-react';
import type { CityGuide } from '../data/japanData';
import {
  buildWeatherTravelTip,
  formatTemperature,
  type CityWeatherSummary,
  type TemperatureUnit,
  type WeatherConditionKind,
} from '../utils/weather';

interface CityWeatherForecastProps {
  selectedCity: CityGuide;
}

interface WeatherApiResponse extends CityWeatherSummary {
  gmpQuotaExceeded?: boolean;
  error?: string;
}

const WeatherConditionIcon: React.FC<{
  kind: WeatherConditionKind;
  className?: string;
}> = ({ kind, className = 'w-5 h-5' }) => {
  switch (kind) {
    case 'sunny':
      return <Sun className={`${className} text-amber-400`} aria-hidden="true" />;
    case 'partly_cloudy':
      return <CloudSun className={`${className} text-accent-token`} aria-hidden="true" />;
    case 'rain':
      return <CloudRain className={`${className} text-sky-400`} aria-hidden="true" />;
    case 'snow':
      return <Snowflake className={`${className} text-cyan-300`} aria-hidden="true" />;
    case 'storm':
      return <CloudLightning className={`${className} text-amber-300`} aria-hidden="true" />;
    case 'fog':
      return <CloudFog className={`${className} text-slate-400`} aria-hidden="true" />;
    default:
      return <Cloud className={`${className} text-slate-400`} aria-hidden="true" />;
  }
};

export const CityWeatherForecast: React.FC<CityWeatherForecastProps> = ({ selectedCity }) => {
  const [unit, setUnit] = useState<TemperatureUnit>('C');
  const [weather, setWeather] = useState<CityWeatherSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadWeather = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          lat: String(selectedCity.geoCenter.lat),
          lng: String(selectedCity.geoCenter.lng),
          city: selectedCity.id,
        });
        const res = await fetch(`/api/weather/forecast?${params.toString()}`, { signal });
        const data = (await res.json()) as WeatherApiResponse;

        if (data?.gmpQuotaExceeded) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }

        if (!res.ok || !Array.isArray(data.days) || data.days.length === 0) {
          throw new Error(data?.error || `Could not load weather for ${selectedCity.id}.`);
        }

        setWeather(data);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(
          err instanceof Error
            ? err.message
            : `Unable to retrieve the 3-day outlook for ${selectedCity.id}.`
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [selectedCity.geoCenter.lat, selectedCity.geoCenter.lng, selectedCity.id]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadWeather(controller.signal);
    return () => controller.abort();
  }, [loadWeather]);

  const travelTip = weather ? buildWeatherTravelTip(weather.days, selectedCity.id) : null;

  return (
    <section
      aria-label="3-Day Weather Outlook"
      className="liquid-glass rounded-2xl p-6 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-xl font-semibold text-primary-token">
              {selectedCity.id} 3-Day Weather Outlook
            </h2>
            <span className="text-xs font-mono text-muted-token">
              {selectedCity.geoCenter.lat.toFixed(2)}°N, {selectedCity.geoCenter.lng.toFixed(2)}°E
            </span>
          </div>
          <p className="text-xs text-muted-token">
            {selectedCity.district} · Live 3-day conditions for packing &amp; route planning
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="inline-flex rounded-lg p-0.5 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15"
            role="group"
            aria-label="Temperature Unit"
          >
            {(['C', 'F'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                aria-pressed={unit === u}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-colors ${
                  unit === u
                    ? 'bg-accent-token'
                    : 'text-secondary-token hover:text-primary-token'
                }`}
              >
                °{u}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => loadWeather()}
            disabled={loading}
            aria-label={`Refresh weather for ${selectedCity.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium liquid-glass text-secondary-token hover:text-primary-token disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-accent-token ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {loading && (!weather || weather.cityId !== selectedCity.id) ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5" aria-busy="true">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="rounded-xl p-4 bg-black/5 dark:bg-black/30 border border-black/10 dark:border-amber-200/10 h-28 animate-pulse"
            />
          ))}
        </div>
      ) : error && !weather ? (
        <div className="rounded-xl p-4 bg-rose-500/10 border border-rose-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-rose-300">{error}</span>
          <button
            type="button"
            onClick={() => loadWeather()}
            className="px-3 py-1.5 rounded-lg font-semibold bg-accent-token"
          >
            Retry Forecast
          </button>
        </div>
      ) : weather ? (
        <>
          {/* Current Conditions Strip */}
          <div className="rounded-xl px-4 py-3 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl liquid-glass">
                <WeatherConditionIcon kind={weather.currentConditionKind} className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-baseline gap-2.5">
                  <span className="font-display text-2xl font-bold text-primary-token tabular-nums">
                    {weather.currentTempC !== null
                      ? formatTemperature(weather.currentTempC, unit)
                      : formatTemperature(weather.days[0].tempMaxC, unit)}
                  </span>
                  <span className="text-sm font-medium text-secondary-token">
                    {weather.currentConditionText || weather.days[0].conditionText}
                  </span>
                </div>
                {weather.feelsLikeC !== null && (
                  <p className="text-[11px] text-muted-token tabular-nums">
                    Feels like {formatTemperature(weather.feelsLikeC, unit)} in {selectedCity.id}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-secondary-token">
              {weather.currentHumidity !== null && (
                <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                  <Droplets className="w-3.5 h-3.5 text-accent-token" />
                  {weather.currentHumidity}% humidity
                </span>
              )}
              {weather.currentWindKmh !== null && (
                <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                  <Wind className="w-3.5 h-3.5 text-accent-token" />
                  {weather.currentWindKmh} km/h wind
                </span>
              )}
            </div>
          </div>

          {/* 3-Day Forecast Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {weather.days.slice(0, 3).map((day, idx) => (
              <div
                key={day.dateIso}
                className={`rounded-xl p-4 border transition-colors flex flex-col justify-between gap-3 ${
                  idx === 0
                    ? 'liquid-glass-elevated border-[var(--accent)]/40'
                    : 'bg-black/5 dark:bg-black/30 border-black/10 dark:border-amber-200/15'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-sm font-semibold text-primary-token">
                      {day.dayLabel}
                    </p>
                    <p className="text-[11px] font-mono text-muted-token">{day.dateIso}</p>
                  </div>
                  <WeatherConditionIcon kind={day.conditionKind} className="w-6 h-6 shrink-0" />
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium text-secondary-token">
                    {day.conditionText}
                  </span>
                  <div className="font-mono text-sm tabular-nums whitespace-nowrap">
                    <span className="font-bold text-primary-token">
                      {formatTemperature(day.tempMaxC, unit)}
                    </span>
                    <span className="text-muted-token mx-1">/</span>
                    <span className="text-secondary-token">
                      {formatTemperature(day.tempMinC, unit)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-black/10 dark:border-amber-200/10 flex items-center justify-between text-[11px] text-muted-token font-mono tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-accent-token" />
                    {day.precipPercent}% precip
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Wind className="w-3 h-3 text-accent-token" />
                    {day.windKmh} km/h
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Travel Packing & Source Note */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-secondary-token pt-1">
            {travelTip && <p>{travelTip}</p>}
            <span className="text-[11px] text-muted-token whitespace-nowrap">
              {weather.source === 'google-weather'
                ? 'Source: Google Maps Weather API'
                : 'Source: Live Japan Forecast'}
            </span>
          </div>
        </>
      ) : null}
    </section>
  );
};
