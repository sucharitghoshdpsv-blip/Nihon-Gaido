import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Download,
  Film,
  ImagePlus,
  Loader2,
  Play,
  Sparkles,
  Upload,
} from 'lucide-react';
import { type CityGuide } from '../data/japanData';
import {
  EXPLORE_VIDEO_PRESETS,
  getExplorePresetById,
  type VideoAspectRatio,
} from '../utils/videoStudio';

interface ExploreVideoStudioProps {
  selectedCity: CityGuide;
  generatedVideos: Record<string, string>;
  onApplyVideoToExplore: (targetKey: 'hero' | CityGuide['id'], videoDataUrl: string) => void;
  onOpen3DShrine: () => void;
}

export const ExploreVideoStudio: React.FC<ExploreVideoStudioProps> = ({
  selectedCity,
  generatedVideos,
  onApplyVideoToExplore,
  onOpen3DShrine,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sourceMode, setSourceMode] = useState<'explore' | 'upload'>('explore');
  const [selectedPresetId, setSelectedPresetId] = useState<
    'hero' | CityGuide['id']
  >(selectedCity.id);
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string>('');
  const [prompt, setPrompt] = useState<string>(
    () =>
      getExplorePresetById(selectedCity.id)?.defaultPrompt ??
      EXPLORE_VIDEO_PRESETS[0].defaultPrompt
  );

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastGeneratedUrl, setLastGeneratedUrl] = useState<string | null>(null);
  const [lastGeneratedAspect, setLastGeneratedAspect] = useState<VideoAspectRatio>('16:9');
  const [appliedToast, setAppliedToast] = useState<string | null>(null);

  useEffect(() => {
    if (sourceMode === 'explore') {
      const preset = getExplorePresetById(selectedCity.id);
      if (preset) {
        setSelectedPresetId(preset.id);
        setPrompt(preset.defaultPrompt);
      }
    }
  }, [selectedCity.id, sourceMode]);

  const activePreset = getExplorePresetById(selectedPresetId) ?? EXPLORE_VIDEO_PRESETS[0];

  const handleSelectPreset = (presetId: 'hero' | CityGuide['id']) => {
    setSourceMode('explore');
    setSelectedPresetId(presetId);
    const preset = getExplorePresetById(presetId);
    if (preset) {
      setPrompt(preset.defaultPrompt);
    }
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please upload a JPG, PNG, or WebP photograph.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image size must be 10 MB or smaller.');
      return;
    }
    setError(null);
    setUploadedName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedPreviewUrl(reader.result);
        setSourceMode('upload');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateVideo = async () => {
    setError(null);
    setAppliedToast(null);

    if (sourceMode === 'upload' && !uploadedPreviewUrl) {
      setError('Upload a photo first or switch to an Explore destination image.');
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/gemini/animate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: sourceMode === 'explore' ? selectedPresetId : undefined,
          imageDataUrl: sourceMode === 'upload' ? uploadedPreviewUrl : undefined,
          prompt,
          aspectRatio,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to generate 3-second video clip.');
      }
      if (typeof data.videoDataUrl === 'string' && data.videoDataUrl) {
        setLastGeneratedUrl(data.videoDataUrl);
        setLastGeneratedAspect(data.aspectRatio === '9:16' ? '9:16' : '16:9');
        if (sourceMode === 'explore') {
          onApplyVideoToExplore(selectedPresetId, data.videoDataUrl);
          setAppliedToast(`Applied 3s MP4 loop to ${selectedPresetId} card.`);
        }
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to reach 3-second video generator.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const previewVideoUrl =
    lastGeneratedUrl ??
    (sourceMode === 'explore' ? generatedVideos[selectedPresetId] ?? null : null);

  return (
    <section
      aria-label="3-Second Motion Studio & Interactive 3D Diorama"
      className="liquid-glass rounded-2xl p-6 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-accent-token" />
            <h2 className="font-display text-xl font-semibold text-primary-token">
              3-Second Destination Motion Studio
            </h2>
          </div>
          <p className="text-xs text-muted-token mt-1">
            Destination visuals loop continuously in 3-second motion cycles. Animate any city card or upload your own Japan photo into a 3s MP4 clip (16:9 or 9:16).
          </p>
        </div>

        <button
          type="button"
          onClick={onOpen3DShrine}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold liquid-glass-elevated text-accent-token hover:border-accent-token transition-colors whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          Open Interactive 3D Kyoto Shrine
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-7 space-y-4">
          {/* Source Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSourceMode('explore')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                sourceMode === 'explore'
                  ? 'bg-accent-token'
                  : 'liquid-glass text-secondary-token hover:text-primary-token'
              }`}
            >
              Explore Destination Preset
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                sourceMode === 'upload'
                  ? 'bg-accent-token'
                  : 'liquid-glass text-secondary-token hover:text-primary-token'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              {uploadedName ? `Uploaded: ${uploadedName.slice(0, 18)}` : 'Upload Your Photo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              aria-label="Upload photo to animate into 3-second video"
              className="sr-only"
            />
          </div>

          {/* Preset Selector Chips */}
          {sourceMode === 'explore' && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Explore Image Presets">
              {EXPLORE_VIDEO_PRESETS.map((preset) => {
                const active = selectedPresetId === preset.id;
                const hasGenerated = Boolean(generatedVideos[preset.id]);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-accent-token'
                        : 'liquid-glass text-secondary-token hover:text-primary-token'
                    }`}
                  >
                    {hasGenerated && <Check className="w-3 h-3" />}
                    {preset.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Aspect Ratio + Duration */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-token">Aspect Ratio:</span>
              {(['16:9', '9:16'] as const).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio)}
                  aria-pressed={aspectRatio === ratio}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                    aspectRatio === ratio
                      ? 'bg-accent-token'
                      : 'liquid-glass text-secondary-token hover:text-primary-token'
                  }`}
                >
                  {ratio} {ratio === '16:9' ? '(Landscape)' : '(Portrait)'}
                </button>
              ))}
            </div>
            <span className="text-xs font-mono text-muted-token">
              Duration: 3s · gemini-omni-1.2-flash
            </span>
          </div>

          {/* Motion Prompt */}
          <div>
            <label
              htmlFor="video-motion-prompt"
              className="block text-xs font-medium text-secondary-token mb-1.5"
            >
              3-Second Motion Direction
            </label>
            <textarea
              id="video-motion-prompt"
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe how lighting, camera motion, lanterns, or snow should move in this 3-second clip..."
              className="w-full rounded-xl p-3 text-xs bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/20 text-primary-token placeholder:text-muted-token focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerateVideo}
              disabled={generating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-accent-token transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rendering 3s MP4…
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Generate 3s Video
                </>
              )}
            </button>

            {lastGeneratedUrl && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onApplyVideoToExplore(selectedCity.id, lastGeneratedUrl);
                    setAppliedToast(`Applied 3s clip to ${selectedCity.id} card.`);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-medium liquid-glass text-primary-token hover:border-accent-token"
                >
                  Apply to {selectedCity.id} Card
                </button>
                <a
                  href={lastGeneratedUrl}
                  download={`tabiguide-${selectedPresetId}-3s.mp4`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium liquid-glass text-accent-token hover:border-accent-token"
                >
                  <Download className="w-3.5 h-3.5" />
                  Save MP4
                </a>
              </>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl p-3 bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {appliedToast && (
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300">
              <Check className="w-4 h-4 shrink-0" />
              <span>{appliedToast}</span>
            </div>
          )}
        </div>

        {/* Live 3s Preview Column */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center rounded-2xl p-4 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15">
          <div
            className={`w-full overflow-hidden rounded-xl bg-slate-950 relative ${
              (previewVideoUrl ? lastGeneratedAspect : aspectRatio) === '9:16'
                ? 'max-w-[210px] aspect-[9/16]'
                : 'aspect-video'
            }`}
          >
            {previewVideoUrl ? (
              <video
                key={previewVideoUrl}
                src={previewVideoUrl}
                autoPlay
                loop
                muted
                playsInline
                controls
                className="w-full h-full object-cover"
              />
            ) : sourceMode === 'upload' && uploadedPreviewUrl ? (
              <img
                src={uploadedPreviewUrl}
                alt="Uploaded travel scene preview"
                className="w-full h-full object-cover"
              />
            ) : sourceMode === 'explore' ? (
              <img
                src={activePreset.imageUrl}
                alt={activePreset.label}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-muted-token">
                <ImagePlus className="w-8 h-8 mb-2 text-accent-token" />
                <p className="text-xs">Upload a JPEG/PNG/WebP photo or pick an Explore city</p>
              </div>
            )}

            <div className="pointer-events-none absolute top-2 left-2 rounded-md px-2 py-0.5 bg-black/70 text-[11px] font-mono text-amber-200">
              {previewVideoUrl ? '3s AI Video' : 'Static Reference Photo'}
            </div>
          </div>
          <p className="text-[11px] text-muted-token mt-2.5 text-center">
            {previewVideoUrl
              ? 'Playing generated 3-second MP4 loop.'
              : `Static source photo: ${
                  sourceMode === 'upload' ? uploadedName || 'your photo' : activePreset.label
                }. Click Generate 3s Video to render an MP4 clip.`}
          </p>
        </div>
      </div>
    </section>
  );
};
