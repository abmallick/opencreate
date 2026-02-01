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
    'Use image 1 as the subject and image 2 as the scene. Place the subject naturally into the scene with realistic lighting, shadow, and perspective. Preserve branding details, textures, and colors on the subject. The output image should have an aspect ratio suitable for viewing on social media apps like Instagram and TikTok.';
  if (!userPrompt) return base;
  return `${base} ${userPrompt}`;
}

function buildRegeneratePrompt(userPrompt) {
  const base =
    'Refine and improve this image based on the prompt. Only make the changes specified in the prompt and keep the image as close as possible to the original.';
  if (!userPrompt) return base;
  return `${base} ${userPrompt}`;
}

function buildVideoPrompt(userPrompt) {
  const cleaned = userPrompt?.trim();
  const timingMatches = cleaned ? [...cleaned.matchAll(/\[(\d{2}:\d{2})-(\d{2}:\d{2})\]/g)] : [];
  const shotCount = timingMatches.length;
  const lastEnd = timingMatches.length ? timingMatches[timingMatches.length - 1][2] : null;
  const durationSeconds = lastEnd
    ? lastEnd
        .split(':')
        .map((value) => Number(value))
        .reduce((total, value) => total * 60 + value, 0)
    : null;

  const formatAndLookLine =
    durationSeconds != null
      ? `Duration ${durationSeconds}s; 180° shutter; digital capture emulating 65 mm photochemical contrast; fine grain; subtle halation on speculars; no gate weave.`
      : 'Duration unspecified; 180° shutter; digital capture emulating 65 mm photochemical contrast; fine grain; subtle halation on speculars; no gate weave.';
  const shotListHeader =
    shotCount > 0 && durationSeconds != null
      ? `Optimized Shot List (${shotCount} shots / ${durationSeconds} s total)`
      : shotCount > 0
      ? `Optimized Shot List (${shotCount} shots / duration unspecified)`
      : 'Optimized Shot List (shots and duration unspecified)';
  const base = [
    'Format & Look',
    formatAndLookLine,
    '',
    'Lenses & Filtration',
    '32 mm / 50 mm spherical primes; Black Pro-Mist 1/4; slight CPL rotation to manage glass reflections on train windows.',
    '',
    'Grade / Palette',
    'Highlights: clean morning sunlight with amber lift.',
    'Mids: balanced neutrals with slight teal cast in shadows.',
    'Blacks: soft, neutral with mild lift for haze retention.',
    '',
    'Lighting & Atmosphere',
    'Natural sunlight from camera left, low angle (07:30 AM).',
    'Bounce: 4×4 ultrabounce silver from trackside.',
    'Negative fill from opposite wall.',
    'Practical: sodium platform lights on dim fade.',
    'Atmos: gentle mist; train exhaust drift through light beam.',
    '',
    'Location & Framing',
    'Urban commuter platform, dawn.',
    'Foreground: yellow safety line, coffee cup on bench.',
    'Midground: waiting passengers silhouetted in haze.',
    'Background: arriving train braking to a stop.',
    'Avoid signage or corporate branding.',
    '',
    'Wardrobe / Props / Extras',
    'Main subject: mid-30s traveler, navy coat, backpack slung on one shoulder, holding phone loosely at side.',
    'Extras: commuters in muted tones; one cyclist pushing bike.',
    'Props: paper coffee cup, rolling luggage, LED departure board (generic destinations).',
    '',
    'Sound',
    'Diegetic only: faint rail screech, train brakes hiss, distant announcement muffled (-20 LUFS), low ambient hum.',
    'Footsteps and paper rustle; no score or added foley.',
    '',
    shotListHeader,
    cleaned || '',
    '',
    'Camera Notes (Why It Reads)',
    'Keep eyeline low and close to lens axis for intimacy.',
    'Allow micro flares from train glass as aesthetic texture.',
    'Preserve subtle handheld imperfection for realism.',
    'Do not break silhouette clarity with overexposed flare; retain skin highlight roll-off.',
    '',
    'Finishing',
    'Fine-grain overlay with mild chroma noise for realism; restrained halation on practicals; warm-cool LUT for morning split tone.',
    'Mix: prioritize train and ambient detail over footstep transients.',
    'Poster frame: traveler mid-turn, golden rim light, arriving train soft-focus in background haze.'
  ];

  return base.join('\n');
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
            content: 'You are a creative director writing concise ad scripts for premium brands. Only output the script, no other text.'
          },
          {
            role: 'user',
            content: [
              { type: 'input_text', text: scriptPrompt },
              ...(image ? [{ type: 'input_image', image_url: image }] : [])
            ]
          }
        ]
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
        size: '1024x1536',
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
      form.append('size', '1024x1536');
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

app.post('/api/edit-image', async (req, res) => {
  if (!requireApiKey(req, res)) return;

  const { image, prompt } = req.body || {};
  if (!image) {
    res.status(400).json({ message: 'Image is required.' });
    return;
  }

  const parsed = base64ToBuffer(image);
  if (!parsed) {
    res.status(400).json({ message: 'Invalid image payload.' });
    return;
  }

  const editPrompt = buildRegeneratePrompt(prompt?.trim());
  console.log('[edit] request start', {
    promptLength: editPrompt.length,
    imageSize: parsed.buffer.length
  });

  try {
    console.log('[edit] request payload', {
      model: 'gpt-image-1',
      size: '1024x1536',
      output_format: 'png',
      input_fidelity: 'high',
      images: 1,
      promptLength: editPrompt.length
    });

    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('prompt', editPrompt);
    form.append('input_fidelity', 'high');
    form.append('size', '1024x1536');
    form.append('output_format', 'png');
    form.append('image[]', new Blob([parsed.buffer], { type: parsed.mime }), 'source.png');

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: form
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('[edit] api error', data?.error?.message || data);
      res.status(response.status).json({ message: data?.error?.message || 'Image editing failed.' });
      return;
    }

    const base64 = data?.data?.[0]?.b64_json;
    if (!base64) {
      res.status(500).json({ message: 'No image returned from the API.' });
      return;
    }

    console.log('[edit] response success', { status: response.status, bytes: base64.length });
    res.json({ base64, mime: 'image/png' });
  } catch (error) {
    console.error('[edit] request failed', error.message || error);
    res.status(500).json({ message: error.message || 'Image editing failed.' });
  }
});

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
      .resize(720, 1280, { fit: 'cover' })
      .toFormat('jpeg')
      .toBuffer();

    const form = new FormData();
    form.append('model', 'sora-2-pro');
    form.append('prompt', buildVideoPrompt(prompt));
    form.append('size', '720x1280');
    form.append('seconds', String(seconds));
    form.append('input_reference', new Blob([resized], { type: 'image/jpeg' }), 'reference.jpg');

    console.log('[video] request payload form', form);


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

app.post('/api/video/:id/remix', async (req, res) => {
  if (!requireApiKey(req, res)) return;

  const { prompt } = req.body || {};
  if (!prompt?.trim()) {
    res.status(400).json({ message: 'Remix prompt is required.' });
    return;
  }

  console.log('[remix] request start', { id: req.params.id, promptLength: prompt.length });

  try {
    const response = await fetch(
      `https://api.openai.com/v1/videos/${req.params.id}/remix`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: prompt.trim() })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error('[remix] api error', data?.error?.message || data);
      res.status(response.status).json({ message: data?.error?.message || 'Remix failed.' });
      return;
    }

    console.log('[remix] response queued', { status: response.status, id: data.id, state: data.status });
    res.json({ id: data.id, status: data.status });
  } catch (error) {
    console.error('[remix] request failed', error.message || error);
    res.status(500).json({ message: error.message || 'Remix failed.' });
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
