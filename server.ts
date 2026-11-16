import 'dotenv/config';
import fs from 'fs/promises';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  normalizeGoogleWeatherPayload,
  normalizeOpenMeteoPayload,
} from './src/utils/weather.ts';
import {
  extractVideoFromInteraction,
  getExplorePresetById,
  isBillingOrQuotaMessage,
  normalizeVideoAspectRatio,
  parseImageDataUrl,
  resolveExploreAssetFilename,
} from './src/utils/videoStudio.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '15mb' }));

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateWithCarbonThinking(
  ai: GoogleGenAI,
  params: {
    contents: string;
    systemInstruction: string;
    responseMimeType?: string;
    responseSchema?: unknown;
    useDeepThinking?: boolean;
  }
) {
  const useCarbon = params.useDeepThinking !== false;
  const primaryModel = useCarbon ? 'gemini-4-carbon' : 'gemini-4-hydrogen';

  const buildConfig = (level: ThinkingLevel) => {
    const cfg: Record<string, unknown> = {
      systemInstruction: params.systemInstruction,
      thinkingConfig: { thinkingLevel: level },
    };
    if (params.responseMimeType) {
      cfg.responseMimeType = params.responseMimeType;
    }
    if (params.responseSchema) {
      cfg.responseSchema = params.responseSchema;
    }
    return cfg;
  };

  try {
    const response = await ai.models.generateContent({
      model: primaryModel,
      contents: params.contents,
      config: buildConfig(ThinkingLevel.HIGH),
    });
    return {
      text: response.text ?? '',
      modelUsed: primaryModel,
      fallbackNotice: null as string | null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isPaidOrQuotaIssue =
      useCarbon &&
      (msg.includes('403') ||
        msg.includes('429') ||
        msg.includes('PERMISSION_DENIED') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('billing') ||
        msg.includes('quota') ||
        msg.includes('paid'));

    if (isPaidOrQuotaIssue) {
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: params.contents,
        config: buildConfig(ThinkingLevel.HIGH),
      });
      return {
        text: fallbackResponse.text ?? '',
        modelUsed: 'gemini-4-hydrogen',
        fallbackNotice:
          'gemini-4-carbon requires a billing-enabled key in Settings > Secrets; served via gemini-4-hydrogen with high thinking.',
      };
    }
    throw err;
  }
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'TabiGuide API' });
});

// Client Maps key bootstrap fallback when runtime secrets inject GOOGLE_MAPS_API_KEY without VITE_ prefix
app.get('/api/maps/config', (_req, res) => {
  const raw = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
  const apiKey = raw === 'MY_GOOGLE_MAPS_API_KEY' ? '' : raw;
  res.json({ apiKey });
});

// 3-Day City Weather Forecast (Google Maps Platform Weather API proxy + Open-Meteo fallback)
app.get('/api/weather/forecast', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const city = typeof req.query.city === 'string' && req.query.city.trim() ? req.query.city.trim() : 'Tokyo';

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    res.status(400).json({ error: 'Valid latitude and longitude coordinates are required.' });
    return;
  }

  const rawKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
  const mapsApiKey = rawKey && rawKey !== 'MY_GOOGLE_MAPS_API_KEY' ? rawKey : '';
  let gmpQuotaExceeded = false;

  if (mapsApiKey) {
    try {
      const forecastUrl = new URL('https://weather.googleapis.com/v1/forecast/days:lookup');
      forecastUrl.searchParams.set('key', mapsApiKey);
      forecastUrl.searchParams.set('location.latitude', String(lat));
      forecastUrl.searchParams.set('location.longitude', String(lng));
      forecastUrl.searchParams.set('days', '3');
      forecastUrl.searchParams.set('pageSize', '3');
      forecastUrl.searchParams.set('unitsSystem', 'METRIC');
      forecastUrl.searchParams.set('languageCode', 'en');

      const currentUrl = new URL('https://weather.googleapis.com/v1/currentConditions:lookup');
      currentUrl.searchParams.set('key', mapsApiKey);
      currentUrl.searchParams.set('location.latitude', String(lat));
      currentUrl.searchParams.set('location.longitude', String(lng));
      currentUrl.searchParams.set('unitsSystem', 'METRIC');
      currentUrl.searchParams.set('languageCode', 'en');

      const gmpHeaders = {
        'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
      };

      const [forecastRes, currentRes] = await Promise.all([
        fetch(forecastUrl.toString(), { method: 'GET', headers: gmpHeaders }),
        fetch(currentUrl.toString(), { method: 'GET', headers: gmpHeaders }),
      ]);

      const forecastJson = (await forecastRes.json().catch(() => null)) as Record<string, unknown> | null;
      const forecastErr = (forecastJson?.error && typeof forecastJson.error === 'object'
        ? forecastJson.error
        : null) as Record<string, unknown> | null;

      if (forecastRes.status === 429 || forecastErr?.status === 'RESOURCE_EXHAUSTED') {
        gmpQuotaExceeded = true;
      }

      if (
        forecastRes.ok &&
        forecastJson &&
        Array.isArray(forecastJson.forecastDays) &&
        forecastJson.forecastDays.length > 0
      ) {
        const currentJson = currentRes.ok ? await currentRes.json().catch(() => null) : null;
        const normalized = normalizeGoogleWeatherPayload(city, forecastJson, currentJson);
        res.json({ ...normalized, gmpQuotaExceeded: false });
        return;
      }
    } catch {
      // Fall through to meteorological fallback if Google Weather API is unreachable or disabled
    }
  }

  try {
    const meteoUrl = new URL('https://api.open-meteo.com/v1/forecast');
    meteoUrl.searchParams.set('latitude', String(lat));
    meteoUrl.searchParams.set('longitude', String(lng));
    meteoUrl.searchParams.set(
      'current',
      'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code'
    );
    meteoUrl.searchParams.set(
      'daily',
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,relative_humidity_2m_mean'
    );
    meteoUrl.searchParams.set('timezone', 'Asia/Tokyo');
    meteoUrl.searchParams.set('forecast_days', '3');

    const meteoRes = await fetch(meteoUrl.toString());
    if (!meteoRes.ok) {
      throw new Error(`Weather upstream returned ${meteoRes.status}`);
    }
    const meteoJson = await meteoRes.json();
    const summary = normalizeOpenMeteoPayload(city, meteoJson);
    res.json({ ...summary, gmpQuotaExceeded });
  } catch (err: unknown) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Unable to fetch 3-day weather forecast right now.',
      gmpQuotaExceeded,
    });
  }
});

// Nuance-aware Japanese <-> English Translator (gemini-4-carbon + ThinkingLevel.HIGH)
app.post('/api/gemini/translate', async (req, res) => {
  try {
    const { text, direction, register, cityContext } = req.body as {
      text?: string;
      direction?: 'en-to-ja' | 'ja-to-en';
      register?: 'casual' | 'polite' | 'keigo' | 'dining';
      cityContext?: string;
    };

    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Please enter text to translate.' });
      return;
    }

    const ai = getGeminiClient();
    const prompt = `Translate the following text (${direction === 'ja-to-en' ? 'Japanese to English' : 'English to Japanese'}) with social register "${register || 'polite'}" in the context of visiting ${cityContext || 'Tokyo, Japan'}.

Text: """${text.trim().slice(0, 800)}"""`;

    const result = await generateWithCarbonThinking(ai, {
      contents: prompt,
      useDeepThinking: true,
      systemInstruction:
        'You are a bilingual Japanese cultural linguist. Provide accurate translations with Furigana/Romaji, literal breakdown, social nuance explanation, and an alternative phrasing. Keep responses concise and practical for travelers.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          primaryTranslation: { type: Type.STRING, description: 'Main translated phrase.' },
          romaji: { type: Type.STRING, description: 'Romaji pronunciation guide.' },
          kanaReading: { type: Type.STRING, description: 'Hiragana/Katakana reading.' },
          literalMeaning: { type: Type.STRING, description: 'Word-for-word literal meaning.' },
          nuanceNote: {
            type: Type.STRING,
            description: 'Cultural etiquette, politeness register, and regional nuance.',
          },
          alternativePhrase: {
            type: Type.STRING,
            description: 'A natural alternative phrasing and when to use it.',
          },
        },
        required: [
          'primaryTranslation',
          'romaji',
          'kanaReading',
          'literalMeaning',
          'nuanceNote',
          'alternativePhrase',
        ],
      },
    });

    const parsed = JSON.parse((result.text || '{}').trim());
    res.json({
      ...parsed,
      modelUsed: result.modelUsed,
      fallbackNotice: result.fallbackNotice,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Translation request failed.';
    res.status(500).json({ error: message });
  }
});

// AI Concierge Chat (supports Deep Thinking mode with gemini-4-carbon + ThinkingLevel.HIGH)
app.post('/api/gemini/concierge', async (req, res) => {
  try {
    const { message, city, deepThinking, history } = req.body as {
      message?: string;
      city?: string;
      deepThinking?: boolean;
      history?: Array<{ role: 'user' | 'assistant'; text: string }>;
    };

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Message cannot be empty.' });
      return;
    }

    const ai = getGeminiClient();
    const recentHistory = (history || [])
      .slice(-6)
      .map((h) => `${h.role === 'user' ? 'Traveler' : 'TabiGuide'}: ${h.text}`)
      .join('\n');

    const prompt = `Current city context: ${city || 'Tokyo'}
${recentHistory ? `Recent conversation:\n${recentHistory}\n` : ''}
Traveler question: ${message.trim().slice(0, 1200)}`;

    const result = await generateWithCarbonThinking(ai, {
      contents: prompt,
      useDeepThinking: deepThinking !== false,
      systemInstruction:
        'You are TabiGuide, an expert Japanese cultural concierge, rail navigator, and language mentor. Give specific, actionable advice grounded in real Japanese customs, IC card/Shinkansen rules, dining etiquette, and clear phrasing. Keep answers well-structured in under 220 words.',
    });

    res.json({
      reply: result.text,
      modelUsed: result.modelUsed,
      fallbackNotice: result.fallbackNotice,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Concierge request failed.';
    res.status(500).json({ error: message });
  }
});

// AI Personalized Itinerary Generator (gemini-4-carbon + ThinkingLevel.HIGH)
app.post('/api/gemini/itinerary', async (req, res) => {
  try {
    const { days, interests, regions, pace, dailyBudgetJpy } = req.body as {
      days?: number;
      interests?: string[];
      regions?: string[];
      pace?: 'relaxed' | 'balanced' | 'packed';
      dailyBudgetJpy?: number;
    };

    const safeDays = Math.min(10, Math.max(1, Number(days) || 3));
    const safeRegions = Array.isArray(regions) && regions.length > 0 ? regions : ['Tokyo', 'Kyoto'];
    const safeInterests =
      Array.isArray(interests) && interests.length > 0 ? interests : ['Culinary', 'Temples & Heritage'];

    const ai = getGeminiClient();
    const prompt = `Design a realistic ${safeDays}-day Japan itinerary.
Regions: ${safeRegions.join(', ')}
Interests: ${safeInterests.join(', ')}
Pace: ${pace || 'balanced'}
Target daily budget: ¥${Number(dailyBudgetJpy) || 18000} JPY.
Include 3 stops per day with realistic JPY costs, transit instructions, and one local etiquette tip per day.`;

    const result = await generateWithCarbonThinking(ai, {
      contents: prompt,
      useDeepThinking: true,
      systemInstruction:
        'You are a master Japanese travel planner. Order stops geographically to minimize transit backtracking. Provide accurate JPY estimates.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          tripTitle: { type: Type.STRING },
          summary: { type: Type.STRING },
          days: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                dayNumber: { type: Type.INTEGER },
                region: { type: Type.STRING },
                theme: { type: Type.STRING },
                etiquetteTip: { type: Type.STRING },
                stops: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      time: { type: Type.STRING },
                      name: { type: Type.STRING },
                      area: { type: Type.STRING },
                      transitNote: { type: Type.STRING },
                      estimatedJpy: { type: Type.INTEGER },
                      description: { type: Type.STRING },
                    },
                    required: ['time', 'name', 'area', 'transitNote', 'estimatedJpy', 'description'],
                  },
                },
              },
              required: ['dayNumber', 'region', 'theme', 'etiquetteTip', 'stops'],
            },
          },
        },
        required: ['tripTitle', 'summary', 'days'],
      },
    });

    const parsed = JSON.parse((result.text || '{}').trim());
    res.json({
      ...parsed,
      modelUsed: result.modelUsed,
      fallbackNotice: result.fallbackNotice,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Itinerary generation failed.';
    res.status(500).json({ error: message });
  }
});

// Pronunciation & Grammar Coaching (gemini-4-carbon + ThinkingLevel.HIGH)
app.post('/api/gemini/pronunciation', async (req, res) => {
  try {
    const { expectedJapanese, expectedRomaji, spokenTranscript } = req.body as {
      expectedJapanese?: string;
      expectedRomaji?: string;
      spokenTranscript?: string;
    };

    if (!expectedJapanese || !spokenTranscript) {
      res.status(400).json({ error: 'Both expected phrase and spoken transcript are required.' });
      return;
    }

    const ai = getGeminiClient();
    const prompt = `A Japanese learner tried to say "${expectedJapanese}" (${expectedRomaji || ''}).
Speech recognition heard: "${spokenTranscript}".
Provide concise coaching on pitch accent, vowel length, or consonant articulation in 2-3 sentences.`;

    const result = await generateWithCarbonThinking(ai, {
      contents: prompt,
      useDeepThinking: true,
      systemInstruction:
        'You are a patient Japanese phonetics coach. Focus on practical mora timing, pitch accent, and encouragement.',
    });

    res.json({
      coaching: result.text,
      modelUsed: result.modelUsed,
      fallbackNotice: result.fallbackNotice,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Pronunciation coaching failed.';
    res.status(500).json({ error: message });
  }
});

// Animate Explore Destination or Uploaded Image into 3-Second Video (gemini-omni-1.2-flash Interactions API)
app.post('/api/gemini/animate-video', async (req, res) => {
  try {
    const { assetId, imageDataUrl, prompt, aspectRatio } = req.body as {
      assetId?: string;
      imageDataUrl?: string;
      prompt?: string;
      aspectRatio?: string;
    };

    const safeAspect = normalizeVideoAspectRatio(aspectRatio);
    let imageBase64 = '';
    let imageMimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg';
    let defaultPrompt =
      'Smooth 3-second cinematic travel motion bringing subtle lantern glow, drifting mist, and depth parallax to the Japanese scene.';

    if (typeof imageDataUrl === 'string' && imageDataUrl.trim()) {
      const parsed = parseImageDataUrl(imageDataUrl);
      imageBase64 = parsed.base64Data;
      imageMimeType = parsed.mimeType;
    } else if (typeof assetId === 'string' && assetId.trim()) {
      const safeFilename = resolveExploreAssetFilename(assetId);
      if (!safeFilename) {
        res.status(400).json({ error: 'Unknown Explore destination image preset.' });
        return;
      }
      const preset = getExplorePresetById(assetId);
      if (preset) {
        defaultPrompt = preset.defaultPrompt;
      }
      const imagePath = path.resolve(__dirname, 'public', 'images', safeFilename);
      const buffer = await fs.readFile(imagePath);
      imageBase64 = buffer.toString('base64');
      imageMimeType = safeFilename.toLowerCase().endsWith('.png')
        ? 'image/png'
        : safeFilename.toLowerCase().endsWith('.webp')
          ? 'image/webp'
          : 'image/jpeg';
    } else {
      res.status(400).json({ error: 'Choose an Explore image or upload a photo first.' });
      return;
    }

    const motionPrompt =
      typeof prompt === 'string' && prompt.trim()
        ? prompt.trim().slice(0, 600)
        : defaultPrompt;

    const ai = getGeminiClient();
    const interaction = await ai.interactions.create(
      {
        model: 'gemini-omni-1.2-flash',
        input: [
          {
            type: 'image',
            mime_type: imageMimeType,
            data: imageBase64,
          },
          {
            type: 'text',
            text: motionPrompt,
          },
        ],
        background: false,
        store: false,
        stream: false,
        response_format: {
          type: 'video',
          aspect_ratio: safeAspect,
          duration: '3s',
        },
      },
      { timeout: 300000 }
    );

    const extracted = extractVideoFromInteraction(interaction);
    if (!extracted) {
      res.status(502).json({
        error: 'Gemini Omni Flash completed without returning a video output payload.',
      });
      return;
    }

    const videoDataUrl = extracted.dataBase64
      ? `data:${extracted.mimeType};base64,${extracted.dataBase64}`
      : extracted.uri;

    if (!videoDataUrl) {
      res.status(502).json({ error: 'Generated video payload was empty.' });
      return;
    }

    res.json({
      videoDataUrl,
      mimeType: extracted.mimeType,
      aspectRatio: safeAspect,
      duration: '3s',
      modelUsed: 'gemini-omni-1.2-flash',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Video animation failed.';
    if (isBillingOrQuotaMessage(message)) {
      res.status(403).json({
        error:
          '3-second AI video generation via gemini-omni-1.2-flash requires a billing-enabled GEMINI_API_KEY in Settings > Secrets. Explore cards continue playing 3-second kinetic motion loops locally.',
        billingRequired: true,
      });
      return;
    }
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  const port = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found.' });
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`TabiGuide server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
