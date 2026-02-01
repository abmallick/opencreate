import { buildRegeneratePrompt } from '../prompts/templates.js';

/**
 * Create an image editing service
 * @param {object} deps
 * @param {import('../clients/openai.js').OpenAIClient} deps.openaiClient
 * @returns {ImageEditingService}
 */
export function createImageEditingService({ openaiClient }) {
  return {
    /**
     * Edit/refine an existing image
     * @param {object} params
     * @param {{buffer: Buffer, mime: string}} params.image - Source image
     * @param {string} [params.userPrompt] - Edit instructions
     * @returns {Promise<{base64: string, mime: string}>}
     */
    async editImage({ image, userPrompt }) {
      console.log('[edit] service: editImage start', {
        imageSize: image.buffer.length,
        hasPrompt: Boolean(userPrompt)
      });

      const prompt = buildRegeneratePrompt(userPrompt);

      console.log('[edit] service: calling OpenAI', {
        model: 'gpt-image-1',
        size: '1024x1536',
        promptLength: prompt.length
      });

      const result = await openaiClient.editImages({
        images: [{ buffer: image.buffer, mime: image.mime, name: 'source.png' }],
        prompt,
        size: '1024x1536',
        fidelity: 'high',
        outputFormat: 'png'
      });

      console.log('[edit] service: editImage success', {
        bytes: result.base64.length
      });

      return result;
    }
  };
}

/**
 * @typedef {ReturnType<typeof createImageEditingService>} ImageEditingService
 */
