/**
 * Create a video editing (remix) service
 * @param {object} deps
 * @param {import('../clients/openai.js').OpenAIClient} deps.openaiClient
 * @returns {VideoEditingService}
 */
export function createVideoEditingService({ openaiClient }) {
  return {
    /**
     * Remix an existing video with a new prompt
     * @param {object} params
     * @param {string} params.videoId - ID of the video to remix
     * @param {string} params.prompt - Remix instructions
     * @returns {Promise<{id: string, status: string}>}
     */
    async remixVideo({ videoId, prompt }) {
      console.log('[remix] service: remixVideo start', {
        id: videoId,
        promptLength: prompt.length
      });

      const result = await openaiClient.remixVideo(videoId, prompt);

      console.log('[remix] service: remixVideo queued', {
        newId: result.id,
        status: result.status
      });

      return result;
    }
  };
}

/**
 * @typedef {ReturnType<typeof createVideoEditingService>} VideoEditingService
 */
