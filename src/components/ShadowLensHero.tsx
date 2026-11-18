import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Compass, Eye, EyeOff, MapPin, Sparkles, Volume2 } from 'lucide-react';
import { HERO_IMAGE_URL, type CityGuide, type DistrictLandmark } from '../data/japanData';
import {
  SHADOW_LENS_DEFAULT_RADIUS,
  buildSpotlightMaskGradient,
  clampPointerNormalized,
  computeDepthLayerOffsets,
  dampValue,
  evaluateRevealedLandmarks,
  getCityShadowPalette,
} from '../utils/shadowLens';
import { speakJapanese } from '../utils/speech';

interface ShadowLensHeroProps {
  selectedCity: CityGuide;
  heroImgFailed: boolean;
  onHeroImgError: () => void;
  onOpen3DShrine: () => void;
}

const AMBIENT_EMBERS = [
  { id: 'e1', left: '14%', top: '24%', size: 4, delay: '0s', duration: '7s' },
  { id: 'e2', left: '38%', top: '18%', size: 3, delay: '1.4s', duration: '9s' },
  { id: 'e3', left: '62%', top: '32%', size: 5, delay: '0.6s', duration: '8s' },
  { id: 'e4', left: '78%', top: '22%', size: 3, delay: '2.1s', duration: '10s' },
  { id: 'e5', left: '84%', top: '46%', size: 4, delay: '1.1s', duration: '7.5s' },
  { id: 'e6', left: '26%', top: '42%', size: 3, delay: '2.8s', duration: '8.5s' },
];

export const ShadowLensHero: React.FC<ShadowLensHeroProps> = ({
  selectedCity,
  heroImgFailed,
  onHeroImgError,
  onOpen3DShrine,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState({ width: 820, height: 440 });
  const [fullReveal, setFullReveal] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [lockedLandmarkId, setLockedLandmarkId] = useState<string | null>(null);

  // Target vs damped smooth coordinates (px inside canvas)
  const targetRef = useRef({ px: 540, py: 185, nx: 0.66, ny: 0.42 });
  const currentRef = useRef({ px: 540, py: 185, nx: 0.66, ny: 0.42 });
  const [renderPos, setRenderPos] = useState({ px: 540, py: 185, nx: 0.66, ny: 0.42 });

  const palette = useMemo(() => getCityShadowPalette(selectedCity.id), [selectedCity.id]);
  const stageLandmarks = useMemo(
    () =>
      selectedCity.landmarks.map((lm) => ({
        ...lm,
        yPct: Math.min(44, Math.max(16, Math.round(16 + ((lm.yPct - 15) / 70) * 28))),
      })),
    [selectedCity.landmarks]
  );

  // Reset landmark lock when switching cities and aim lens softly at first landmark
  useEffect(() => {
    setLockedLandmarkId(null);
    const first = stageLandmarks[0];
    if (first) {
      const px = (first.xPct / 100) * bounds.width;
      const py = (first.yPct / 100) * bounds.height;
      targetRef.current = { px, py, nx: first.xPct / 100, ny: first.yPct / 100 };
    }
  }, [selectedCity.id, stageLandmarks, bounds.width, bounds.height]);

  // Observe container dimensions accurately
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setBounds({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateSize);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Frame-rate independent exponential damping loop + gentle idle orbit
  useEffect(() => {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      // Gentle ambient drift when pointer is outside and no specific landmark is locked
      if (!isHovering && !lockedLandmarkId && !reducedMotion && !fullReveal) {
        const t = now * 0.00042;
        const idleNx = 0.5 + Math.cos(t) * 0.24;
        const idleNy = 0.42 + Math.sin(t * 1.35) * 0.14;
        targetRef.current = {
          nx: idleNx,
          ny: idleNy,
          px: idleNx * bounds.width,
          py: idleNy * bounds.height,
        };
      }

      const speed = reducedMotion ? 60 : 12;
      const nextPx = dampValue(currentRef.current.px, targetRef.current.px, speed, dt);
      const nextPy = dampValue(currentRef.current.py, targetRef.current.py, speed, dt);
      const nextNx = nextPx / Math.max(1, bounds.width);
      const nextNy = nextPy / Math.max(1, bounds.height);

      if (
        Math.abs(nextPx - currentRef.current.px) > 0.08 ||
        Math.abs(nextPy - currentRef.current.py) > 0.08
      ) {
        currentRef.current = { px: nextPx, py: nextPy, nx: nextNx, ny: nextNy };
        setRenderPos(currentRef.current);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [bounds.width, bounds.height, isHovering, lockedLandmarkId, fullReveal]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    setIsHovering(true);
    setLockedLandmarkId(null);
    const rect = el.getBoundingClientRect();
    targetRef.current = clampPointerNormalized(e.clientX, e.clientY, rect);
  };

  const focusLandmark = (lm: DistrictLandmark) => {
    setLockedLandmarkId(lm.id);
    const px = (lm.xPct / 100) * bounds.width;
    const py = (lm.yPct / 100) * bounds.height;
    targetRef.current = { px, py, nx: lm.xPct / 100, ny: lm.yPct / 100 };
    speakJapanese(lm.japanese);
  };

  const layerOffsets = computeDepthLayerOffsets(renderPos.nx, renderPos.ny, 1);
  const maskGradient = buildSpotlightMaskGradient(
    renderPos.px,
    renderPos.py,
    SHADOW_LENS_DEFAULT_RADIUS,
    fullReveal
  );
  const evaluatedLandmarks = evaluateRevealedLandmarks(
    stageLandmarks,
    renderPos.px,
    renderPos.py,
    bounds.width,
    bounds.height,
    SHADOW_LENS_DEFAULT_RADIUS,
    fullReveal
  );
  const activeSpotlightLandmark =
    (lockedLandmarkId
      ? evaluatedLandmarks.find((e) => e.landmark.id === lockedLandmarkId)
      : evaluatedLandmarks.find((e) => e.visibility > 0.25)) ?? null;

  const mediaUrl = selectedCity.imageUrl || HERO_IMAGE_URL;

  const renderMediaBackdrop = (brightMode: boolean) => {
    const filterClass = brightMode
      ? 'brightness-[1.08] contrast-[1.08] saturate-[1.18]'
      : 'brightness-[0.34] contrast-[1.12] saturate-[0.65]';

    if (!heroImgFailed) {
      return (
        <img
          src={mediaUrl}
          alt={brightMode ? '' : `${selectedCity.id} ${selectedCity.district}`}
          referrerPolicy="no-referrer"
          onError={onHeroImgError}
          className={`w-full h-full object-cover ${filterClass}`}
        />
      );
    }
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#06070d] via-[#1b0e18] to-[#080a12] flex items-center justify-center">
        <Compass className="w-12 h-12 text-amber-300/60" />
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      data-testid="shadow-lens-hero"
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setIsHovering(true)}
      onPointerLeave={() => setIsHovering(false)}
      className="lg:col-span-8 relative min-h-[400px] sm:min-h-[460px] flex flex-col justify-between bg-[#06070c] overflow-hidden select-none group cursor-crosshair"
    >
      {/* LAYER 0 (Base Shadowed Backplane + Crimson Moon + Silhouette Horizon) */}
      <div
        className="absolute inset-[-24px] will-change-transform"
        style={{
          transform: `translate3d(${layerOffsets.backdropX.toFixed(1)}px, ${layerOffsets.backdropY.toFixed(1)}px, 0) scale(1.06)`,
        }}
      >
        {renderMediaBackdrop(false)}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 74% 24%, rgba(18, 6, 14, 0.25) 0%, rgba(6, 7, 13, 0.78) 72%, rgba(5, 6, 10, 0.92) 100%)',
          }}
        />
      </div>

      {/* Crimson Full Moon Orb + Silhouette Torii/Pagoda Roofline (Behind Monumental Title) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none will-change-transform z-0"
        style={{
          transform: `translate3d(${layerOffsets.moonX.toFixed(1)}px, ${layerOffsets.moonY.toFixed(1)}px, 0)`,
        }}
      >
        <div
          className="absolute right-[10%] sm:right-[14%] top-[10%] w-28 h-28 sm:w-36 sm:h-36 rounded-full opacity-85"
          style={{
            background: `radial-gradient(circle at 38% 36%, #ffe4e6 0%, ${palette.moonTint} 54%, transparent 100%)`,
            boxShadow: `0 0 70px 16px ${palette.moonTint}`,
          }}
        />
        <svg
          viewBox="0 0 800 300"
          preserveAspectRatio="xMidYMax slice"
          className="absolute inset-x-0 bottom-[16%] w-full h-[64%] opacity-75"
        >
          <path
            d="M0,300 L0,210 Q140,175 260,205 T510,188 Q650,155 800,198 L800,300 Z"
            fill="#0a0910"
          />
          {/* Subtle distant Torii / Pagoda silhouette center-right */}
          <g transform="translate(520, 128)" fill="#0d0b14">
            <rect x="0" y="0" width="96" height="8" rx="3" />
            <rect x="12" y="16" width="72" height="5" />
            <rect x="20" y="6" width="7" height="58" />
            <rect x="69" y="6" width="7" height="58" />
          </g>
        </svg>
      </div>

      {/* Ambient Floating Embers */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {AMBIENT_EMBERS.map((ember) => (
          <span
            key={ember.id}
            className="absolute rounded-full animate-pulse opacity-60"
            style={{
              left: ember.left,
              top: ember.top,
              width: `${ember.size}px`,
              height: `${ember.size}px`,
              backgroundColor: palette.emberColor,
              boxShadow: `0 0 10px ${palette.emberColor}`,
              animationDelay: ember.delay,
              animationDuration: ember.duration,
            }}
          />
        ))}
      </div>

      {/* LAYER 1 (Sandwiched Monumental Display Title — Behind Foreground Hills) */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-[14%] sm:top-[15%] flex flex-col items-center justify-center pointer-events-none z-10 will-change-transform px-4"
        style={{
          transform: `translate3d(${layerOffsets.typographyX.toFixed(1)}px, ${layerOffsets.typographyY.toFixed(1)}px, 0)`,
        }}
      >
        <span className="font-mono text-[10px] sm:text-xs tracking-[0.42em] text-amber-200/50 uppercase mb-1">
          {palette.kanjiMark} · {palette.romajiSub}
        </span>
        <span
          className="font-display font-extrabold uppercase tracking-[0.18em] text-center leading-none text-white/[0.20] select-none"
          style={{ fontSize: 'clamp(3.4rem, 9vw, 7rem)' }}
        >
          {selectedCity.id}
        </span>
      </div>

      {/* LAYER 2 (Foreground Silhouetted Hills + Red Spider-Lilies / Momiji Passing IN FRONT of Title) */}
      <div
        aria-hidden="true"
        className="absolute inset-x-[-28px] bottom-[-18px] h-[60%] pointer-events-none z-20 will-change-transform"
        style={{
          transform: `translate3d(${layerOffsets.foregroundX.toFixed(1)}px, ${layerOffsets.foregroundY.toFixed(1)}px, 0)`,
        }}
      >
        <svg
          viewBox="0 0 1200 320"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <path
            d="M0,320 L0,185 Q165,112 320,178 Q475,232 645,152 Q815,82 985,162 Q1100,210 1200,140 L1200,320 Z"
            fill="#07080d"
          />
          <path
            d="M0,320 L0,235 Q240,185 450,248 T910,220 Q1080,195 1200,236 L1200,320 Z"
            fill="#050609"
          />
          {/* Foreground Crimson Maple / Spider-Lily Stems Silhouette */}
          <g stroke="#1b0a10" strokeWidth="2.5" fill="none" opacity="0.92">
            <path d="M120,285 Q138,205 162,135" />
            <path d="M158,295 Q178,225 210,164" />
            <path d="M1045,295 Q1025,210 995,132" />
          </g>
          <g fill={palette.floraAccent} opacity="0.78">
            <circle cx="162" cy="132" r="5.5" />
            <circle cx="150" cy="124" r="3.2" />
            <circle cx="174" cy="126" r="3.2" />
            <circle cx="210" cy="162" r="4.8" />
            <circle cx="995" cy="130" r="5.5" />
            <circle cx="983" cy="122" r="3.2" />
            <circle cx="1007" cy="124" r="3.5" />
          </g>
        </svg>
      </div>

      {/* LAYER 3 (Revealed Illuminated Layer Clipped by Cursor Radial Spotlight Mask) */}
      <div
        data-testid="shadow-lens-revealed-layer"
        className="absolute inset-0 pointer-events-none z-30"
        style={{
          WebkitMaskImage: maskGradient,
          maskImage: maskGradient,
          transition: fullReveal
            ? '-webkit-mask-image 350ms ease, mask-image 350ms ease'
            : undefined,
        }}
      >
        {/* Bright Photographic Scene Synchronized to Same Depth Offset */}
        <div
          className="absolute inset-[-24px] will-change-transform"
          style={{
            transform: `translate3d(${layerOffsets.backdropX.toFixed(1)}px, ${layerOffsets.backdropY.toFixed(1)}px, 0) scale(1.06)`,
          }}
        >
          {renderMediaBackdrop(true)}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-amber-500/10" />
        </div>

        {/* Illuminated Sandwiched Letters */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[14%] sm:top-[15%] flex flex-col items-center justify-center will-change-transform px-4"
          style={{
            transform: `translate3d(${layerOffsets.typographyX.toFixed(1)}px, ${layerOffsets.typographyY.toFixed(1)}px, 0)`,
          }}
        >
          <span className="font-mono text-[10px] sm:text-xs tracking-[0.42em] text-amber-300 uppercase mb-1 drop-shadow">
            {palette.kanjiMark} · {palette.romajiSub}
          </span>
          <span
            className="font-display font-extrabold uppercase tracking-[0.18em] text-center leading-none text-white/85 drop-shadow-[0_6px_28px_rgba(246,201,69,0.35)]"
            style={{ fontSize: 'clamp(3.4rem, 9vw, 7rem)' }}
          >
            {selectedCity.id}
          </span>
        </div>

        {/* Illuminated Landmark Pins Kept Strictly in Upper Visual Stage (16%..44%) Above Editorial Headline */}
        {evaluatedLandmarks.map(({ landmark, visibility }) => {
          const isActivePin = activeSpotlightLandmark?.landmark.id === landmark.id;
          const showLabelCard = fullReveal ? isActivePin : visibility > 0.38;
          return (
            <div
              key={landmark.id}
              style={{
                left: `${landmark.xPct}%`,
                top: `${landmark.yPct}%`,
                opacity: fullReveal ? (isActivePin ? 1 : 0.72) : Math.max(0.25, visibility),
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150"
            >
              <div className="relative flex flex-col items-center">
                <span
                  className={`rounded-full bg-amber-300 border-2 border-black shadow-[0_0_16px_rgba(246,201,69,0.95)] ${
                    isActivePin ? 'w-4 h-4 ring-4 ring-amber-300/35' : 'w-3 h-3'
                  }`}
                />
                {showLabelCard && (
                  <div className="mt-1.5 px-2.5 py-1 rounded-md bg-black/85 border border-amber-300/50 text-left whitespace-nowrap shadow-xl">
                    <p className="text-[10px] font-mono text-amber-300 tracking-wide">
                      {landmark.japanese} ·{' '}
                      {landmark.estimatedJpy > 0
                        ? `¥${landmark.estimatedJpy.toLocaleString()}`
                        : 'Free Entry'}
                    </p>
                    <p className="text-xs font-semibold text-white">{landmark.name}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* LAYER 4 (Dual-Ring HUD Spotlight Reticle) */}
      {!fullReveal && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200/45 shadow-[0_0_40px_rgba(246,201,69,0.16)] flex items-center justify-center"
          style={{
            left: `${renderPos.px}px`,
            top: `${renderPos.py}px`,
            width: `${SHADOW_LENS_DEFAULT_RADIUS * 1.9}px`,
            height: `${SHADOW_LENS_DEFAULT_RADIUS * 1.9}px`,
          }}
        >
          <div className="w-[78%] h-[78%] rounded-full border border-dashed border-amber-300/30" />
          <div className="absolute w-2.5 h-2.5 rounded-full bg-amber-300/90 shadow-[0_0_10px_rgba(246,201,69,0.9)]" />
          <span className="absolute -bottom-5 px-2 py-0.5 text-[10px] font-mono tracking-widest text-amber-200/85 bg-black/65 rounded border border-amber-200/20">
            {Math.round(renderPos.nx * 100)}°N · {Math.round(renderPos.ny * 100)}°E
          </span>
        </div>
      )}

      {/* TOP HUD CHROME: City Coordinates + Mode Switch */}
      <div className="relative z-40 flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 bg-gradient-to-b from-black/75 via-black/30 to-transparent">
        <div className="flex items-center gap-2.5 text-xs font-mono text-amber-200/90">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>
            {selectedCity.japaneseName} · {selectedCity.regionLabel} Region
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFullReveal((v) => !v)}
            aria-pressed={fullReveal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-black/65 hover:bg-black/80 text-amber-100 border border-amber-200/30 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {fullReveal ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-300" />
                Shadow Lens Mode
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-amber-300" />
                Full Illuminate
              </>
            )}
          </button>
        </div>
      </div>

      {/* BOTTOM EDITORIAL COPY + INTERACTIVE LANDMARK FOCUS STRIP */}
      <div className="relative z-40 mt-auto pt-24 sm:pt-28 p-5 sm:p-6 bg-gradient-to-t from-black/95 via-black/72 to-transparent flex flex-col justify-end gap-3.5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="max-w-xl">
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-white leading-tight">
              {selectedCity.headline}
            </h1>
            <p className="text-xs sm:text-sm text-amber-100/90 mt-2 leading-relaxed">
              {activeSpotlightLandmark
                ? `${activeSpotlightLandmark.landmark.name} (${activeSpotlightLandmark.landmark.japanese}): ${activeSpotlightLandmark.landmark.note}`
                : selectedCity.culturalInsight}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpen3DShrine}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-end"
          >
            <span>Enter 3D Shrine</span>
          </button>
        </div>

        {/* Interactive Landmark Reticle Quick-Focus Strip */}
        <div
          className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/15"
          role="group"
          aria-label="Spotlight Landmarks"
        >
          <span className="text-[11px] font-mono text-amber-200/75 mr-1">
            Focus:
          </span>
          {stageLandmarks.map((lm) => {
            const focused = activeSpotlightLandmark?.landmark.id === lm.id;
            return (
              <button
                key={lm.id}
                type="button"
                onClick={() => focusLandmark(lm)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  focused
                    ? 'bg-amber-400/25 text-amber-200 border border-amber-300/60'
                    : 'bg-black/55 text-white/85 border border-white/15 hover:border-amber-300/45'
                }`}
              >
                <MapPin className="w-3 h-3 text-amber-300 shrink-0" />
                <span>{lm.name}</span>
                <Volume2 className="w-2.5 h-2.5 opacity-60 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
