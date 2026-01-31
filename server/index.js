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

    try {
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
        res.status(response.status).json({ message: data?.error?.message || 'Image generation failed.' });
        return;
      }

      const base64 = data?.data?.[0]?.b64_json;
      if (!base64) {
        res.status(500).json({ message: 'No image returned from the API.' });
        return;
      }

      res.json({ base64, mime: 'image/png' });
    } catch (error) {
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

    const response = await fetch('https://api.openai.com/v1/videos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: form
    });

    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ message: data?.error?.message || 'Video generation failed.' });
      return;
    }

    res.json({ id: data.id, status: data.status });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Video generation failed.' });
  }
});

app.get('/api/video/:id', async (req, res) => {
  if (!requireApiKey(req, res)) return;

  try {
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

    res.json({ status: data.status, error: data.error?.message || null });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to fetch status.' });
  }
});

app.get('/api/video/:id/content', async (req, res) => {
  if (!requireApiKey(req, res)) return;

  try {
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
