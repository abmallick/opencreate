import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';

import { base64ToBuffer } from './utils/helpers.js';
import { createOpenAIClient } from './clients/openai.js';
import { createImageBlendingService } from './services/imageBlending.js';
import { createImageEditingService } from './services/imageEditing.js';
import { createScriptGenerationService } from './services/scriptGeneration.js';
import { createVideoGenerationService } from './services/videoGeneration.js';
import { createVideoEditingService } from './services/videoEditing.js';
import { createImageValidationService } from './services/imageValidation.js';

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

// Initialize OpenAI client and services
const openaiClient = createOpenAIClient({
  apiKey: process.env.OPENAI_API_KEY
});

const imageBlendingService = createImageBlendingService({ openaiClient });
const imageEditingService = createImageEditingService({ openaiClient });
const scriptGenerationService = createScriptGenerationService({ openaiClient });
const videoGenerationService = createVideoGenerationService({ openaiClient });
const videoEditingService = createVideoEditingService({ openaiClient });
const imageValidationService = createImageValidationService({ openaiClient });

function requireApiKey(req, res) {
  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ message: 'Missing OPENAI_API_KEY in server environment.' });
    return false;
  }
  return true;
}

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[request] ${req.method} ${req.path}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[response] ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// ============================================================================
// Script Generation
// ============================================================================
app.post('/api/generate-video-script', async (req, res) => {
  if (!requireApiKey(req, res)) return;

  const { prompt, image } = req.body || {};
  const seconds = Number(req.body?.seconds ?? 4);

  // Validation
  if (!prompt) {
    console.log('[validation] /api/generate-video-script FAILED: Prompt is required');
    res.status(400).json({ message: 'Prompt is required.' });
    return;
  }
  if (![4, 8, 12].includes(seconds)) {
    console.log('[validation] /api/generate-video-script FAILED: Invalid duration', { seconds });
    res.status(400).json({ message: 'Duration must be 4, 8, or 12 seconds.' });
    return;
  }
  if (image) {
    const parsed = base64ToBuffer(image);
    if (!parsed) {
      console.log('[validation] /api/generate-video-script FAILED: Invalid image payload');
      res.status(400).json({ message: 'Invalid image payload.' });
      return;
    }
  }

  console.log('[validation] /api/generate-video-script PASSED', { seconds, hasImage: Boolean(image) });

  try {
    const result = await scriptGenerationService.generateScript({
      brief: prompt,
      seconds,
      imageDataUrl: image || undefined
    });
    res.json(result);
  } catch (error) {
    console.error('[script] route error', error.message || error);
    res.status(500).json({ message: error.message || 'Script generation failed.' });
  }
});

// ============================================================================
// Image Blending (Product + Scene)
// ============================================================================
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
    const skipValidation = req.body.skipValidation === 'true' || req.body.skipValidation === true;

    // Validation
    if (!objectImage || !sceneImage) {
      console.log('[validation] /api/generate-image FAILED: Missing images', {
        hasObject: Boolean(objectImage),
        hasScene: Boolean(sceneImage)
      });
      res.status(400).json({ message: 'Both subject and scene images are required.' });
      return;
    }

    console.log('[validation] /api/generate-image PASSED', {
      objectImage: objectImage.originalname,
      sceneImage: sceneImage.originalname,
      skipValidation
    });

    try {
      const [objectBuffer, sceneBuffer] = await Promise.all([
        fs.readFile(objectImage.path),
        fs.readFile(sceneImage.path)
      ]);

      // Validate product image (unless skipped)
      if (!skipValidation) {
        const imageDataUrl = `data:${objectImage.mimetype};base64,${objectBuffer.toString('base64')}`;
        const validation = await imageValidationService.validateProductImage({
          imageDataUrl,
          userPrompt: req.body.prompt?.trim() || undefined
        });

        if (!validation.isValid) {
          res.status(400).json({
            message: validation.reason || 'Product image validation failed',
            code: 'VALIDATION_FAILED'
          });
          return;
        }
      }

      const result = await imageBlendingService.blendImages({
        objectImage: {
          buffer: objectBuffer,
          mime: objectImage.mimetype,
          name: objectImage.originalname
        },
        sceneImage: {
          buffer: sceneBuffer,
          mime: sceneImage.mimetype,
          name: sceneImage.originalname
        },
        userPrompt: req.body.prompt?.trim()
      });

      res.json(result);
    } catch (error) {
      console.error('[images] route error', error.message || error);
      res.status(500).json({ message: error.message || 'Image generation failed.' });
    } finally {
      await Promise.all([
        fs.unlink(objectImage.path).catch(() => {}),
        fs.unlink(sceneImage.path).catch(() => {})
      ]);
    }
  }
);

// ============================================================================
// Image Editing
// ============================================================================
app.post('/api/edit-image', async (req, res) => {
  if (!requireApiKey(req, res)) return;

  const { image, prompt } = req.body || {};

  // Validation
  if (!image) {
    console.log('[validation] /api/edit-image FAILED: Image is required');
    res.status(400).json({ message: 'Image is required.' });
    return;
  }

  const parsed = base64ToBuffer(image);
  if (!parsed) {
    console.log('[validation] /api/edit-image FAILED: Invalid image payload');
    res.status(400).json({ message: 'Invalid image payload.' });
    return;
  }

  console.log('[validation] /api/edit-image PASSED', { hasPrompt: Boolean(prompt) });

  try {
    const result = await imageEditingService.editImage({
      image: { buffer: parsed.buffer, mime: parsed.mime },
      userPrompt: prompt?.trim()
    });
    res.json(result);
  } catch (error) {
    console.error('[edit] route error', error.message || error);
    res.status(500).json({ message: error.message || 'Image editing failed.' });
  }
});

// ============================================================================
// Video Generation
// ============================================================================
app.post('/api/generate-video', async (req, res) => {
  if (!requireApiKey(req, res)) return;

  const { prompt, image } = req.body || {};
  const seconds = Number(req.body?.seconds ?? 4);

  // Validation
  if (!prompt || !image) {
    console.log('[validation] /api/generate-video FAILED: Missing prompt or image', {
      hasPrompt: Boolean(prompt),
      hasImage: Boolean(image)
    });
    res.status(400).json({ message: 'Prompt and image are required.' });
    return;
  }
  if (![4, 8, 12].includes(seconds)) {
    console.log('[validation] /api/generate-video FAILED: Invalid duration', { seconds });
    res.status(400).json({ message: 'Duration must be 4, 8, or 12 seconds.' });
    return;
  }

  const parsed = base64ToBuffer(image);
  if (!parsed) {
    console.log('[validation] /api/generate-video FAILED: Invalid image payload');
    res.status(400).json({ message: 'Invalid image payload.' });
    return;
  }

  console.log('[validation] /api/generate-video PASSED', { seconds });

  try {
    const result = await videoGenerationService.generateVideo({
      script: prompt,
      imageBuffer: parsed.buffer,
      seconds
    });
    res.json(result);
  } catch (error) {
    console.error('[video] route error', error.message || error);
    res.status(500).json({ message: error.message || 'Video generation failed.' });
  }
});

app.get('/api/video/:id', async (req, res) => {
  if (!requireApiKey(req, res)) return;

  try {
    const result = await videoGenerationService.getStatus(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('[video] status error', error.message || error);
    res.status(500).json({ message: error.message || 'Unable to fetch status.' });
  }
});

app.get('/api/video/:id/content', async (req, res) => {
  if (!requireApiKey(req, res)) return;

  try {
    const buffer = await videoGenerationService.getContent(req.params.id);
    res.setHeader('Content-Type', 'video/mp4');
    res.send(buffer);
  } catch (error) {
    console.error('[video] content error', error.message || error);
    res.status(500).json({ message: error.message || 'Unable to fetch video.' });
  }
});

// ============================================================================
// Video Editing (Remix)
// ============================================================================
app.post('/api/video/:id/remix', async (req, res) => {
  if (!requireApiKey(req, res)) return;

  const { prompt } = req.body || {};

  // Validation
  if (!prompt?.trim()) {
    console.log('[validation] /api/video/:id/remix FAILED: Remix prompt is required', { videoId: req.params.id });
    res.status(400).json({ message: 'Remix prompt is required.' });
    return;
  }

  console.log('[validation] /api/video/:id/remix PASSED', { videoId: req.params.id });

  try {
    const result = await videoEditingService.remixVideo({
      videoId: req.params.id,
      prompt: prompt.trim()
    });
    res.json(result);
  } catch (error) {
    console.error('[remix] route error', error.message || error);
    res.status(500).json({ message: error.message || 'Remix failed.' });
  }
});

// ============================================================================
// Error Handler
// ============================================================================
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
