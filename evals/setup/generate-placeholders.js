/**
 * Generate placeholder test images using sharp
 * 
 * Creates simple colored rectangles as placeholders for testing the eval pipeline.
 * Replace with real product/scene images for actual evaluation.
 * 
 * Run: node evals/setup/generate-placeholders.js
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASETS_DIR = path.join(__dirname, '..', 'datasets');

const SUBJECTS_DIR = path.join(DATASETS_DIR, 'subjects');
const SCENES_DIR = path.join(DATASETS_DIR, 'scenes');

// Ensure directories exist
fs.mkdirSync(SUBJECTS_DIR, { recursive: true });
fs.mkdirSync(SCENES_DIR, { recursive: true });

/**
 * Create a placeholder image with text label
 */
async function createPlaceholder(outputPath, width, height, color, label) {
  // Create SVG with label
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="${Math.min(width, height) / 10}px" 
        fill="#333" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >${label}</text>
      <text 
        x="50%" 
        y="60%" 
        font-family="Arial, sans-serif" 
        font-size="${Math.min(width, height) / 20}px" 
        fill="#666" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >PLACEHOLDER</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
  
  console.log(`  Created: ${path.basename(outputPath)}`);
}

async function main() {
  console.log('Generating placeholder test images...\n');

  // Subject images (512x512)
  console.log('Subject images:');
  await createPlaceholder(
    path.join(SUBJECTS_DIR, 'subject-bottle.png'),
    512, 512, '#e0e8f0', 'BOTTLE'
  );
  await createPlaceholder(
    path.join(SUBJECTS_DIR, 'subject-mug.png'),
    512, 512, '#f0e8e0', 'MUG'
  );
  await createPlaceholder(
    path.join(SUBJECTS_DIR, 'subject-sneaker.png'),
    512, 512, '#e8f0e0', 'SNEAKER'
  );

  // Scene images (1024x1536 - portrait for video)
  console.log('\nScene images:');
  await createPlaceholder(
    path.join(SCENES_DIR, 'scene-kitchen.png'),
    1024, 1536, '#f5f0e8', 'KITCHEN'
  );
  await createPlaceholder(
    path.join(SCENES_DIR, 'scene-outdoor.png'),
    1024, 1536, '#e8f5e8', 'OUTDOOR'
  );
  await createPlaceholder(
    path.join(SCENES_DIR, 'scene-studio.png'),
    1024, 1536, '#f0f0f0', 'STUDIO'
  );
  await createPlaceholder(
    path.join(SCENES_DIR, 'scene-white.png'),
    1024, 1536, '#ffffff', 'WHITE'
  );

  console.log('\n✅ Placeholder images generated!');
  console.log('\nNote: Replace these with real product/scene images for actual evaluation.');
  console.log(`Subjects: ${SUBJECTS_DIR}`);
  console.log(`Scenes: ${SCENES_DIR}`);
}

main().catch(console.error);
