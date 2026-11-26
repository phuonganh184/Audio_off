import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface VoiceTtsConfig {
  voiceName: 'Kore' | 'Zephyr' | 'Charon' | 'Fenrir' | 'Puck';
  style: string;
}

const VOICE_TTS_MAP: Record<string, VoiceTtsConfig> = {
  natural: {
    voiceName: 'Kore',
    style:
      'Vietnamese female audiobook narrator, natural clear standard Vietnamese pronunciation, balanced storytelling tone',
  },
  young_female: {
    voiceName: 'Zephyr',
    style:
      'Vietnamese young female audiobook narrator, bright gentle youthful clear tone, natural Vietnamese pronunciation',
  },
  warm_female: {
    voiceName: 'Kore',
    style:
      'Vietnamese female audiobook narrator, warm affectionate emotional storytelling tone, soft natural Vietnamese pacing',
  },
  mature_female: {
    voiceName: 'Kore',
    style:
      'Vietnamese mature female audiobook narrator, poised composed steady tone, crisp Vietnamese articulation',
  },
  deep_male: {
    voiceName: 'Charon',
    style:
      'Vietnamese male audiobook narrator, deep resonant authoritative storytelling tone for wuxia and fantasy, natural Vietnamese pronunciation',
  },
  young_male: {
    voiceName: 'Puck',
    style:
      'Vietnamese young male audiobook narrator, crisp bright clear energetic modern tone, natural Vietnamese pronunciation',
  },
  elder_storyteller: {
    voiceName: 'Fenrir',
    style:
      'Vietnamese elder male storyteller, deep seasoned wise unhurried historical storytelling voice, natural Vietnamese',
  },
  horror_dark: {
    voiceName: 'Charon',
    style:
      'Vietnamese male audiobook narrator, low hushed suspenseful dark horror storytelling tone, deliberate pacing',
  },
  sleep_calm: {
    voiceName: 'Zephyr',
    style:
      'Vietnamese female narrator, very soft soothing calming bedtime story voice, slow gentle relaxing pace',
  },
  crisp_story: {
    voiceName: 'Puck',
    style:
      'Vietnamese male narrator, clear articulate brisk well-paced storytelling voice',
  },
};

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function createServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '1mb' }));

  app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get('/api/tts/status', (_req, res) => {
    const available = Boolean(process.env.GEMINI_API_KEY?.trim());
    res.json({ available });
  });

  app.post('/api/tts', async (req, res) => {
    const body = (req.body || {}) as { text?: unknown; voiceProfileId?: unknown };
    const rawText = typeof body.text === 'string' ? body.text.trim() : '';
    const profileId =
      typeof body.voiceProfileId === 'string' && VOICE_TTS_MAP[body.voiceProfileId]
        ? body.voiceProfileId
        : 'natural';

    if (!rawText) {
      res.status(400).json({ error: 'INVALID_TEXT', message: 'Thiếu nội dung văn bản cần đọc.' });
      return;
    }

    if (rawText.length > 1800) {
      res.status(400).json({
        error: 'TEXT_TOO_LONG',
        message: 'Đoạn văn bản vượt quá giới hạn cho một lượt tạo giọng đọc.',
      });
      return;
    }

    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'MISSING_GEMINI_API_KEY',
        message: 'Chưa cấu hình GEMINI_API_KEY trên máy chủ để tạo giọng AI Tiếng Việt.',
      });
      return;
    }

    const cfg = VOICE_TTS_MAP[profileId];

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: rawText,
                speechMetadata: {
                  style: cfg.style,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: cfg.voiceName,
              },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.status(502).json({
          error: 'EMPTY_AUDIO',
          message: 'Dịch vụ giọng đọc AI không trả về dữ liệu âm thanh.',
        });
        return;
      }

      const wavBuffer = Buffer.from(base64Audio, 'base64');
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.send(wavBuffer);
    } catch (err: unknown) {
      const status =
        typeof err === 'object' &&
        err !== null &&
        'status' in err &&
        typeof (err as { status?: unknown }).status === 'number'
          ? (err as { status: number }).status
          : 500;
      const msg = err instanceof Error ? err.message : 'Lỗi tạo giọng đọc AI.';
      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: status === 429 ? 'QUOTA_EXCEEDED' : 'TTS_FAILED',
        message: msg,
      });
    }
  });

  const httpServer = http.createServer(app);

  const isProd =
    process.env.NODE_ENV === 'production' || process.env.npm_lifecycle_event === 'start';

  if (isProd) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: disableHmr ? false : true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Truyện Audio server listening on http://0.0.0.0:${port}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
