import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Mic,
  PenTool,
  Volume2,
  Award,
} from 'lucide-react';
import {
  GRAMMAR_DRILLS,
  KANA_LESSONS,
  TRAVEL_PHRASES,
  buildKanaMatrixRows,
  type KanaChartRow,
  type KanaGroupId,
  type KanaItem,
} from '../data/japanData';
import {
  evaluatePronunciationMatch,
  type LearningProgressState,
  type PronunciationEvaluation,
} from '../utils/learning';
import { LiquidTabs } from './ui/liquid-glass-navbar';
import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  speakJapanese,
} from '../utils/speech';
import type { KanjiSightingRecord, WildKanjiItem } from '../utils/kanjiSafari';
import { KanjiSafariPanel } from './KanjiSafariPanel';
import type { StoredVaultRecord } from './SafetyVaultView';

interface LearningStudioViewProps {
  progress: LearningProgressState;
  onMasterItem: (itemId: string, xpGain?: number) => void;
  safariSightings: KanjiSightingRecord[];
  onLogSafariSighting: (kanjiItem: WildKanjiItem, city: string, note: string) => void;
  onSaveVaultItem: (
    record: Omit<StoredVaultRecord, 'id' | 'createdAtLabel'>
  ) => Promise<void>;
}

type StudioTab = 'kana' | 'phrases' | 'grammar' | 'practice' | 'safari';

export const LearningStudioView: React.FC<LearningStudioViewProps> = ({
  progress,
  onMasterItem,
  safariSightings,
  onLogSafariSighting,
  onSaveVaultItem,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('kana');
  const [scriptFilter, setScriptFilter] = useState<'Hiragana' | 'Katakana'>('Hiragana');
  const [kanaGroup, setKanaGroup] = useState<KanaGroupId | 'all'>('basic');
  const [selectedKana, setSelectedKana] = useState<KanaItem>(KANA_LESSONS[0]);
  const [phraseFilter, setPhraseFilter] = useState<'All' | 'Dining' | 'Transit' | 'Shopping' | 'Etiquette'>('All');

  // Grammar drill state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  // Canvas stroke pad state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [practiceChar, setPracticeChar] = useState<string>('あ');
  const [strokeCount, setStrokeCount] = useState(0);

  // Speaking drill state
  const [speakingIdx, setSpeakingIdx] = useState(0);
  const [spokenInput, setSpokenInput] = useState('');
  const [speakingEval, setSpeakingEval] = useState<PronunciationEvaluation | null>(null);
  const [listening, setListening] = useState(false);

  const scriptAllKana = KANA_LESSONS.filter((k) => k.script === scriptFilter);
  const scriptMasteredCount = scriptAllKana.filter((k) =>
    progress.masteredIds.includes(k.id)
  ).length;
  const activeSelectedIdx = Math.max(
    0,
    scriptAllKana.findIndex((k) => k.id === selectedKana.id)
  );
  const visibleGroups: KanaGroupId[] =
    kanaGroup === 'all' ? ['basic', 'dakuten', 'yoon'] : [kanaGroup];
  const visiblePhrases =
    phraseFilter === 'All'
      ? TRAVEL_PHRASES
      : TRAVEL_PHRASES.filter((p) => p.category === phraseFilter);

  const currentSpeakingPhrase = TRAVEL_PHRASES[speakingIdx % TRAVEL_PHRASES.length];

  useEffect(() => {
    clearCanvas();
  }, [practiceChar]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle practice grid lines inside canvas
    ctx.strokeStyle = 'rgba(246, 201, 69, 0.22)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tracing guide character
    ctx.fillStyle = 'rgba(246, 201, 69, 0.16)';
    ctx.font = '600 130px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(practiceChar, canvas.width / 2, canvas.height / 2 + 6);
    setStrokeCount(0);
  };

  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPointerPos(e);
    isDrawingRef.current = true;
    ctx.strokeStyle = '#F6C945';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setStrokeCount((c) => c + 1);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPointerPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const handleSpeakPractice = () => {
    const rec = createSpeechRecognizer('ja-JP');
    if (!rec) {
      if (spokenInput.trim()) {
        const res = evaluatePronunciationMatch(
          currentSpeakingPhrase.japanese,
          currentSpeakingPhrase.romaji,
          spokenInput
        );
        setSpeakingEval(res);
        if (res.score >= 50) onMasterItem(`speak-${currentSpeakingPhrase.id}`, 30);
      }
      return;
    }
    setListening(true);
    rec.onresult = (ev) => {
      const text = ev.results?.[0]?.[0]?.transcript || '';
      setSpokenInput(text);
      setListening(false);
      const res = evaluatePronunciationMatch(
        currentSpeakingPhrase.japanese,
        currentSpeakingPhrase.romaji,
        text
      );
      setSpeakingEval(res);
      if (res.score >= 50) onMasterItem(`speak-${currentSpeakingPhrase.id}`, 30);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  };

  return (
    <div className="space-y-6">
      {/* Header & Progress Summary */}
      <section className="liquid-glass-elevated rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary-token">
            Japanese Learning Studio
          </h1>
          <p className="text-sm text-secondary-token mt-1">
            Master Kana scripts, survival travel phrases, grammar particles, and brush stroke form.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div>
            <p className="text-xs text-muted-token">Study XP</p>
            <p className="font-mono text-xl font-bold text-accent-token tabular-nums">
              {progress.xp}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-token">Mastered Items</p>
            <p className="font-mono text-xl font-bold text-primary-token tabular-nums">
              {progress.masteredIds.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-token">Modules Done</p>
            <p className="font-mono text-xl font-bold text-primary-token tabular-nums">
              {progress.completedLessons}
            </p>
          </div>
        </div>
      </section>

      {/* Studio Sub-Navigation */}
      <LiquidTabs
        items={[
          { id: 'kana', label: 'Kana Matrix' },
          { id: 'phrases', label: 'Travel Phrases' },
          { id: 'grammar', label: 'Grammar Drills' },
          { id: 'practice', label: 'Speaking & Writing' },
          { id: 'safari', label: `Kanji Safari (${safariSightings.length})` },
        ]}
        value={activeTab}
        onChange={(id) => setActiveTab(id as StudioTab)}
        ariaLabel="Learning Studio Sections"
        size="sm"
      />

      {/* Tab 1: Kana Matrix */}
      {activeTab === 'kana' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 liquid-glass rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-primary-token">
                  Complete {scriptFilter} Chart
                </h2>
                <p className="text-xs text-muted-token mt-0.5 tabular-nums">
                  {scriptMasteredCount} / {scriptAllKana.length} mastered · 46 Gojūon · 25 Dakuten · 33 Yōon
                </p>
              </div>
              <LiquidTabs
                items={[
                  { id: 'Hiragana', label: 'Hiragana' },
                  { id: 'Katakana', label: 'Katakana' },
                ]}
                value={scriptFilter}
                onChange={(sc) => {
                  setScriptFilter(sc);
                  const targetGroup = kanaGroup === 'all' ? 'basic' : kanaGroup;
                  const first =
                    KANA_LESSONS.find((k) => k.script === sc && k.group === targetGroup) ??
                    KANA_LESSONS.find((k) => k.script === sc);
                  if (first) setSelectedKana(first);
                }}
                ariaLabel="Kana Script"
                size="xs"
              />
            </div>

            {/* Chart Group Switcher */}
            <div className="border-b border-black/10 dark:border-amber-200/10 pb-3">
              <LiquidTabs
                items={[
                  { id: 'basic', label: 'Basic Gojūon (46)' },
                  { id: 'dakuten', label: 'Dakuten & Handakuten (25)' },
                  { id: 'yoon', label: 'Combo Yōon (33)' },
                  { id: 'all', label: 'Full Deck (104)' },
                ]}
                value={kanaGroup}
                onChange={(grpId) => {
                  setKanaGroup(grpId);
                  if (grpId !== 'all' && selectedKana.group !== grpId) {
                    const firstInGroup = scriptAllKana.find((k) => k.group === grpId);
                    if (firstInGroup) setSelectedKana(firstInGroup);
                  }
                }}
                ariaLabel="Kana Chart Groups"
                size="xs"
              />
            </div>

            {/* Aligned Gojūon / Dakuten / Yōon Sections */}
            <div className="space-y-6">
              {visibleGroups.map((groupId) => {
                const rows: KanaChartRow[] = buildKanaMatrixRows(scriptFilter, groupId);
                const colHeaders =
                  groupId === 'yoon'
                    ? ['-ya', '-yu', '-yo']
                    : ['a', 'i', 'u', 'e', 'o'];
                const sectionHeading =
                  groupId === 'basic'
                    ? 'Gojūon · 46 Fundamental Syllables'
                    : groupId === 'dakuten'
                    ? 'Dakuten (゛) & Handakuten (゜) · 25 Voiced Syllables'
                    : 'Yōon · 33 Contracted Syllables';
                const gridColsClass =
                  groupId === 'yoon'
                    ? 'grid-cols-[2.25rem_repeat(3,minmax(0,1fr))]'
                    : 'grid-cols-[2rem_repeat(5,minmax(0,1fr))]';

                return (
                  <section key={groupId} className="space-y-2.5" aria-label={sectionHeading}>
                    <div className="flex items-center justify-between text-xs text-muted-token">
                      <h3 className="font-semibold text-secondary-token">{sectionHeading}</h3>
                    </div>

                    {/* Vowel Header */}
                    <div className={`grid ${gridColsClass} gap-2 items-center text-center text-[11px] font-mono text-muted-token`}>
                      <span aria-hidden="true" />
                      {colHeaders.map((col) => (
                        <span key={col}>{col}</span>
                      ))}
                    </div>

                    {/* Syllable Rows */}
                    <div className="space-y-2">
                      {rows.map((row) => (
                        <div
                          key={row.rowKey}
                          className={`grid ${gridColsClass} gap-2 items-stretch`}
                        >
                          <div className="flex items-center justify-center text-[11px] font-mono font-semibold text-muted-token select-none">
                            {row.rowLabel}
                          </div>
                          {row.cells.map((item, colIdx) => {
                            if (!item) {
                              return (
                                <div
                                  key={`${row.rowKey}-empty-${colIdx}`}
                                  aria-hidden="true"
                                  className="rounded-xl border border-dashed border-black/8 dark:border-amber-200/10 bg-black/[0.02] dark:bg-white/[0.015] min-h-[64px]"
                                />
                              );
                            }
                            const mastered = progress.masteredIds.includes(item.id);
                            const selected = selectedKana.id === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                aria-pressed={selected}
                                aria-label={`${item.char} (${item.romaji})`}
                                onClick={() => {
                                  setSelectedKana(item);
                                  speakJapanese(item.char);
                                }}
                                className={`relative rounded-xl py-2.5 px-1.5 text-center transition-all min-h-[64px] flex flex-col items-center justify-center ${
                                  selected
                                    ? 'liquid-glass-elevated ring-2 ring-[var(--accent)]'
                                    : 'liquid-glass hover:border-accent-token'
                                }`}
                              >
                                {mastered && (
                                  <Check
                                    aria-label="Mastered"
                                    className="w-3 h-3 text-accent-token absolute top-1.5 right-1.5"
                                  />
                                )}
                                <div className="text-xl sm:text-2xl font-bold text-primary-token leading-tight">
                                  {item.char}
                                </div>
                                <div className="text-[11px] font-mono text-accent-token mt-0.5">
                                  {item.romaji}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-24 liquid-glass rounded-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-token">
                  {selectedKana.script} Focus ·{' '}
                  {selectedKana.group === 'basic'
                    ? 'Gojūon'
                    : selectedKana.group === 'dakuten'
                    ? 'Dakuten / Handakuten'
                    : 'Yōon Combo'}{' '}
                  · {activeSelectedIdx + 1} / {scriptAllKana.length}
                </p>
                <div className="flex items-baseline gap-3 mt-1.5">
                  <span className="text-6xl font-bold text-primary-token">{selectedKana.char}</span>
                  <span className="font-mono text-2xl text-accent-token">/{selectedKana.romaji}/</span>
                </div>
              </div>
              <button
                type="button"
                aria-label={`Hear ${selectedKana.romaji}`}
                onClick={() => speakJapanese(selectedKana.char)}
                className="p-3 rounded-xl liquid-glass text-accent-token hover:border-accent-token shrink-0"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5 text-sm">
              <p className="font-semibold text-primary-token">Visual Mnemonic</p>
              <p className="text-secondary-token leading-relaxed">{selectedKana.mnemonic}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onMasterItem(selectedKana.id, 25)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent-token whitespace-nowrap shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                {progress.masteredIds.includes(selectedKana.id)
                  ? 'Mastered (+25 XP)'
                  : 'Mark as Mastered'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPracticeChar(selectedKana.char);
                  setActiveTab('practice');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium liquid-glass text-primary-token whitespace-nowrap shrink-0"
              >
                <PenTool className="w-3.5 h-3.5 text-accent-token" />
                Trace Character
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-black/10 dark:border-amber-200/10">
              <button
                type="button"
                onClick={() => {
                  const prevIdx =
                    (activeSelectedIdx - 1 + scriptAllKana.length) % scriptAllKana.length;
                  const nextItem = scriptAllKana[prevIdx];
                  if (!nextItem) return;
                  setSelectedKana(nextItem);
                  if (kanaGroup !== 'all' && nextItem.group !== kanaGroup) {
                    setKanaGroup(nextItem.group);
                  }
                  speakJapanese(nextItem.char);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium liquid-glass text-secondary-token hover:text-primary-token whitespace-nowrap shrink-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextIdx = (activeSelectedIdx + 1) % scriptAllKana.length;
                  const nextItem = scriptAllKana[nextIdx];
                  if (!nextItem) return;
                  setSelectedKana(nextItem);
                  if (kanaGroup !== 'all' && nextItem.group !== kanaGroup) {
                    setKanaGroup(nextItem.group);
                  }
                  speakJapanese(nextItem.char);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium liquid-glass text-secondary-token hover:text-primary-token whitespace-nowrap shrink-0"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Travel Phrases */}
      {activeTab === 'phrases' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'Dining', 'Transit', 'Shopping', 'Etiquette'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setPhraseFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  phraseFilter === cat
                    ? 'bg-accent-token'
                    : 'liquid-glass text-secondary-token hover:text-primary-token'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visiblePhrases.map((phr) => {
              const mastered = progress.masteredIds.includes(phr.id);
              return (
                <div key={phr.id} className="liquid-glass rounded-2xl p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-token">
                      <span>{phr.category} · {mastered ? 'Mastered' : 'Essential Phrase'}</span>
                      <button
                        type="button"
                        aria-label={`Play audio for ${phr.english}`}
                        onClick={() => speakJapanese(phr.japanese)}
                        className="p-2 rounded-lg liquid-glass text-accent-token hover:border-accent-token"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="font-display text-lg font-bold text-primary-token">{phr.japanese}</p>
                    <p className="text-xs font-mono text-accent-token">{phr.romaji}</p>
                    <p className="text-sm font-medium text-primary-token">{phr.english}</p>
                    <p className="text-xs text-secondary-token leading-relaxed">{phr.nuance}</p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-black/10 dark:border-amber-200/10">
                    <button
                      type="button"
                      onClick={() => onMasterItem(phr.id, 25)}
                      className="text-xs font-semibold text-accent-token hover:underline"
                    >
                      {mastered ? 'Reviewed' : 'Mark Mastered (+25 XP)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const idx = TRAVEL_PHRASES.findIndex((p) => p.id === phr.id);
                        setSpeakingIdx(Math.max(0, idx));
                        setActiveTab('practice');
                      }}
                      className="text-xs font-medium text-secondary-token hover:text-primary-token"
                    >
                      Practice Speaking →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Grammar Drills */}
      {activeTab === 'grammar' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {GRAMMAR_DRILLS.map((drill) => {
            const chosen = selectedAnswers[drill.id];
            const isCorrect = chosen === drill.correctAnswer;
            return (
              <div key={drill.id} className="liquid-glass rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-token">
                  <span>{drill.level} Grammar</span>
                  {chosen && (
                    <span className={isCorrect ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                      {isCorrect ? 'Correct (+30 XP)' : 'Try Again'}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-secondary-token">{drill.prompt}</p>
                <p className="font-display text-xl font-bold text-primary-token">
                  {drill.sentenceWithBlank}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {drill.options.map((opt) => {
                    const active = chosen === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setSelectedAnswers((prev) => ({ ...prev, [drill.id]: opt }));
                          if (opt === drill.correctAnswer) {
                            onMasterItem(drill.id, 30);
                          }
                        }}
                        className={`py-2 px-3 rounded-xl text-sm font-semibold transition-colors ${
                          active
                            ? opt === drill.correctAnswer
                              ? 'bg-emerald-600 text-white'
                              : 'bg-rose-600 text-white'
                            : 'liquid-glass text-primary-token hover:border-accent-token'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {chosen && (
                  <p className="text-xs text-secondary-token pt-2 border-t border-black/10 dark:border-amber-200/15 leading-relaxed">
                    {drill.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 4: Speaking & Writing */}
      {activeTab === 'practice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Writing Pad */}
          <div className="lg:col-span-6 liquid-glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-primary-token">
                  Calligraphy Stroke Pad
                </h2>
                <p className="text-xs text-muted-token">
                  Trace character <span className="font-bold text-accent-token">{practiceChar}</span> with mouse or finger
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {['あ', 'い', 'か', 'す', '山', '京'].map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setPracticeChar(ch)}
                    className={`w-8 h-8 rounded-lg text-sm font-bold ${
                      practiceChar === ch
                        ? 'bg-accent-token'
                        : 'liquid-glass text-primary-token'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <canvas
                ref={canvasRef}
                width={280}
                height={240}
                data-testid="kana-writing-canvas"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="rounded-2xl bg-black/10 dark:bg-black/45 border border-black/15 dark:border-amber-200/25 touch-none cursor-crosshair"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={clearCanvas}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium liquid-glass text-secondary-token hover:text-primary-token whitespace-nowrap shrink-0"
              >
                <Eraser className="w-3.5 h-3.5" />
                Clear Pad
              </button>
              <button
                type="button"
                onClick={() => onMasterItem(`write-${practiceChar}`, 20)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-accent-token whitespace-nowrap shrink-0"
              >
                <Award className="w-3.5 h-3.5" />
                Save Practice ({strokeCount} strokes)
              </button>
            </div>
          </div>

          {/* Speaking Challenge */}
          <div className="lg:col-span-6 liquid-glass rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-semibold text-primary-token">
                  Speaking Pronunciation Challenge
                </h2>
                <p className="text-xs text-muted-token">
                  Phrase {(speakingIdx % TRAVEL_PHRASES.length) + 1} of {TRAVEL_PHRASES.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSpeakingIdx((i) => i + 1);
                  setSpeakingEval(null);
                  setSpokenInput('');
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium liquid-glass text-primary-token"
              >
                Next Phrase
              </button>
            </div>

            <div className="rounded-xl p-4 bg-black/5 dark:bg-black/35 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-xl font-bold text-primary-token">
                  {currentSpeakingPhrase.japanese}
                </p>
                <button
                  type="button"
                  aria-label="Listen to target phrase"
                  onClick={() => speakJapanese(currentSpeakingPhrase.japanese)}
                  className="p-2 rounded-lg liquid-glass text-accent-token"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs font-mono text-accent-token">{currentSpeakingPhrase.romaji}</p>
              <p className="text-sm text-secondary-token">{currentSpeakingPhrase.english}</p>
            </div>

            <div className="space-y-3">
              <label htmlFor="speak-transcript" className="block text-xs font-medium text-muted-token">
                Spoken Transcript ({isSpeechRecognitionSupported() ? 'Mic or Text' : 'Type Japanese or Romaji'})
              </label>
              <div className="flex gap-2">
                <input
                  id="speak-transcript"
                  type="text"
                  value={spokenInput}
                  onChange={(e) => setSpokenInput(e.target.value)}
                  placeholder="Say or type phrase (e.g. okaikei o onegaishimasu)..."
                  className="flex-1 rounded-xl px-3.5 py-2.5 text-sm bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token"
                />
                <button
                  type="button"
                  onClick={handleSpeakPractice}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-accent-token whitespace-nowrap shrink-0"
                >
                  <Mic className="w-4 h-4" />
                  {listening ? 'Listening…' : isSpeechRecognitionSupported() ? 'Speak' : 'Evaluate'}
                </button>
              </div>
              {spokenInput.trim() && isSpeechRecognitionSupported() && (
                <button
                  type="button"
                  onClick={() => {
                    const res = evaluatePronunciationMatch(
                      currentSpeakingPhrase.japanese,
                      currentSpeakingPhrase.romaji,
                      spokenInput
                    );
                    setSpeakingEval(res);
                    if (res.score >= 50) onMasterItem(`speak-${currentSpeakingPhrase.id}`, 30);
                  }}
                  className="text-xs font-medium text-accent-token hover:underline"
                >
                  Evaluate typed transcript
                </button>
              )}
            </div>

            {speakingEval && (
              <div className="rounded-xl p-4 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary-token">
                  <BookOpen className="w-4 h-4 text-accent-token" />
                  <span className="font-mono text-accent-token">{speakingEval.score}%</span>
                  <span>· {speakingEval.grade}</span>
                </div>
                <p className="text-xs text-secondary-token">{speakingEval.feedback}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Kanji & Street Sign Safari */}
      {activeTab === 'safari' && (
        <KanjiSafariPanel
          sightings={safariSightings}
          onLogSighting={onLogSafariSighting}
          onSaveVaultItem={onSaveVaultItem}
        />
      )}
    </div>
  );
};
