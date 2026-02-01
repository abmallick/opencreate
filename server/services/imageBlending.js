import { buildImagePrompt } from '../prompts/templates.js';

/**
 * Create an image blending service
 * @param {object} deps
 * @param {import('../clients/openai.js').OpenAIClient} deps.openaiClient
 * @returns {ImageBlendingService}
 */
export function createImageBlendingService({ openaiClient }) {
  return {
    /**
     * Blend a product/object image with a scene image
     * @param {object} params
     * @param {{buffer: Buffer, mime: string, name: string}} params.objectImage - Product image
     * @param {{buffer: Buffer, mime: string, name: string}} params.sceneImage - Scene image
     * @param {string} [params.userPrompt] - Optional user prompt
     * @returns {Promise<{base64: string, mime: string}>}
     */
    async blendImages({ objectImage, sceneImage, userPrompt }) {
      console.log('[images] service: blendImages start', {
        object: objectImage.name,
        scene: sceneImage.name,
        hasPrompt: Boolean(userPrompt)
      });

      const prompt = buildImagePrompt(userPrompt);

      console.log('[images] service: calling OpenAI', {
        model: 'gpt-image-1',
        size: '1024x1536',
        images: 2,
        promptLength: prompt.length
      });

      const result = await openaiClient.editImages({
        images: [objectImage, sceneImage],
        prompt,
        size: '1024x1536',
        fidelity: 'high',
        outputFormat: 'png'
      });

      console.log('[images] service: blendImages success', {
        bytes: result.base64.length
      });

      return result;
    }
  };
}

/**
 * @typedef {ReturnType<typeof createImageBlendingService>} ImageBlendingService
 */
