/**
 * Script Format Validator
 * 
 * Validates that generated video scripts follow the expected timestamp format
 * and duration constraints.
 * 
 * Expected format: [MM:SS-MM:SS] Description text
 * Example: [00:00-00:02] Product enters frame with smooth motion
 */

/**
 * Parse a timestamp string (MM:SS) to seconds
 * @param {string} timestamp - Timestamp in MM:SS format
 * @returns {number} Seconds
 */
function parseTimestamp(timestamp) {
  const [minutes, seconds] = timestamp.split(':').map(Number);
  return (minutes * 60) + seconds;
}

/**
 * Validate a generated script
 * 
 * @param {string} script - The generated script text
 * @param {number} expectedSeconds - Expected duration in seconds
 * @param {Object} options - Validation options
 * @param {number} options.tolerance - Duration tolerance in seconds (default: 1)
 * @returns {{valid: boolean, errors: string[], segments: Object[]}}
 */
export function validateScript(script, expectedSeconds, options = {}) {
  const tolerance = options.tolerance ?? 1;
  const errors = [];
  const segments = [];

  // Pattern to match timestamp ranges: [MM:SS-MM:SS]
  const timestampPattern = /\[(\d{2}):(\d{2})-(\d{2}):(\d{2})\]/g;
  
  const matches = [...script.matchAll(timestampPattern)];

  if (matches.length === 0) {
    return {
      valid: false,
      errors: ['No valid timestamp patterns found. Expected format: [MM:SS-MM:SS]'],
      segments: []
    };
  }

  // Parse all segments
  for (const match of matches) {
    const [fullMatch, startMin, startSec, endMin, endSec] = match;
    const start = (parseInt(startMin) * 60) + parseInt(startSec);
    const end = (parseInt(endMin) * 60) + parseInt(endSec);

    segments.push({
      raw: fullMatch,
      start,
      end,
      duration: end - start
    });
  }

  // Validate: first segment should start at 0
  if (segments[0].start !== 0) {
    errors.push(`First segment should start at 00:00, but starts at ${segments[0].raw.split('-')[0]}`);
  }

  // Validate: segments should be contiguous (no gaps or overlaps)
  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1];
    const curr = segments[i];
    
    if (curr.start !== prev.end) {
      errors.push(`Gap or overlap between segments: ${prev.raw} and ${curr.raw}`);
    }
  }

  // Validate: segment durations should be positive
  for (const seg of segments) {
    if (seg.duration <= 0) {
      errors.push(`Invalid segment duration: ${seg.raw} (${seg.duration}s)`);
    }
  }

  // Validate: total duration should match expected (within tolerance)
  const lastSegment = segments[segments.length - 1];
  const totalDuration = lastSegment.end;
  
  if (Math.abs(totalDuration - expectedSeconds) > tolerance) {
    errors.push(
      `Total duration (${totalDuration}s) doesn't match expected (${expectedSeconds}s) within ±${tolerance}s tolerance`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    segments,
    totalDuration
  };
}

/**
 * Quick check if a script has valid format (non-strict)
 * Just checks if there are any timestamp patterns
 * 
 * @param {string} script - The script text
 * @returns {boolean} True if at least one valid timestamp found
 */
export function hasValidFormat(script) {
  const pattern = /\[\d{2}:\d{2}-\d{2}:\d{2}\]/;
  return pattern.test(script);
}

/**
 * Extract duration from a script's timestamps
 * 
 * @param {string} script - The script text
 * @returns {number|null} Duration in seconds, or null if no valid timestamps
 */
export function extractDuration(script) {
  const pattern = /\[\d{2}:\d{2}-(\d{2}):(\d{2})\]/g;
  const matches = [...script.matchAll(pattern)];
  
  if (matches.length === 0) return null;
  
  const lastMatch = matches[matches.length - 1];
  const [, endMin, endSec] = lastMatch;
  return (parseInt(endMin) * 60) + parseInt(endSec);
}

/**
 * Format validation result for display
 * 
 * @param {Object} result - Result from validateScript
 * @returns {string} Formatted string for logging
 */
export function formatValidationResult(result) {
  const lines = [];
  
  if (result.valid) {
    lines.push('✅ Script format is valid');
  } else {
    lines.push('❌ Script format validation failed');
  }
  
  lines.push(`   Segments: ${result.segments.length}`);
  lines.push(`   Total duration: ${result.totalDuration || 'N/A'}s`);
  
  if (result.errors.length > 0) {
    lines.push('   Errors:');
    for (const err of result.errors) {
      lines.push(`     - ${err}`);
    }
  }
  
  return lines.join('\n');
}
