import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Compass,
  Loader2,
  MessageSquare,
  Mic,
  Send,
  Sparkles,
  Volume2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { CITY_GUIDES, HERO_IMAGE_URL, type CityGuide } from '../data/japanData';
import {
  createSpeechRecognizer,
  isSpeechRecognitionSupported,
  speakJapanese,
} from '../utils/speech';
import { evaluatePronunciationMatch, type PronunciationEvaluation } from '../utils/learning';
import { CityWeatherForecast } from './CityWeatherForecast';
import { ExploreVideoStudio } from './ExploreVideoStudio';

interface TranslationResult {
  primaryTranslation: string;
  romaji: string;
  kanaReading: string;
  literalMeaning: string;
  nuanceNote: string;
  alternativePhrase: string;
  modelUsed?: string;
  fallbackNotice?: string | null;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  modelUsed?: string;
  notice?: string | null;
}

interface ExploreTranslatorViewProps {
  selectedCity: CityGuide;
  onSelectCity: (city: CityGuide) => void;
  onOpen3DShrine: () => void;
}

export const ExploreTranslatorView: React.FC<ExploreTranslatorViewProps> = ({
  selectedCity,
  onSelectCity,
  onOpen3DShrine,
}) => {
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [failedCityImages, setFailedCityImages] = useState<Record<string, boolean>>({});
  const [generatedVideos, setGeneratedVideos] = useState<Record<string, string>>({});

  const handleApplyVideoToExplore = (
    targetKey: 'hero' | CityGuide['id'],
    videoDataUrl: string
  ) => {
    setGeneratedVideos((prev) => ({ ...prev, [targetKey]: videoDataUrl }));
  };

  // Translator state
  const [direction, setDirection] = useState<'en-to-ja' | 'ja-to-en'>('en-to-ja');
  const [register, setRegister] = useState<'polite' | 'casual' | 'keigo' | 'dining'>('polite');
  const [sourceText, setSourceText] = useState(
    'Excuse me, does this train stop at Kyoto Station?'
  );
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [translation, setTranslation] = useState<TranslationResult>({
    primaryTranslation: 'すみません、この電車は京都駅に止まりますか？',
    romaji: 'Sumimasen, kono densha wa Kyoto-eki ni tomarimasu ka?',
    kanaReading: 'すみません、このでんしゃはきょうとえきにとまりますか？',
    literalMeaning: 'Excuse me, as for this train, does it stop at Kyoto Station?',
    nuanceNote:
      'Starting with "Sumimasen" softens the interruption politely on busy platforms. "-masu ka" maintains respectful Desu-Masu register ideal for station attendants.',
    alternativePhrase: '京都駅に行きますか？ (Kyoto-eki ni ikimasu ka? — Does it go to Kyoto?)',
    modelUsed: 'gemini-4-carbon',
  });

  // Voice & Pronunciation state
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [spokenPractice, setSpokenPractice] = useState('');
  const [pronunciationEval, setPronunciationEval] = useState<PronunciationEvaluation | null>(null);
  const [aiCoaching, setAiCoaching] = useState<string | null>(null);
  const [coachingLoading, setCoachingLoading] = useState(false);

  // Concierge chat state
  const [chatInput, setChatInput] = useState('');
  const [deepThinking, setDeepThinking] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      text: `Welcome to ${selectedCity.id} (${selectedCity.district}). Ask me about rail passes, dietary allergies in Japanese, hidden neighborhoods, or cultural etiquette.`,
    },
  ]);

  const handleTranslate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sourceText.trim()) {
      setTranslateError('Enter a phrase or question to translate.');
      return;
    }
    setTranslateError(null);
    setTranslating(true);
    setPronunciationEval(null);
    setAiCoaching(null);

    try {
      const res = await fetch('/api/gemini/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText,
          direction,
          register,
          cityContext: `${selectedCity.id} (${selectedCity.district})`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Translation request failed.');
      }
      setTranslation(data as TranslationResult);
    } catch (err: unknown) {
      setTranslateError(err instanceof Error ? err.message : 'Unable to reach translator.');
    } finally {
      setTranslating(false);
    }
  };

  const handleVoiceTranslateInput = () => {
    const lang = direction === 'ja-to-en' ? 'ja-JP' : 'en-US';
    const rec = createSpeechRecognizer(lang);
    if (!rec) {
      setTranslateError('Browser Web Speech recognition is unavailable here; type your phrase directly.');
      return;
    }
    setTranslateError(null);
    setIsListeningVoice(true);
    rec.onresult = (ev) => {
      const transcript = ev.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        setSourceText(transcript);
      }
      setIsListeningVoice(false);
    };
    rec.onerror = () => {
      setIsListeningVoice(false);
    };
    rec.onend = () => {
      setIsListeningVoice(false);
    };
    rec.start();
  };

  const handlePracticePronunciation = () => {
    const rec = createSpeechRecognizer('ja-JP');
    if (!rec) {
      // Allow immediate evaluation if user typed transcript
      if (spokenPractice.trim()) {
        runPronunciationEval(spokenPractice);
      } else {
        setTranslateError('Microphone speech recognition is unsupported in this browser; type Romaji or Kana below to test feedback.');
      }
      return;
    }
    setIsListeningVoice(true);
    rec.onresult = (ev) => {
      const transcript = ev.results?.[0]?.[0]?.transcript || '';
      setSpokenPractice(transcript);
      setIsListeningVoice(false);
      if (transcript) {
        runPronunciationEval(transcript);
      }
    };
    rec.onerror = () => setIsListeningVoice(false);
    rec.onend = () => setIsListeningVoice(false);
    rec.start();
  };

  const runPronunciationEval = async (transcript: string) => {
    const targetJp =
      direction === 'en-to-ja' ? translation.primaryTranslation : sourceText;
    const result = evaluatePronunciationMatch(targetJp, translation.romaji, transcript);
    setPronunciationEval(result);

    setCoachingLoading(true);
    try {
      const res = await fetch('/api/gemini/pronunciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedJapanese: targetJp,
          expectedRomaji: translation.romaji,
          spokenTranscript: transcript,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiCoaching(data.coaching || null);
      }
    } catch {
      // Non-blocking
    } finally {
      setCoachingLoading(false);
    }
  };

  const sendConciergeMessage = async (promptOverride?: string) => {
    const query = (promptOverride ?? chatInput).trim();
    if (!query || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: query,
    };
    setChatMessages((prev) => [...prev, userMsg]);
    if (!promptOverride) setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/gemini/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          city: `${selectedCity.id} (${selectedCity.district})`,
          deepThinking,
          history: chatMessages.slice(-4).map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Concierge request failed.');
      }
      setChatMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: data.reply,
          modelUsed: data.modelUsed,
          notice: data.fallbackNotice,
        },
      ]);
    } catch (err: unknown) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text:
            err instanceof Error
              ? `Concierge could not reach Gemini right now (${err.message}). Local tip for ${selectedCity.id}: ${selectedCity.etiquetteOverlayTip}`
              : 'Concierge unavailable.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Editorial Hero Split */}
      <section className="liquid-glass-elevated rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 relative min-h-[260px] lg:min-h-[340px] overflow-hidden">
          {generatedVideos[selectedCity.id] || generatedVideos.hero ? (
            <video
              key={generatedVideos[selectedCity.id] || generatedVideos.hero}
              src={generatedVideos[selectedCity.id] || generatedVideos.hero}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover lg:absolute lg:inset-0"
            />
          ) : !heroImgFailed ? (
            <img
              src={selectedCity.imageUrl || HERO_IMAGE_URL}
              alt={`${selectedCity.id} ${selectedCity.district}`}
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="w-full h-full object-cover lg:absolute lg:inset-0"
            />
          ) : (
            <div className="w-full h-full min-h-[260px] bg-gradient-to-br from-slate-900 via-amber-950/50 to-slate-950 flex items-center justify-center p-8">
              <div className="text-center">
                <Compass className="w-10 h-10 mx-auto mb-2 text-accent-token" />
                <p className="font-display text-lg font-semibold text-primary-token">Japan Cultural Atlas</p>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-6 sm:p-8">
            <p className="text-xs font-medium tracking-wide text-amber-300 mb-1.5">
              {selectedCity.japaneseName} · {selectedCity.regionLabel} Region
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight max-w-xl">
              {selectedCity.headline}
            </h1>
            <p className="text-sm text-amber-100/90 mt-2 max-w-xl leading-relaxed">
              {selectedCity.culturalInsight}
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 p-6 sm:p-7 flex flex-col justify-between gap-6">
          <div>
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="font-display text-lg font-semibold text-primary-token">
                Local Cultural Etiquette
              </h2>
              <span className="text-xs font-mono text-muted-token whitespace-nowrap">
                {selectedCity.id} · {selectedCity.offlineSizeMb} MB offline
              </span>
            </div>
            <p className="text-sm font-medium text-accent-token mb-3">
              {selectedCity.etiquetteOverlayTitle}
            </p>
            <ul className="space-y-2.5 text-sm text-secondary-token">
              {selectedCity.etiquetteChecklist.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-accent-token shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 border-t border-black/10 dark:border-amber-200/15 flex items-center justify-between gap-4 text-xs text-muted-token">
            <span>Primary Rail Hub</span>
            <span className="font-medium text-primary-token text-right">{selectedCity.transitHub}</span>
          </div>
        </div>
      </section>

      {/* City Selector Strip */}
      <section aria-label="Japan Cities">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-primary-token">
            Select Destination Context
          </h2>
          <span className="text-xs text-muted-token">
            Switching cities triggers local etiquette briefings
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {CITY_GUIDES.map((city) => {
            const active = city.id === selectedCity.id;
            const imgBroken = failedCityImages[city.id];
            return (
              <button
                key={city.id}
                type="button"
                onClick={() => onSelectCity(city)}
                aria-pressed={active}
                className={`group text-left rounded-xl overflow-hidden transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  active
                    ? 'liquid-glass-elevated ring-2 ring-[var(--accent)]'
                    : 'liquid-glass hover:translate-y-[-2px]'
                }`}
              >
                <div className="aspect-[4/3] relative overflow-hidden bg-slate-900">
                  {generatedVideos[city.id] ? (
                    <video
                      key={generatedVideos[city.id]}
                      src={generatedVideos[city.id]}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : !imgBroken ? (
                    <img
                      src={city.imageUrl}
                      alt={`${city.id} ${city.district}`}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setFailedCityImages((prev) => ({ ...prev, [city.id]: true }))
                      }
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
                      <Compass className="w-6 h-6 text-accent-token" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-2 left-2.5 right-2.5">
                    <p className="font-display text-sm font-semibold text-white truncate">
                      {city.id}
                    </p>
                    <p className="text-[11px] text-amber-200/90 truncate">{city.district}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3-Second Motion Video Studio & 3D Shrine Entry */}
      <ExploreVideoStudio
        selectedCity={selectedCity}
        generatedVideos={generatedVideos}
        onApplyVideoToExplore={handleApplyVideoToExplore}
        onOpen3DShrine={onOpen3DShrine}
      />

      {/* 3-Day City Weather Outlook */}
      <CityWeatherForecast selectedCity={selectedCity} />

      {/* Main Workspace: Nuance Translator + AI Concierge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Nuance-Aware Translator */}
        <section className="lg:col-span-7 liquid-glass rounded-2xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold text-primary-token">
                Nuance-Aware Translator
              </h2>
              <p className="text-xs text-muted-token mt-0.5">
                {direction === 'en-to-ja' ? 'English → Japanese' : 'Japanese → English'} · Context: {selectedCity.id} · High Thinking
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setDirection((d) => (d === 'en-to-ja' ? 'ja-to-en' : 'en-to-ja'))
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium liquid-glass hover:border-accent-token transition-colors whitespace-nowrap shrink-0"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-accent-token" />
                Swap Language
              </button>
            </div>
          </div>

          <form onSubmit={handleTranslate} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-token mr-1">Register:</span>
              {(['polite', 'casual', 'keigo', 'dining'] as const).map((reg) => (
                <button
                  key={reg}
                  type="button"
                  onClick={() => setRegister(reg)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap shrink-0 ${
                    register === reg
                      ? 'bg-accent-token'
                      : 'liquid-glass text-secondary-token hover:text-primary-token'
                  }`}
                >
                  {reg === 'keigo' ? 'Keigo (Honorific)' : reg}
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="translator-input" className="sr-only">
                Phrase to translate
              </label>
              <textarea
                id="translator-input"
                rows={3}
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder={
                  direction === 'en-to-ja'
                    ? 'Type an English phrase (e.g., "Do you have a shellfish-free menu?")'
                    : 'Type Japanese text (e.g., "禁煙席はありますか？")'
                }
                className="w-full rounded-xl p-3.5 text-sm bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token placeholder:text-muted-token focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleVoiceTranslateInput}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium liquid-glass text-secondary-token hover:text-primary-token whitespace-nowrap shrink-0"
                >
                  <Mic className="w-3.5 h-3.5 text-accent-token" />
                  {isListeningVoice ? 'Listening…' : 'Voice Input'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDirection('en-to-ja');
                    setSourceText('I have a nut allergy, could you recommend a safe dish?');
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-medium liquid-glass text-secondary-token hover:text-primary-token whitespace-nowrap shrink-0"
                >
                  Allergy Sample
                </button>
              </div>

              <button
                type="submit"
                disabled={translating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent-token transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {translating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing Nuance…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Translate
                  </>
                )}
              </button>
            </div>
          </form>

          {translateError && (
            <div className="flex items-start gap-2 rounded-xl p-3 bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{translateError}</span>
            </div>
          )}

          {/* Translation Output */}
          <div className="pt-4 border-t border-black/10 dark:border-amber-200/15 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xl sm:text-2xl font-display font-bold text-primary-token leading-snug">
                  {translation.primaryTranslation}
                </p>
                <p className="text-xs font-mono text-accent-token">{translation.romaji}</p>
                <p className="text-xs text-muted-token">{translation.kanaReading}</p>
              </div>
              <button
                type="button"
                aria-label="Play Japanese pronunciation"
                onClick={() =>
                  speakJapanese(
                    direction === 'en-to-ja' ? translation.primaryTranslation : sourceText
                  )
                }
                className="p-2.5 rounded-xl liquid-glass hover:border-accent-token text-accent-token shrink-0"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p className="font-semibold text-primary-token">Literal Breakdown</p>
                <p className="text-secondary-token leading-relaxed">{translation.literalMeaning}</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-primary-token">Cultural Nuance</p>
                <p className="text-secondary-token leading-relaxed">{translation.nuanceNote}</p>
              </div>
            </div>

            <div className="text-xs text-secondary-token pt-2 border-t border-black/5 dark:border-amber-200/10">
              <span className="font-semibold text-primary-token">Alternative: </span>
              {translation.alternativePhrase}
            </div>

            {/* Voice Pronunciation Feedback */}
            <div className="rounded-xl p-4 bg-black/5 dark:bg-black/30 border border-black/10 dark:border-amber-200/15 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-primary-token">
                  Pronunciation Feedback Lab
                </p>
                <span className="text-[11px] text-muted-token">
                  {isSpeechRecognitionSupported() ? 'Web Speech Ready' : 'Manual Transcript Mode'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  aria-label="Spoken Japanese transcript"
                  value={spokenPractice}
                  onChange={(e) => setSpokenPractice(e.target.value)}
                  placeholder="Speak via mic or type what you pronounced (e.g. sumimasen)..."
                  className="flex-1 rounded-lg px-3 py-2 text-xs bg-white/70 dark:bg-black/40 border border-black/10 dark:border-amber-200/20 text-primary-token"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePracticePronunciation}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-accent-token whitespace-nowrap shrink-0"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    {isSpeechRecognitionSupported() ? 'Record & Score' : 'Check Match'}
                  </button>
                  {spokenPractice.trim() && (
                    <button
                      type="button"
                      onClick={() => runPronunciationEval(spokenPractice)}
                      className="px-3 py-2 rounded-lg text-xs font-medium liquid-glass text-primary-token whitespace-nowrap shrink-0"
                    >
                      Score Text
                    </button>
                  )}
                </div>
              </div>

              {pronunciationEval && (
                <div className="text-xs space-y-1 pt-1">
                  <div className="flex items-center gap-2 font-semibold text-primary-token">
                    <span className="font-mono text-accent-token">{pronunciationEval.score}%</span>
                    <span>· {pronunciationEval.grade}</span>
                  </div>
                  <p className="text-secondary-token">{pronunciationEval.feedback}</p>
                  {coachingLoading && (
                    <p className="text-muted-token italic">Generating phonetics coaching…</p>
                  )}
                  {aiCoaching && (
                    <p className="text-secondary-token pt-1">
                      <span className="font-semibold text-accent-token">AI Phonetics Coach: </span>
                      {aiCoaching}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* AI Concierge Chat */}
        <section className="lg:col-span-5 liquid-glass rounded-2xl p-6 flex flex-col h-[620px]">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-black/10 dark:border-amber-200/15">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-5 h-5 text-accent-token" />
              <div>
                <h2 className="font-display text-lg font-semibold text-primary-token">
                  AI Cultural Concierge
                </h2>
                <p className="text-xs text-muted-token">
                  {deepThinking ? 'High Thinking (gemini-4-carbon)' : 'Fast Mode (gemini-4-hydrogen)'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDeepThinking((v) => !v)}
              aria-pressed={deepThinking}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                deepThinking
                  ? 'bg-accent-token'
                  : 'liquid-glass text-secondary-token'
              }`}
            >
              {deepThinking ? 'Thinking: High' : 'Thinking: Fast'}
            </button>
          </div>

          {/* Quick prompts */}
          <div className="flex flex-wrap gap-2 py-3 border-b border-black/5 dark:border-amber-200/10">
            {[
              `Best morning walk in ${selectedCity.id}?`,
              'Oversized Shinkansen luggage rule?',
              'Vegetarian phrases for izakayas?',
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendConciergeMessage(q)}
                className="px-2.5 py-1 rounded-md text-xs liquid-glass text-secondary-token hover:text-primary-token transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-xl p-3.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'ml-6 bg-accent-soft-token border border-[var(--accent)]/30 text-primary-token'
                    : 'mr-4 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 text-secondary-token'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.notice && (
                  <p className="text-[11px] text-muted-token mt-2">{msg.notice}</p>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="mr-4 rounded-xl p-3.5 bg-black/5 dark:bg-black/35 text-xs text-muted-token flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-accent-token" />
                <span>Consulting cultural guide & transit rules…</span>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendConciergeMessage();
            }}
            className="pt-3 border-t border-black/10 dark:border-amber-200/15 flex items-center gap-2"
          >
            <label htmlFor="concierge-input" className="sr-only">
              Ask the AI concierge
            </label>
            <input
              id="concierge-input"
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Ask about ${selectedCity.id} transit, dining, or etiquette…`}
              className="flex-1 rounded-xl px-3.5 py-2.5 text-sm bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token placeholder:text-muted-token focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={chatLoading}
              aria-label="Send message to concierge"
              className="p-2.5 rounded-xl bg-accent-token disabled:opacity-50 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
