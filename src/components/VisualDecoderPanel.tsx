import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Loader2,
  Sparkles,
  Upload,
  Volume2,
} from 'lucide-react';
import type { CityGuide } from '../data/japanData';
import { speakJapanese } from '../utils/speech';
import type { VisualDecodeMode, VisualDecodeResponse } from '../utils/visualDecoder';

interface VisualDecoderPanelProps {
  selectedCity: CityGuide;
}

const MODE_OPTIONS: Array<{ id: VisualDecodeMode; label: string; hint: string }> = [
  { id: 'menu', label: 'Izakaya Menu', hint: 'Dish names, prices & hidden allergens' },
  { id: 'vending', label: 'Vending Machine', hint: 'Hot/Cold labels & unsweetened teas' },
  { id: 'shrine', label: 'Shrine Guide', hint: 'Temizuya purification & omikuji steps' },
  { id: 'sign', label: 'Street Sign', hint: 'Exit, No Smoking, Open/Closed plaques' },
];

const SAMPLE_CARDS: Array<{
  id: string;
  mode: VisualDecodeMode;
  buttonLabel: string;
  heading: string;
  lines: string[];
}> = [
  {
    id: 'sample-izakaya',
    mode: 'menu',
    buttonLabel: 'Sample: Izakaya Board',
    heading: '本日のおすすめ ·居酒屋メニュー',
    lines: [
      '出汁巻き卵 (Dashimaki Tamago)  ¥680',
      '海老天ぷら盛り (Shrimp Tempura) ¥1,180',
      '焼き鳥おまかせ5本 (Yakitori)    ¥950',
      'そばサラダ (Soba Buckwheat)     ¥780',
    ],
  },
  {
    id: 'sample-vending',
    mode: 'vending',
    buttonLabel: 'Sample: Drink Machine',
    heading: '自動販売機 · 自販機ドリンク',
    lines: [
      'つめた〜い  綾鷹 (Unsweetened Green Tea) ¥140',
      'あったか〜い  コーンポタージュ (Corn Soup) ¥150',
      'つめた〜い  微糖コーヒー (Light Sweet) ¥130',
      '硬貨・ICカード対応 (Coins & Suica Accepted)',
    ],
  },
  {
    id: 'sample-shrine',
    mode: 'shrine',
    buttonLabel: 'Sample: Shrine Basin',
    heading: '手水舎の作法 · Purification Sign',
    lines: [
      '1. 右手で柄杓を持ち、左手を清める',
      '2. 持ち替えて右手を清める',
      '3. 左手に水をうけ口をすすぐ',
      '※直接口をつけない・撮影禁止エリア注意',
    ],
  },
];

function renderSampleCanvasDataUrl(heading: string, lines: string[]): string {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Clean high-contrast warm timber/washi card
  ctx.fillStyle = '#181410';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#f6c945';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  ctx.fillStyle = '#f6c945';
  ctx.font = 'bold 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(heading, 48, 82);

  ctx.fillStyle = '#faf3dd';
  ctx.font = '600 23px "Plus Jakarta Sans", sans-serif';
  lines.forEach((line, idx) => {
    ctx.fillText(line, 48, 150 + idx * 58);
  });

  return canvas.toDataURL('image/png');
}

export const VisualDecoderPanel: React.FC<VisualDecoderPanelProps> = ({
  selectedCity,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<VisualDecodeMode>('menu');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [decoding, setDecoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decoded, setDecoded] = useState<VisualDecodeResponse | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLoadSample = (sample: (typeof SAMPLE_CARDS)[number]) => {
    setMode(sample.mode);
    setError(null);
    const dataUrl = renderSampleCanvasDataUrl(sample.heading, sample.lines);
    if (dataUrl) {
      setImageDataUrl(dataUrl);
    }
  };

  const handleDecode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!imageDataUrl) {
      setError('Upload/snap a photo or load a sample Japanese sign card first.');
      return;
    }
    setDecoding(true);
    setError(null);

    try {
      const res = await fetch('/api/gemini/decode-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl,
          mode,
          cityContext: `${selectedCity.id} (${selectedCity.district})`,
          customQuestion: customQuestion.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not decode this image.');
      }
      setDecoded(data as VisualDecodeResponse);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to reach Gemini vision decoder.'
      );
    } finally {
      setDecoding(false);
    }
  };

  return (
    <section
      aria-label="Multimodal Menu and Sign Decoder"
      className="liquid-glass rounded-2xl p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <Camera className="w-5 h-5 text-accent-token shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display text-xl font-semibold text-primary-token">
              Multimodal Menu &amp; Sign Decoder
            </h2>
            <p className="text-xs text-muted-token mt-0.5">
              Snap handwritten izakaya menus, vending buttons, or shrine signs for Gemini dish breakdowns, hidden allergen warnings &amp; usage steps.
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-muted-token whitespace-nowrap">
          Vision: gemini-4-hydrogen · {selectedCity.id}
        </span>
      </div>

      {/* Mode Selector */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Visual Decoder Mode">
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setMode(opt.id)}
            aria-pressed={mode === opt.id}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              mode === opt.id
                ? 'bg-accent-token'
                : 'liquid-glass text-secondary-token hover:text-primary-token'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Input & Preview Column */}
        <form onSubmit={handleDecode} className="lg:col-span-5 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="sr-only"
            id="visual-decoder-file"
          />

          <div className="rounded-xl p-4 bg-black/5 dark:bg-black/35 border border-dashed border-black/15 dark:border-amber-200/25 space-y-3">
            {imageDataUrl ? (
              <img
                src={imageDataUrl}
                alt="Japanese menu or sign ready for Gemini decoding"
                className="w-full max-h-52 object-contain rounded-lg bg-black/30"
              />
            ) : (
              <div className="h-36 flex flex-col items-center justify-center text-center px-4 gap-2">
                <Upload className="w-6 h-6 text-accent-token" />
                <p className="text-xs text-secondary-token">
                  Take a photo or choose an image of a Japanese menu, drink machine, or shrine board.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium liquid-glass text-primary-token hover:border-accent-token whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5 text-accent-token" />
                {imageDataUrl ? 'Change Photo' : 'Upload / Snap Photo'}
              </button>
              {SAMPLE_CARDS.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleLoadSample(sample)}
                  className="px-2.5 py-2 rounded-lg text-[11px] font-medium liquid-glass text-secondary-token hover:text-primary-token whitespace-nowrap shrink-0"
                >
                  {sample.buttonLabel}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="decoder-focus-input" className="block text-xs text-muted-token mb-1">
              Optional Question (Allergens / Vegetarian / Hot vs Cold)
            </label>
            <input
              id="decoder-focus-input"
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="e.g., Flag any dashi fish stock or shellfish"
              className="w-full rounded-xl px-3.5 py-2 text-xs bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
            />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={decoding || !imageDataUrl}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-accent-token disabled:opacity-50"
          >
            {decoding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Decoding Script &amp; Nuance…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Decode Image with Gemini
              </>
            )}
          </button>
        </form>

        {/* Decoded Output Column */}
        <div className="lg:col-span-7 space-y-4">
          {decoded ? (
            <div className="rounded-xl p-5 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 space-y-4">
              <div>
                <h3 className="font-display text-lg font-bold text-primary-token">
                  {decoded.title}
                </h3>
                <p className="text-xs text-secondary-token mt-1 leading-relaxed">
                  {decoded.summary}
                </p>
              </div>

              {decoded.allergenWarnings.length > 0 && (
                <div className="rounded-xl p-3.5 bg-rose-500/10 border border-rose-500/30 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Allergen &amp; Etiquette Warnings</span>
                  </div>
                  <ul className="space-y-1 text-xs text-secondary-token list-disc list-inside">
                    {decoded.allergenWarnings.map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {decoded.entries.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-primary-token">
                    Extracted Items &amp; Translations
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {decoded.entries.map((entry, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl p-3 bg-black/5 dark:bg-black/30 border border-black/10 dark:border-amber-200/15 space-y-1"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm text-primary-token">
                              {entry.originalJapanese}
                            </p>
                            <p className="text-[11px] font-mono text-accent-token">
                              {entry.reading}
                            </p>
                          </div>
                          {entry.originalJapanese && (
                            <button
                              type="button"
                              aria-label={`Speak ${entry.englishName}`}
                              onClick={() => speakJapanese(entry.originalJapanese)}
                              className="p-1.5 rounded-lg liquid-glass text-accent-token shrink-0"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs font-medium text-primary-token">
                          {entry.englishName}
                          {entry.priceOrDetail ? (
                            <span className="font-mono text-accent-token ml-1.5">
                              · {entry.priceOrDetail}
                            </span>
                          ) : null}
                        </p>
                        {entry.notes && (
                          <p className="text-[11px] text-secondary-token leading-snug">
                            {entry.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {decoded.usageSteps.length > 0 && (
                <div className="pt-3 border-t border-black/10 dark:border-amber-200/15 space-y-1.5">
                  <p className="text-xs font-semibold text-primary-token">
                    Step-by-Step Guide
                  </p>
                  <ol className="space-y-1 text-xs text-secondary-token list-decimal list-inside">
                    {decoded.usageSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl p-6 bg-black/5 dark:bg-black/30 border border-black/10 dark:border-amber-200/15 text-xs text-secondary-token space-y-2">
              <p className="font-semibold text-primary-token">
                Ready for Live Menu, Kiosk &amp; Shrine Vision
              </p>
              <p className="leading-relaxed">
                Select a sample Japanese board on the left or upload your own photo to extract vertical kanji text, hidden ingredients like bonito dashi or mirin, and button order guides.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
