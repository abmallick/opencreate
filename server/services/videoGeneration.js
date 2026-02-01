import sharp from 'sharp';
import { buildVideoPrompt } from '../prompts/templates.js';

/**
 * Create a video generation service
 * @param {object} deps
 * @param {import('../clients/openai.js').OpenAIClient} deps.openaiClient
 * @returns {VideoGenerationService}
 */
export function createVideoGenerationService({ openaiClient }) {
  return {
    /**
     * Generate a video from a script and reference image
     * @param {object} params
     * @param {string} params.script - Video script
     * @param {Buffer} params.imageBuffer - Reference image buffer
     * @param {number} params.seconds - Duration in seconds (4, 8, or 12)
     * @returns {Promise<{id: string, status: string}>}
     */
    async generateVideo({ script, imageBuffer, seconds }) {
      console.log('[video] service: generateVideo start', {
        seconds,
        scriptLength: script.length
      });

      // Resize image to video dimensions
      const resized = await sharp(imageBuffer)
        .resize(720, 1280, { fit: 'cover' })
        .toFormat('jpeg')
        .toBuffer();

      const prompt = buildVideoPrompt(script);

      console.log('[video] service: calling OpenAI', {
        model: 'sora-2-pro',
        size: '720x1280',
        seconds,
        promptLength: prompt.length
      });

      const result = await openaiClient.createVideo({
        prompt,
        referenceImage: resized,
        size: '720x1280',
        seconds
      });

      console.log('[video] service: generateVideo queued', {
        id: result.id,
        status: result.status
      });

      return result;
    },

    /**
     * Get video generation status
     * @param {string} videoId
     * @returns {Promise<{status: string, error: string|null}>}
     */
    async getStatus(videoId) {
      console.log('[video] service: getStatus', { id: videoId });
      const result = await openaiClient.getVideoStatus(videoId);
      console.log('[video] service: status response', { status: result.status });
      return result;
    },

    /**
     * Get video content
     * @param {string} videoId
     * @returns {Promise<Buffer>}
     */
    async getContent(videoId) {
      console.log('[video] service: getContent', { id: videoId });
      const buffer = await openaiClient.getVideoContent(videoId);
      console.log('[video] service: content received', { bytes: buffer.length });
      return buffer;
    }
  };
}

/**
 * @typedef {ReturnType<typeof createVideoGenerationService>} VideoGenerationService
 */
