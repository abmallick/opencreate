import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs/promises';

dotenv.config();

const app = express();
const port = process.env.PORT || 8787;

app.use(express.json({ limit: '15mb' }));

const upload = multer({
  dest: '/tmp',
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'));
    }
    return cb(null, true);
  }
});

function requireApiKey(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ message: 'Missing OPENAI_API_KEY in server environment.' });
    return false;
  }
  return true;
}

function base64ToBuffer(dataUrl) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], 'base64')
  };
}

function buildImagePrompt(userPrompt) {
  const base =
    'Use image 1 as the subject and image 2 as the scene. Place the subject naturally into the scene with realistic lighting, shadow, and perspective. Preserve branding details, textures, and colors on the subject.';
  if (!userPrompt) return base;
  return `${base} ${userPrompt}`;
}

function buildVideoPrompt(userPrompt) {
  const cleaned = userPrompt?.trim();
  const marketingBrief =
    'High-end marketing film. Premium, polished, brand-safe visuals. Crisp product focus, clean composition, natural motion, and cinematic lighting.';
  if (!cleaned) return marketingBrief;

  return [
    'Format & Look:',
    marketingBrief,
    '',
    'Shot:',
    'Hero product shot, shallow depth of field, pleasing bokeh, balanced framing.',
    '',
    'Subject anchors:',
    'Preserve the product from the input reference; keep logo and materials crisp and legible.',
    '',
    'Action:',
    cleaned,
    '',
    'Lighting & Palette:',
    'Soft key light from camera left, warm fill, subtle rim light. Palette anchors: warm amber, cream, charcoal, brand accent.',
    '',
    'Camera Motion:',
    'Slow push-in with a barely perceptible lateral drift.',
    '',
    'Continuity:',
    'Use the input reference as the first frame. Preserve subject identity, materials, and branding.'
  ].join('\n');
}

function extractOutputText(data) {
  if (!data) return '';
  if (typeof data.output_text === 'string') return data.output_text;
  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    if (item?.content && Array.isArray(item.content)) {
      for (const content of item.content) {
        if (content?.type === 'output_text' && typeof content.text === 'string') {
          return content.text;
        }
      }
    }
  }
  return '';
}

function buildScriptPrompt(brief, seconds) {
  return [
    'Write a concise ad video script for a premium marketing spot.',
    `Total duration: ${seconds} seconds.`,
    'Output format: timestamped beats that fully cover the total duration.',
    'Each line must be in the form: [MM:SS-MM:SS] Beat description (scene + action + camera).',
    'The final timestamp must end exactly at the total duration.',
    'Use 3-7 beats depending on duration.',
    'Keep it brand-safe, product-forward, and cinematic.',
    '',
    `Brief: ${brief}`
  ].join('\n');
}

app.post('/api/generate-video-script', async (req, res) => {
  if (!requireApiKey(req, res)) return;

  const { prompt, image } = req.body || {};
  const seconds = Number(req.body?.seconds ?? 4);
  if (!prompt) {
    res.status(400).json({ message: 'Prompt is required.' });
    return;
  }
  if (![4, 8, 12].includes(seconds)) {
    res.status(400).json({ message: 'Duration must be 4, 8, or 12 seconds.' });
    return;
  }
  if (image) {
    const parsed = base64ToBuffer(image);
    if (!parsed) {
      res.status(400).json({ message: 'Invalid image payload.' });
      return;
    }
  }

  console.log('[script] request start', {
    seconds,
    promptLength: String(prompt).length,
    hasImage: Boolean(image)
  });

  try {
    const scriptPrompt = buildScriptPrompt(prompt, seconds);
    console.log('[script] request payload', {
      model: 'gpt-4o-mini',
      max_output_tokens: 220,
      input: { textLength: scriptPrompt.length, hasImage: Boolean(image) }
    });

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: [
          {
            role: 'system',
            content: 'You are a creative director writing concise ad scripts for premium brands.'
          },
          {
            role: 'user',
            content: [
              { type: 'input_text', text: scriptPrompt },
              ...(image ? [{ type: 'input_image', image_url: image }] : [])
            ]
          }
        ],
        max_output_tokens: 220
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[script] api error', data?.error?.message || data);
      res.status(response.status).json({ message: data?.error?.message || 'Script generation failed.' });
      return;
    }

    const script = extractOutputText(data).trim();
    if (!script) {
      res.status(500).json({ message: 'No script returned from the API.' });
      return;
    }

    console.log('[script] response success', {
      status: response.status,
      id: data?.id,
      outputLength: script.length
    });
    res.json({ script });
  } catch (error) {
    console.error('[script] request failed', error.message || error);
    res.status(500).json({ message: error.message || 'Script generation failed.' });
  }
});

app.post(
  '/api/generate-image',
  upload.fields([
    { name: 'objectImage', maxCount: 1 },
    { name: 'sceneImage', maxCount: 1 }
  ]),
  async (req, res) => {
    if (!requireApiKey(req, res)) return;

    const objectImage = req.files?.objectImage?.[0];
    const sceneImage = req.files?.sceneImage?.[0];

    if (!objectImage || !sceneImage) {
      res.status(400).json({ message: 'Both subject and scene images are required.' });
      return;
    }

    const prompt = buildImagePrompt(req.body.prompt?.trim());
    console.log('[images] request start', {
      object: objectImage.originalname,
      scene: sceneImage.originalname,
      promptLength: prompt.length
    });

    try {
      console.log('[images] request payload', {
        model: 'gpt-image-1',
        size: '1536x1024',
        output_format: 'png',
        input_fidelity: 'high',
        images: 2,
        promptLength: prompt.length
      });

      const [objectBuffer, sceneBuffer] = await Promise.all([
        fs.readFile(objectImage.path),
        fs.readFile(sceneImage.path)
      ]);

      const form = new FormData();
      form.append('model', 'gpt-image-1');
      form.append('prompt', prompt);
      form.append('input_fidelity', 'high');
      form.append('size', '1536x1024');
      form.append('output_format', 'png');
      form.append('image[]', new Blob([objectBuffer], { type: objectImage.mimetype }), objectImage.originalname);
      form.append('image[]', new Blob([sceneBuffer], { type: sceneImage.mimetype }), sceneImage.originalname);

      const response = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: form
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('[images] api error', data?.error?.message || data);
        res.status(response.status).json({ message: data?.error?.message || 'Image generation failed.' });
        return;
      }

      const base64 = data?.data?.[0]?.b64_json;
      if (!base64) {
        res.status(500).json({ message: 'No image returned from the API.' });
        return;
      }

      console.log('[images] response success', { status: response.status, bytes: base64.length });
      res.json({ base64, mime: 'image/png' });
    } catch (error) {
      console.error('[images] request failed', error.message || error);
      res.status(500).json({ message: error.message || 'Image generation failed.' });
    } finally {
      await Promise.all([
        fs.unlink(objectImage.path).catch(() => {}),
        fs.unlink(sceneImage.path).catch(() => {})
      ]);
    }
  }
);

app.post('/api/generate-video', async (req, res) => {
  if (!requireApiKey(req, res)) return;

  const { prompt, image } = req.body || {};
  const seconds = Number(req.body?.seconds ?? 4);
  if (!prompt || !image) {
    res.status(400).json({ message: 'Prompt and image are required.' });
    return;
  }
  if (![4, 8, 12].includes(seconds)) {
    res.status(400).json({ message: 'Duration must be 4, 8, or 12 seconds.' });
    return;
  }

  const parsed = base64ToBuffer(image);
  if (!parsed) {
    res.status(400).json({ message: 'Invalid image payload.' });
    return;
  }

  console.log('[video] request start', { seconds, promptLength: String(prompt).length });

  try {
    const resized = await sharp(parsed.buffer)
      .resize(1280, 720, { fit: 'cover' })
      .toFormat('jpeg')
      .toBuffer();

    const form = new FormData();
    form.append('model', 'sora-2-pro');
    form.append('prompt', buildVideoPrompt(prompt));
    form.append('size', '1280x720');
    form.append('seconds', String(seconds));
    form.append('input_reference', new Blob([resized], { type: 'image/jpeg' }), 'reference.jpg');

    console.log('[video] request payload', {
      model: 'sora-2-pro',
      size: '1280x720',
      seconds,
      promptLength: String(prompt).length,
      hasInputReference: true
    });

    const response = await fetch('https://api.openai.com/v1/videos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: form
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[video] api error', data?.error?.message || data);
      res.status(response.status).json({ message: data?.error?.message || 'Video generation failed.' });
      return;
    }

    console.log('[video] response queued', { status: response.status, id: data.id, state: data.status });
    res.json({ id: data.id, status: data.status });
  } catch (error) {
    console.error('[video] request failed', error.message || error);
    res.status(500).json({ message: error.message || 'Video generation failed.' });
  }
});

app.get('/api/video/:id', async (req, res) => {
  if (!requireApiKey(req, res)) return;

  try {
    console.log('[video] status request', { id: req.params.id });
    const response = await fetch(`https://api.openai.com/v1/videos/${req.params.id}`, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ message: data?.error?.message || 'Unable to fetch status.' });
      return;
    }

    console.log('[video] status response', { status: response.status, state: data.status });
    res.json({ status: data.status, error: data.error?.message || null });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to fetch status.' });
  }
});

app.get('/api/video/:id/content', async (req, res) => {
  if (!requireApiKey(req, res)) return;

  try {
    console.log('[video] content request', { id: req.params.id });
    const response = await fetch(`https://api.openai.com/v1/videos/${req.params.id}/content`, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      res.status(response.status).json({ message: data?.error?.message || 'Unable to fetch video.' });
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    console.log('[video] content response', { status: response.status, bytes: buffer.length });
    res.setHeader('Content-Type', 'video/mp4');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to fetch video.' });
  }
});

app.use((err, req, res, next) => {
  if (err) {
    const message = err.message || 'Upload failed.';
    res.status(400).json({ message });
    return;
  }
  next();
});

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
