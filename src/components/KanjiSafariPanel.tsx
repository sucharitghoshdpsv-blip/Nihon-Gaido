import React, { useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle2, Lock, Search, Shield, Volume2 } from 'lucide-react';
import { CITY_GUIDES } from '../data/japanData';
import { encryptVaultPayload } from '../utils/cryptoVault';
import { speakJapanese } from '../utils/speech';
import {
  WILD_KANJI_CATALOG,
  buildSafariVaultSummary,
  matchKanjiFromText,
  type KanjiSightingRecord,
  type WildKanjiItem,
} from '../utils/kanjiSafari';
import type { StoredVaultRecord } from './SafetyVaultView';
import { LiquidTabs } from './ui/liquid-glass-navbar';

interface KanjiSafariPanelProps {
  sightings: KanjiSightingRecord[];
  onLogSighting: (kanjiItem: WildKanjiItem, city: string, note: string) => void;
  onSaveVaultItem: (
    record: Omit<StoredVaultRecord, 'id' | 'createdAtLabel'>
  ) => Promise<void>;
}

export const KanjiSafariPanel: React.FC<KanjiSafariPanelProps> = ({
  sightings,
  onLogSighting,
  onSaveVaultItem,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [category, setCategory] = useState<'All' | WildKanjiItem['category']>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [spotCity, setSpotCity] = useState('Tokyo');
  const [spotNote, setSpotNote] = useState('');

  // Sign scan via Gemini Vision
  const [scanningSign, setScanningSign] = useState(false);
  const [scanResultText, setScanResultText] = useState<string | null>(null);

  // Vault export state
  const [vaultPass, setVaultPass] = useState('');
  const [vaultFeedback, setVaultFeedback] = useState<string | null>(null);
  const [exportingVault, setExportingVault] = useState(false);

  const visibleKanji = useMemo(() => {
    const matched = matchKanjiFromText(searchQuery);
    return category === 'All'
      ? matched
      : matched.filter((k) => k.category === category);
  }, [category, searchQuery]);

  const handleScanSignFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== 'string') return;
      setScanningSign(true);
      setScanResultText(null);
      try {
        const res = await fetch('/api/gemini/decode-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageDataUrl: reader.result,
            mode: 'sign',
            cityContext: spotCity,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not scan sign.');
        const extractedText = (data.entries || [])
          .map((item: { originalJapanese?: string }) => item.originalJapanese || '')
          .join(' ');
        const hits = WILD_KANJI_CATALOG.filter((k) =>
          extractedText.includes(k.kanji)
        );
        if (hits.length > 0) {
          hits.forEach((h) => onLogSighting(h, spotCity, 'Matched via camera scan'));
          setScanResultText(
            `Spotted ${hits.map((h) => `${h.kanji} (${h.meaning})`).join(', ')} and added XP!`
          );
        } else {
          setScanResultText(
            `${data.title || 'Decoded sign'}: ${extractedText || data.summary}`
          );
        }
      } catch (err: unknown) {
        setScanResultText(
          err instanceof Error ? err.message : 'Sign scan failed.'
        );
      } finally {
        setScanningSign(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExportToVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setVaultFeedback(null);
    if (sightings.length === 0) {
      setVaultFeedback('Spot and log at least one street kanji first.');
      return;
    }
    if (vaultPass.length < 4) {
      setVaultFeedback('Enter an AES-GCM vault passphrase (4+ chars) to encrypt your field log.');
      return;
    }
    setExportingVault(true);
    try {
      const summary = buildSafariVaultSummary(sightings);
      const payload = JSON.stringify({
        docNumber: summary.docNumber,
        notes: summary.notes,
      });
      const envelope = await encryptVaultPayload(payload, vaultPass);
      await onSaveVaultItem({
        label: summary.label,
        docType: 'other',
        envelope,
      });
      setVaultPass('');
      setVaultFeedback(
        `Encrypted ${sightings.length} Kanji Safari sightings into your Safety & Vault locker.`
      );
    } catch (err: unknown) {
      setVaultFeedback(
        err instanceof Error ? err.message : 'Could not encrypt safari field log.'
      );
    } finally {
      setExportingVault(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Safari Progress & Street Sign Scanner Strip */}
      <div className="liquid-glass rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-primary-token">
              Kanji &amp; Street Sign Safari
            </h2>
            <p className="text-xs text-muted-token mt-0.5">
              Spot real street signs around Japan, log wild sightings for XP, and encrypt your Safari Field Log into your Vault.
            </p>
          </div>
          <span className="font-mono text-sm font-bold text-accent-token tabular-nums whitespace-nowrap shrink-0">
            {sightings.length} / {WILD_KANJI_CATALOG.length} Signs Logged
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label htmlFor="safari-search" className="block text-xs text-muted-token mb-1">
              Search Wild Kanji or Meaning
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-token absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="safari-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 出口, Exit, No Smoking, Open..."
                className="w-full rounded-xl pl-8 pr-3 py-2 text-xs bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
              />
            </div>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="safari-city" className="block text-xs text-muted-token mb-1">
              Current City
            </label>
            <select
              id="safari-city"
              value={spotCity}
              onChange={(e) => setSpotCity(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-xs bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
            >
              {CITY_GUIDES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleScanSignFile}
              className="sr-only"
            />
            <button
              type="button"
              disabled={scanningSign}
              onClick={() => fileInputRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-accent-token disabled:opacity-50 whitespace-nowrap"
            >
              <Camera className="w-3.5 h-3.5" />
              {scanningSign ? 'Scanning Sign…' : 'Scan Street Sign Photo'}
            </button>
          </div>
        </div>

        {scanResultText && (
          <p className="text-xs text-accent-token bg-black/5 dark:bg-black/35 rounded-xl px-3.5 py-2">
            {scanResultText}
          </p>
        )}

        <LiquidTabs
          items={[
            { id: 'All', label: 'All' },
            { id: 'Transit', label: 'Transit' },
            { id: 'Dining', label: 'Dining' },
            { id: 'Etiquette', label: 'Etiquette' },
            { id: 'Shopping', label: 'Shopping' },
          ]}
          value={category}
          onChange={(cat) => setCategory(cat)}
          ariaLabel="Kanji Categories"
          size="xs"
        />
      </div>

      {/* Wild Kanji Sighting Deck */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleKanji.map((item) => {
          const sighting = sightings.find((s) => s.kanjiId === item.id);
          return (
            <div
              key={item.id}
              className={`rounded-2xl p-5 border flex flex-col justify-between gap-3 ${
                sighting
                  ? 'liquid-glass-elevated border-[var(--accent)]/50'
                  : 'liquid-glass border-black/10 dark:border-amber-200/15'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-mono text-muted-token">
                      {item.category} · +{item.xp} XP
                    </span>
                    <p className="font-display text-3xl font-bold text-primary-token mt-0.5">
                      {item.kanji}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Pronounce ${item.kanji}`}
                    onClick={() => speakJapanese(item.kanji)}
                    className="p-2 rounded-lg liquid-glass text-accent-token shrink-0"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <p className="text-xs font-mono text-accent-token">{item.reading}</p>
                  <p className="font-semibold text-sm text-primary-token">{item.meaning}</p>
                </div>
                <p className="text-xs text-secondary-token leading-relaxed">
                  {item.whereFound}
                </p>
              </div>

              <div className="pt-3 border-t border-black/10 dark:border-amber-200/15 flex items-center justify-between gap-2">
                {sighting ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Spotted in {sighting.spottedAtCity}
                  </span>
                ) : (
                  <span className="text-xs text-muted-token">Not spotted yet</span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    onLogSighting(item, spotCity, spotNote.trim() || `Spotted in ${spotCity}`)
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
                    sighting
                      ? 'liquid-glass text-primary-token hover:border-accent-token'
                      : 'bg-accent-token'
                  }`}
                >
                  {sighting ? 'Log Again' : 'Log Sighting'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Encrypt & Archive Safari Field Log to Vault */}
      <form
        onSubmit={handleExportToVault}
        className="liquid-glass rounded-2xl p-6 space-y-3"
      >
        <div className="flex items-start gap-2.5">
          <Shield className="w-5 h-5 text-accent-token shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display text-lg font-semibold text-primary-token">
              Encrypt Safari Field Log into Document Vault
            </h3>
            <p className="text-xs text-muted-token">
              Packages your discovered wild street kanji into an AES-256-GCM encrypted record inside Safety &amp; Vault.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-4">
            <label htmlFor="safari-sighting-note" className="sr-only">
              Optional location note
            </label>
            <input
              id="safari-sighting-note"
              type="text"
              value={spotNote}
              onChange={(e) => setSpotNote(e.target.value)}
              placeholder="Location note (e.g., Shibuya Gate B)"
              className="w-full rounded-xl px-3 py-2 text-xs bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
            />
          </div>
          <div className="sm:col-span-5">
            <label htmlFor="safari-vault-pass" className="sr-only">
              Vault encryption passphrase
            </label>
            <input
              id="safari-vault-pass"
              type="password"
              value={vaultPass}
              onChange={(e) => setVaultPass(e.target.value)}
              placeholder="Enter Vault AES-GCM passphrase"
              className="w-full rounded-xl px-3 py-2 text-xs bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
            />
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={exportingVault}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-accent-token disabled:opacity-50 whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5" />
              Save Log to Vault
            </button>
          </div>
        </div>

        {vaultFeedback && (
          <p className="text-xs text-accent-token">{vaultFeedback}</p>
        )}
      </form>
    </div>
  );
};
