import React, { useState } from 'react';
import { BookMarked, Plus, Stamp, Trash2 } from 'lucide-react';
import { CITY_GUIDES } from '../data/japanData';

export interface StampEntryRecord {
  id: string;
  stampKind: 'goshuin' | 'eki';
  placeName: string;
  city: string;
  stampedDate: string;
  notes: string;
  createdAtLabel: string;
}

interface GoshuinPassportPanelProps {
  stamps: StampEntryRecord[];
  onAddStamp: (stamp: Omit<StampEntryRecord, 'id' | 'createdAtLabel'>) => Promise<void> | void;
  onDeleteStamp: (id: string) => Promise<void> | void;
}

const STAMP_PRESETS: Array<{
  stampKind: 'goshuin' | 'eki';
  placeName: string;
  city: string;
  notes: string;
}> = [
  {
    stampKind: 'goshuin',
    placeName: 'Sensō-ji Main Hall Goshuin',
    city: 'Tokyo',
    notes: 'Calligraphy seal received near Yogodo Hall (¥500 offering).',
  },
  {
    stampKind: 'goshuin',
    placeName: 'Fushimi Inari Taisha Goshuin',
    city: 'Kyoto',
    notes: 'Vermilion fox seal stamped after early morning torii hike.',
  },
  {
    stampKind: 'eki',
    placeName: 'Tokyo Station Marunouchi Eki Stamp',
    city: 'Tokyo',
    notes: 'Brick facade rubber ink stamp beside Marunouchi South Exit.',
  },
];

export const GoshuinPassportPanel: React.FC<GoshuinPassportPanelProps> = ({
  stamps,
  onAddStamp,
  onDeleteStamp,
}) => {
  const [filterKind, setFilterKind] = useState<'all' | 'goshuin' | 'eki'>('all');
  const [stampKind, setStampKind] = useState<'goshuin' | 'eki'>('goshuin');
  const [placeName, setPlaceName] = useState('');
  const [city, setCity] = useState('Kyoto');
  const [stampedDate, setStampedDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const visibleStamps =
    filterKind === 'all'
      ? stamps
      : stamps.filter((s) => s.stampKind === filterKind);

  const goshuinCount = stamps.filter((s) => s.stampKind === 'goshuin').length;
  const ekiCount = stamps.filter((s) => s.stampKind === 'eki').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim()) {
      setError('Enter the shrine, temple, or train station name.');
      return;
    }
    setError(null);
    await onAddStamp({
      stampKind,
      placeName: placeName.trim(),
      city,
      stampedDate: stampedDate || new Date().toISOString().slice(0, 10),
      notes: notes.trim(),
    });
    setPlaceName('');
    setNotes('');
  };

  return (
    <section
      aria-label="Goshuin and Station Eki Stamp Passport"
      className="liquid-glass rounded-2xl p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <Stamp className="w-5 h-5 text-accent-token shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display text-xl font-semibold text-primary-token">
              Goshuin &amp; Eki Stamp Rally Passport
            </h2>
            <p className="text-xs text-muted-token">
              Digital collector log for temple calligraphy seals &amp; JR station stamps · Synced to offline Firestore cache
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
          <span className="text-accent-token font-semibold">
            {goshuinCount} Goshuin
          </span>
          <span className="text-muted-token">·</span>
          <span className="text-primary-token font-semibold">
            {ekiCount} {ekiCount === 1 ? 'Eki Stamp' : 'Eki Stamps'}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" role="group" aria-label="Stamp Type Filter">
          {(
            [
              { id: 'all', label: `All (${stamps.length})` },
              { id: 'goshuin', label: 'Temple Goshuin' },
              { id: 'eki', label: 'Station Eki Stamps' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterKind(f.id)}
              aria-pressed={filterKind === f.id}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                filterKind === f.id
                  ? 'bg-accent-token'
                  : 'liquid-glass text-secondary-token hover:text-primary-token'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {STAMP_PRESETS.map((preset) => (
            <button
              key={preset.placeName}
              type="button"
              onClick={() => {
                setStampKind(preset.stampKind);
                setPlaceName(preset.placeName);
                setCity(preset.city);
                setNotes(preset.notes);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] liquid-glass text-secondary-token hover:text-primary-token whitespace-nowrap shrink-0"
            >
              + {preset.placeName.split(' ').slice(0, 2).join(' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Stamp Collection List */}
        <div className="lg:col-span-7 space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
          {visibleStamps.length === 0 ? (
            <div className="rounded-xl p-6 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 text-center space-y-1">
              <BookMarked className="w-6 h-6 text-accent-token mx-auto" />
              <p className="text-sm font-medium text-primary-token">
                Your Stamp Rally Passport is ready
              </p>
              <p className="text-xs text-muted-token">
                Log your first shrine goshuin or railway eki stamp on the right.
              </p>
            </div>
          ) : (
            visibleStamps.map((stamp) => (
              <div
                key={stamp.id}
                className="rounded-xl p-4 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 flex items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-token">
                    <span className="text-accent-token font-semibold uppercase">
                      {stamp.stampKind === 'goshuin' ? 'Goshuin Seal · 朱印' : 'Eki Stamp · 駅スタンプ'}
                    </span>
                    <span>·</span>
                    <span>{stamp.city}</span>
                    <span>·</span>
                    <span>{stamp.stampedDate}</span>
                  </div>
                  <p className="font-display text-base font-semibold text-primary-token">
                    {stamp.placeName}
                  </p>
                  {stamp.notes && (
                    <p className="text-xs text-secondary-token leading-relaxed">
                      {stamp.notes}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  aria-label={`Remove stamp ${stamp.placeName}`}
                  onClick={() => onDeleteStamp(stamp.id)}
                  className="p-2 text-muted-token hover:text-rose-400 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Stamp Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 rounded-xl p-4 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 space-y-3"
        >
          <p className="font-display text-sm font-semibold text-primary-token">
            Record New Stamp
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="stamp-kind" className="block text-xs text-muted-token mb-1">
                Stamp Type
              </label>
              <select
                id="stamp-kind"
                value={stampKind}
                onChange={(e) => setStampKind(e.target.value as 'goshuin' | 'eki')}
                className="w-full rounded-xl px-3 py-2 text-xs bg-black/5 dark:bg-black/40 border border-black/10 dark:border-amber-200/20 text-primary-token"
              >
                <option value="goshuin">Temple / Shrine Goshuin</option>
                <option value="eki">Train Station Eki Stamp</option>
              </select>
            </div>
            <div>
              <label htmlFor="stamp-city" className="block text-xs text-muted-token mb-1">
                City
              </label>
              <select
                id="stamp-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs bg-black/5 dark:bg-black/40 border border-black/10 dark:border-amber-200/20 text-primary-token"
              >
                {CITY_GUIDES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-7">
              <label htmlFor="stamp-place" className="block text-xs text-muted-token mb-1">
                Shrine, Temple or Station
              </label>
              <input
                id="stamp-place"
                type="text"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="e.g., Kiyomizu-dera Temple"
                className="w-full rounded-xl px-3 py-2 text-xs bg-black/5 dark:bg-black/40 border border-black/10 dark:border-amber-200/20 text-primary-token"
              />
            </div>
            <div className="sm:col-span-5">
              <label htmlFor="stamp-date" className="block text-xs text-muted-token mb-1">
                Date Collected
              </label>
              <input
                id="stamp-date"
                type="date"
                value={stampedDate}
                onChange={(e) => setStampedDate(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs font-mono bg-black/5 dark:bg-black/40 border border-black/10 dark:border-amber-200/20 text-primary-token"
              />
            </div>
          </div>

          <div>
            <label htmlFor="stamp-notes" className="block text-xs text-muted-token mb-1">
              Personal Notes (Gate, Calligraphy style, Gate Offering)
            </label>
            <textarea
              id="stamp-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Stamped beside South Gate booth after sunset..."
              className="w-full rounded-xl px-3 py-2 text-xs bg-black/5 dark:bg-black/40 border border-black/10 dark:border-amber-200/20 text-primary-token"
            />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold bg-accent-token"
          >
            <Plus className="w-3.5 h-3.5" />
            Stamp Passport
          </button>
        </form>
      </div>
    </section>
  );
};
