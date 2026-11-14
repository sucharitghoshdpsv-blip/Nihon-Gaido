import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

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

async function startServer() {
  const port = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`TabiGuide server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
