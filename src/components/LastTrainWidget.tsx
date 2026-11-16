import React, { useEffect, useMemo, useState } from 'react';
import { CarTaxiFront, Clock, Train } from 'lucide-react';
import type { CityGuide } from '../data/japanData';
import { convertFromJpy, formatCurrencyAmount, formatJpy } from '../utils/currency';
import {
  LAST_TRAIN_SCHEDULES,
  computeLastTrainCountdown,
} from '../utils/transitCalculator';

interface LastTrainWidgetProps {
  selectedCity: CityGuide;
  homeCurrency: string;
  rates: Record<string, number>;
}

type ClockPreviewMode = 'live' | '23:25' | '00:05';

function getTokyoJstParts(now: Date): { hour: number; minute: number; second: number } {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Tokyo',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    const getNum = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value ?? 0);
    const hour = getNum('hour') % 24;
    return {
      hour: Number.isFinite(hour) ? hour : 0,
      minute: getNum('minute') || 0,
      second: getNum('second') || 0,
    };
  } catch {
    return {
      hour: (now.getUTCHours() + 9) % 24,
      minute: now.getUTCMinutes(),
      second: now.getUTCSeconds(),
    };
  }
}

export const LastTrainWidget: React.FC<LastTrainWidgetProps> = ({
  selectedCity,
  homeCurrency,
  rates,
}) => {
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(
    () =>
      LAST_TRAIN_SCHEDULES.find((s) => s.cityId === selectedCity.id)?.id ||
      LAST_TRAIN_SCHEDULES[0].id
  );
  const [clockMode, setClockMode] = useState<ClockPreviewMode>('live');
  const [nowDate, setNowDate] = useState<Date>(() => new Date());

  // Sync neighborhood default whenever city changes
  useEffect(() => {
    const match = LAST_TRAIN_SCHEDULES.find((s) => s.cityId === selectedCity.id);
    if (match) {
      setSelectedScheduleId(match.id);
    }
  }, [selectedCity.id]);

  // Live 1s JST clock tick
  useEffect(() => {
    if (clockMode !== 'live') return;
    const id = window.setInterval(() => setNowDate(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [clockMode]);

  const activeSchedule = useMemo(
    () =>
      LAST_TRAIN_SCHEDULES.find((s) => s.id === selectedScheduleId) ||
      LAST_TRAIN_SCHEDULES[0],
    [selectedScheduleId]
  );

  const timeParts = useMemo(() => {
    if (clockMode === '23:25') return { hour: 23, minute: 25, second: 18 };
    if (clockMode === '00:05') return { hour: 0, minute: 5, second: 0 };
    return getTokyoJstParts(nowDate);
  }, [clockMode, nowDate]);

  const countdown = useMemo(
    () =>
      computeLastTrainCountdown(
        activeSchedule,
        timeParts.hour,
        timeParts.minute,
        timeParts.second
      ),
    [activeSchedule, timeParts.hour, timeParts.minute, timeParts.second]
  );

  return (
    <section
      aria-label="Last-Train Countdown Alert"
      className="liquid-glass rounded-2xl p-6 flex flex-col justify-between gap-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Clock className="w-5 h-5 text-accent-token shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display text-xl font-semibold text-primary-token">
              Last-Train Countdown Alert
            </h2>
            <p className="text-xs text-muted-token">
              Final local departure tracker (JST) &amp; midnight taxi fallback
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1" role="group" aria-label="Time Preview Mode">
          {(
            [
              { id: 'live', label: 'Live JST' },
              { id: '23:25', label: '23:25 Test' },
              { id: '00:05', label: '00:05 Test' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setClockMode(m.id)}
              aria-pressed={clockMode === m.id}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-colors whitespace-nowrap shrink-0 ${
                clockMode === m.id
                  ? 'bg-accent-token'
                  : 'liquid-glass text-secondary-token hover:text-primary-token'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Neighborhood Picker */}
      <div>
        <label htmlFor="last-train-neighborhood" className="block text-xs text-muted-token mb-1">
          Neighborhood Departure Station
        </label>
        <select
          id="last-train-neighborhood"
          value={activeSchedule.id}
          onChange={(e) => setSelectedScheduleId(e.target.value)}
          className="w-full rounded-xl px-3 py-2 text-xs font-medium bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
        >
          {LAST_TRAIN_SCHEDULES.map((sched) => (
            <option key={sched.id} value={sched.id}>
              {sched.cityId} · {sched.neighborhood} ({sched.stationName})
            </option>
          ))}
        </select>
      </div>

      {/* Countdown Readout */}
      <div className="rounded-xl p-4 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-token font-mono tabular-nums">
          <span>Tokyo Clock: {countdown.currentJstLabel}</span>
          <span>
            Final Train: <strong className="text-primary-token">{countdown.departureLabel}</strong>
          </span>
        </div>

        <p
          className={`font-mono text-2xl font-bold tabular-nums ${
            countdown.urgency === 'missed'
              ? 'text-rose-400'
              : countdown.urgency === 'hurry'
                ? 'text-amber-400'
                : 'text-emerald-400'
          }`}
        >
          {countdown.countdownFormatted}
        </p>

        <div className="flex items-center gap-2 text-xs text-secondary-token">
          <Train className="w-3.5 h-3.5 text-accent-token shrink-0" />
          <span>
            {activeSchedule.stationName} · {activeSchedule.lineName}
          </span>
        </div>
      </div>

      {/* Taxi Fallback Estimate */}
      <div className="rounded-xl p-4 bg-black/5 dark:bg-black/30 border border-black/10 dark:border-amber-200/15 flex items-center justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <CarTaxiFront className="w-4 h-4 text-accent-token shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-primary-token">
              Midnight Taxi Fallback (~{activeSchedule.taxiKmEstimate} km)
            </p>
            <p className="text-[11px] text-muted-token">
              Includes +20% Japan late-night surcharge (22:00–05:00)
            </p>
          </div>
        </div>
        <div className="text-right font-mono shrink-0">
          <p className="text-base font-bold text-accent-token tabular-nums">
            {formatJpy(countdown.lateNightTaxiJpy)}
          </p>
          <p className="text-[11px] text-muted-token tabular-nums">
            {formatCurrencyAmount(
              convertFromJpy(countdown.lateNightTaxiJpy, homeCurrency, rates),
              homeCurrency
            )}
          </p>
        </div>
      </div>
    </section>
  );
};
