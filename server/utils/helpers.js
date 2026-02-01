/**
 * Convert a base64 data URL to a buffer
 * @param {string} dataUrl - Data URL in format: data:image/png;base64,...
 * @returns {{ mime: string, buffer: Buffer } | null}
 */
export function base64ToBuffer(dataUrl) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], 'base64')
  };
}

/**
 * Extract output text from OpenAI Responses API response
 * @param {object} data - Response data from OpenAI
 * @returns {string}
 */
export function extractOutputText(data) {
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
