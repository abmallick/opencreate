import { buildScriptPrompt } from '../prompts/templates.js';
import { extractOutputText } from '../utils/helpers.js';

/**
 * Create a script generation service
 * @param {object} deps
 * @param {import('../clients/openai.js').OpenAIClient} deps.openaiClient
 * @returns {ScriptGenerationService}
 */
export function createScriptGenerationService({ openaiClient }) {
  return {
    /**
     * Generate a video script from a brief
     * @param {object} params
     * @param {string} params.brief - The ad brief
     * @param {number} params.seconds - Duration in seconds (4, 8, or 12)
     * @param {string} [params.imageDataUrl] - Optional reference image as data URL
     * @returns {Promise<{script: string}>}
     */
    async generateScript({ brief, seconds, imageDataUrl }) {
      console.log('[script] service: generateScript start', {
        seconds,
        briefLength: brief.length,
        hasImage: Boolean(imageDataUrl)
      });

      const scriptPrompt = buildScriptPrompt(brief, seconds);

      const messages = [
        {
          role: 'system',
          content: 'You are a creative director writing concise ad scripts for premium brands. Only output the script, no other text.'
        },
        {
          role: 'user',
          content: [
            { type: 'input_text', text: scriptPrompt },
            ...(imageDataUrl ? [{ type: 'input_image', image_url: imageDataUrl }] : [])
          ]
        }
      ];

      console.log('[script] service: calling OpenAI', {
        model: 'gpt-4o-mini',
        inputLength: scriptPrompt.length,
        hasImage: Boolean(imageDataUrl)
      });

      const response = await openaiClient.generateResponse({
        messages,
        model: 'gpt-4o-mini'
      });

      const script = extractOutputText(response.data).trim();
      if (!script) {
        throw new Error('No script returned from the API');
      }

      console.log('[script] service: generateScript success', {
        id: response.id,
        scriptLength: script.length
      });

      return { script };
    }
  };
}

/**
 * @typedef {ReturnType<typeof createScriptGenerationService>} ScriptGenerationService
 */
