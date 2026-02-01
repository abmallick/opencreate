/**
 * OpenAI API Client with dependency injection for testability
 * 
 * @param {object} options
 * @param {string} options.apiKey - OpenAI API key
 * @param {typeof fetch} [options.fetch] - Fetch implementation (defaults to global fetch)
 * @returns {OpenAIClient}
 */
export function createOpenAIClient({ apiKey, fetch: fetchImpl = globalThis.fetch }) {
  const baseUrl = 'https://api.openai.com/v1';

  /**
   * Make an authenticated request to OpenAI
   * @param {string} endpoint 
   * @param {RequestInit} options 
   * @returns {Promise<Response>}
   */
  async function request(endpoint, options = {}) {
    const url = `${baseUrl}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      ...options.headers
    };
    return fetchImpl(url, { ...options, headers });
  }

  return {
    /**
     * Edit/blend images using GPT Image model
     * @param {object} params
     * @param {Array<{buffer: Buffer, mime: string, name: string}>} params.images - Image buffers with metadata
     * @param {string} params.prompt - Edit prompt
     * @param {string} [params.size='1024x1536'] - Output size
     * @param {string} [params.fidelity='high'] - Input fidelity
     * @param {string} [params.outputFormat='png'] - Output format
     * @returns {Promise<{base64: string, mime: string}>}
     */
    async editImages({ images, prompt, size = '1024x1536', fidelity = 'high', outputFormat = 'png' }) {
      const form = new FormData();
      form.append('model', 'gpt-image-1');
      form.append('prompt', prompt);
      form.append('input_fidelity', fidelity);
      form.append('size', size);
      form.append('output_format', outputFormat);

      for (const img of images) {
        form.append('image[]', new Blob([img.buffer], { type: img.mime }), img.name);
      }

      const response = await request('/images/edits', {
        method: 'POST',
        body: form
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Image editing failed');
      }

      const base64 = data?.data?.[0]?.b64_json;
      if (!base64) {
        throw new Error('No image returned from the API');
      }

      return { base64, mime: `image/${outputFormat}` };
    },

    /**
     * Generate text response (for script generation)
     * @param {object} params
     * @param {Array<{role: string, content: any}>} params.messages - Chat messages
     * @param {string} [params.model='gpt-4o-mini'] - Model to use
     * @returns {Promise<{text: string, id: string}>}
     */
    async generateResponse({ messages, model = 'gpt-4o-mini' }) {
      const response = await request('/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, input: messages })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Response generation failed');
      }

      return { data, id: data?.id };
    },

    /**
     * Create a video using Sora
     * @param {object} params
     * @param {string} params.prompt - Video prompt
     * @param {Buffer} params.referenceImage - Reference image buffer
     * @param {string} [params.size='720x1280'] - Video size
     * @param {number} [params.seconds=4] - Video duration
     * @returns {Promise<{id: string, status: string}>}
     */
    async createVideo({ prompt, referenceImage, size = '720x1280', seconds = 4 }) {
      const form = new FormData();
      form.append('model', 'sora-2-pro');
      form.append('prompt', prompt);
      form.append('size', size);
      form.append('seconds', String(seconds));
      form.append('input_reference', new Blob([referenceImage], { type: 'image/jpeg' }), 'reference.jpg');

      const response = await request('/videos', {
        method: 'POST',
        body: form
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Video generation failed');
      }

      return { id: data.id, status: data.status };
    },

    /**
     * Get video generation status
     * @param {string} videoId - Video ID
     * @returns {Promise<{status: string, error: string|null}>}
     */
    async getVideoStatus(videoId) {
      const response = await request(`/videos/${videoId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || 'Unable to fetch status');
      }

      return { status: data.status, error: data.error?.message || null };
    },

    /**
     * Get video content
     * @param {string} videoId - Video ID
     * @returns {Promise<Buffer>}
     */
    async getVideoContent(videoId) {
      const response = await request(`/videos/${videoId}/content`);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error?.message || 'Unable to fetch video');
      }

      return Buffer.from(await response.arrayBuffer());
    },

    /**
     * Remix an existing video
     * @param {string} videoId - Video ID to remix
     * @param {string} prompt - Remix prompt
     * @returns {Promise<{id: string, status: string}>}
     */
    async remixVideo(videoId, prompt) {
      const response = await request(`/videos/${videoId}/remix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Remix failed');
      }

      return { id: data.id, status: data.status };
    },

    /**
     * Analyze an image using vision model (for validation)
     * @param {object} params
     * @param {string} params.imageDataUrl - Base64 data URL of the image
     * @param {string} params.prompt - Analysis prompt
     * @param {string} [params.model='gpt-4o'] - Model to use
     * @returns {Promise<{text: string}>}
     */
    async analyzeImage({ imageDataUrl, prompt, model = 'gpt-4o' }) {
      const response = await request('/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          input: [
            {
              role: 'user',
              content: [
                { type: 'input_text', text: prompt },
                { type: 'input_image', image_url: imageDataUrl }
              ]
            }
          ]
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || 'Image analysis failed');
      }

      return { data, id: data?.id };
    }
  };
}

/**
 * @typedef {ReturnType<typeof createOpenAIClient>} OpenAIClient
 */
