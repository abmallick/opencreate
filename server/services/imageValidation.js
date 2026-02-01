import { extractOutputText } from '../utils/helpers.js';

/**
 * Create an image validation service
 * @param {object} deps
 * @param {import('../clients/openai.js').OpenAIClient} deps.openaiClient
 * @returns {ImageValidationService}
 */
export function createImageValidationService({ openaiClient }) {
  return {
    /**
     * Validate a product image
     * - If userPrompt provided: check if image contains an object related to the prompt
     * - If userPrompt empty: check if image contains exactly one object
     * 
     * @param {object} params
     * @param {string} params.imageDataUrl - Base64 data URL of the image
     * @param {string} [params.userPrompt] - Optional user prompt describing expected object
     * @returns {Promise<ValidationResult>}
     */
    async validateProductImage({ imageDataUrl, userPrompt }) {
      const hasPrompt = Boolean(userPrompt?.trim());
      
      console.log('[validation] service: validateProductImage start', {
        mode: hasPrompt ? 'prompt-match' : 'single-object'
      });

      // Build prompt based on validation mode
      const prompt = hasPrompt
        ? `Does this image contain an object mentioned in the following text: "${userPrompt}"?\nAnswer with just "yes" or "no".`
        : `How many distinct objects/products are in this image?\nAnswer with just a number.`;

      try {
        const response = await openaiClient.analyzeImage({
          imageDataUrl,
          prompt,
          model: 'gpt-4o-mini'
        });

        const text = extractOutputText(response.data).trim().toLowerCase();
        console.log('[validation] service: response', { text });

        if (hasPrompt) {
          // Mode: Check if image contains object related to prompt
          const containsObject = text.includes('yes');
          const isValid = containsObject;

          const result = {
            isValid,
            containsObject,
            reason: isValid ? null : `Image does not contain an object mentioned in the prompt: "${userPrompt}"`
          };

          console.log('[validation] service: complete', result);
          return result;
        } else {
          // Mode: Check for exactly one object
          const countMatch = text.match(/\d+/);
          const objectCount = countMatch ? parseInt(countMatch[0], 10) : null;
          const isValid = objectCount === 1;

          const result = {
            isValid,
            objectCount,
            reason: isValid ? null : 
              objectCount !== null 
                ? `Image contains ${objectCount} objects, expected exactly 1 if prompt is empty`
                : 'Could not determine object count'
          };

          console.log('[validation] service: complete', result);
          return result;
        }
      } catch (error) {
        console.error('[validation] service: error', error.message || error);
        // On error, allow the image through but log the issue
        return {
          isValid: true,
          reason: null,
          validationError: error.message
        };
      }
    }
  };
}

/**
 * @typedef {object} ValidationResult
 * @property {boolean} isValid - Whether the image passes validation
 * @property {string|null} reason - Reason for validation failure
 * @property {number} [objectCount] - Number of objects (when no prompt provided)
 * @property {boolean} [containsObject] - Whether object was found (when prompt provided)
 * @property {string} [validationError] - Error message if validation itself failed
 */

/**
 * @typedef {ReturnType<typeof createImageValidationService>} ImageValidationService
 */
