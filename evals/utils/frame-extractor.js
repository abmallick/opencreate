/**
 * Frame Extractor Utility
 * 
 * Extracts evenly-spaced frames from video files using ffmpeg.
 * Used for video evaluation - frames are sent to OpenAI for visual analysis.
 */

import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Get video duration in seconds
 * @param {string} videoPath - Path to video file
 * @returns {Promise<number>} Duration in seconds
 */
export async function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`Failed to probe video: ${err.message}`));
        return;
      }
      const duration = metadata.format.duration;
      if (typeof duration !== 'number') {
        reject(new Error('Could not determine video duration'));
        return;
      }
      resolve(duration);
    });
  });
}

/**
 * Extract frames from a video file
 * 
 * @param {string} videoPath - Path to the video file
 * @param {Object} options - Extraction options
 * @param {number} options.count - Number of frames to extract (default: 8)
 * @param {string} options.outputDir - Output directory (default: temp dir)
 * @param {string} options.format - Output format: 'buffer' or 'file' (default: 'file')
 * @returns {Promise<{frames: Buffer[]|string[], timestamps: number[], duration: number}>}
 */
export async function extractFrames(videoPath, options = {}) {
  const count = options.count || 8;
  const outputDir = options.outputDir || fs.mkdtempSync(path.join(os.tmpdir(), 'frames-'));
  const format = options.format || 'file';

  // Get video duration
  const duration = await getVideoDuration(videoPath);
  
  // Calculate timestamps for evenly-spaced frames
  // Skip first and last 0.5 seconds to avoid black frames
  const start = Math.min(0.5, duration * 0.1);
  const end = Math.max(duration - 0.5, duration * 0.9);
  const interval = (end - start) / (count - 1);
  
  const timestamps = [];
  for (let i = 0; i < count; i++) {
    timestamps.push(start + (interval * i));
  }

  const framePaths = [];

  // Extract each frame at the calculated timestamps
  const extractionPromises = timestamps.map((timestamp, index) => {
    return new Promise((resolve, reject) => {
      const framePath = path.join(outputDir, `frame-${String(index).padStart(3, '0')}.png`);
      framePaths.push(framePath);

      ffmpeg(videoPath)
        .seekInput(timestamp)
        .outputOptions([
          '-vframes', '1',
          '-q:v', '2' // High quality JPEG
        ])
        .output(framePath)
        .on('end', () => resolve(framePath))
        .on('error', (err) => reject(new Error(`Failed to extract frame ${index}: ${err.message}`)))
        .run();
    });
  });

  await Promise.all(extractionPromises);

  // Return based on format
  if (format === 'buffer') {
    const frames = framePaths.map(fp => fs.readFileSync(fp));
    // Clean up temp files
    framePaths.forEach(fp => {
      try { fs.unlinkSync(fp); } catch {}
    });
    try { fs.rmdirSync(outputDir); } catch {}
    return { frames, timestamps, duration };
  }

  return { frames: framePaths, timestamps, duration };
}

/**
 * Extract a single frame at a specific timestamp
 * 
 * @param {string} videoPath - Path to the video file
 * @param {number} timestamp - Timestamp in seconds (or 'middle' for middle frame)
 * @param {Object} options - Options
 * @param {string} options.outputPath - Output file path (optional, uses temp if not provided)
 * @param {string} options.format - 'buffer' or 'file' (default: 'file')
 * @returns {Promise<Buffer|string>} Frame as buffer or file path
 */
export async function extractSingleFrame(videoPath, timestamp, options = {}) {
  const format = options.format || 'file';
  
  // Handle 'middle' timestamp
  if (timestamp === 'middle') {
    const duration = await getVideoDuration(videoPath);
    timestamp = duration / 2;
  }

  const outputPath = options.outputPath || 
    path.join(os.tmpdir(), `frame-${Date.now()}-${Math.random().toString(36).slice(2)}.png`);

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(timestamp)
      .outputOptions([
        '-vframes', '1',
        '-q:v', '2'
      ])
      .output(outputPath)
      .on('end', () => {
        if (format === 'buffer') {
          const buffer = fs.readFileSync(outputPath);
          try { fs.unlinkSync(outputPath); } catch {}
          resolve(buffer);
        } else {
          resolve(outputPath);
        }
      })
      .on('error', (err) => reject(new Error(`Failed to extract frame: ${err.message}`)))
      .run();
  });
}

/**
 * Convert frame buffers to base64 data URLs
 * 
 * @param {Buffer[]} frames - Array of frame buffers (PNG format)
 * @returns {string[]} Array of data URLs
 */
export function framesToDataUrls(frames) {
  return frames.map(buffer => {
    const base64 = buffer.toString('base64');
    return `data:image/png;base64,${base64}`;
  });
}

/**
 * Clean up temporary frame files
 * 
 * @param {string[]} framePaths - Array of file paths to delete
 */
export function cleanupFrames(framePaths) {
  for (const fp of framePaths) {
    try {
      fs.unlinkSync(fp);
    } catch {
      // Ignore errors
    }
  }
}
