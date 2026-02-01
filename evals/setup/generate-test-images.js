/**
 * Generate Test Images using OpenAI
 * 
 * Uses OpenAI's image generation API to create realistic test images
 * for the evaluation suite.
 * 
 * Run: node evals/setup/generate-test-images.js
 */

import 'dotenv/config';
import OpenAI from 'openai';
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

const openai = new OpenAI();

/**
 * Subject image prompts - isolated product shots on white/transparent backgrounds
 */
const SUBJECT_PROMPTS = [
  {
    filename: 'subject-bottle.png',
    prompt: `Professional product photography of a single elegant glass water bottle with a minimalist blue label, isolated on a pure white background. Clean studio lighting, sharp focus, high-end commercial photography style. The bottle should be centered and fill most of the frame. No shadows, no reflections, no other objects.`
  },
  {
    filename: 'subject-mug.png',
    prompt: `Professional product photography of a single white ceramic coffee mug with a simple modern design, isolated on a pure white background. Clean studio lighting, sharp focus, high-end commercial photography style. The mug should be centered and fill most of the frame. No shadows, no reflections, no other objects.`
  },
  {
    filename: 'subject-sneaker.png',
    prompt: `Professional product photography of a single modern white athletic sneaker shoe, isolated on a pure white background. Clean studio lighting, sharp focus, high-end commercial photography style. The sneaker should be shown from a 3/4 angle, centered and filling most of the frame. No shadows, no reflections, no other objects.`
  }
];

/**
 * Scene image prompts - empty backgrounds suitable for product compositing
 */
const SCENE_PROMPTS = [
  {
    filename: 'scene-kitchen.png',
    prompt: `Empty modern kitchen counter surface, marble or quartz countertop, soft natural daylight from a window on the left. Blurred kitchen cabinets in the background. No objects on the counter - completely empty surface ready for product placement. Warm, inviting atmosphere. Portrait orientation, vertical composition.`
  },
  {
    filename: 'scene-outdoor.png',
    prompt: `Empty rustic wooden outdoor table surface in a garden setting, soft morning sunlight, blurred green foliage and flowers in the background. No objects on the table - completely empty surface ready for product placement. Natural, fresh atmosphere. Portrait orientation, vertical composition.`
  },
  {
    filename: 'scene-studio.png',
    prompt: `Empty minimalist photography studio surface, light gray seamless backdrop, soft professional studio lighting with subtle gradient. No objects - completely empty surface ready for product placement. Clean, professional commercial photography setting. Portrait orientation, vertical composition.`
  },
  {
    filename: 'scene-white.png',
    prompt: `Pure white background with very subtle soft gradient shadow at the bottom, professional product photography backdrop. Completely empty, no objects, no textures - just clean white space ready for product placement. Portrait orientation, vertical composition.`
  }
];

/**
 * Generate an image using OpenAI and save it
 */
async function generateAndSaveImage(prompt, outputPath, size = '1024x1536', options = {}) {
  console.log(`  Generating: ${path.basename(outputPath)}...`);
  
  try {
    const response = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: prompt,
      n: 1,
      size: size,
      quality: options.quality || 'medium',
      ...(options.background && { background: options.background })
    });

    const base64 = response.data[0].b64_json;
    const buffer = Buffer.from(base64, 'base64');
    
    fs.writeFileSync(outputPath, buffer);
    console.log(`    ✓ Saved (${(buffer.length / 1024).toFixed(1)} KB)`);
    
    return true;
  } catch (error) {
    console.error(`    ✗ Failed: ${error.message}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🎨 Generating Test Images for Evals\n');
  console.log('Using OpenAI image generation API...\n');

  let successCount = 0;
  let totalCount = SUBJECT_PROMPTS.length + SCENE_PROMPTS.length;

  // Generate subject images (square for products, with transparent background)
  console.log('📦 Subject Images (products):');
  for (const item of SUBJECT_PROMPTS) {
    const outputPath = path.join(SUBJECTS_DIR, item.filename);
    const success = await generateAndSaveImage(
      item.prompt, 
      outputPath, 
      '1024x1024',
      { quality: 'high', background: 'transparent' }
    );
    if (success) successCount++;
  }

  // Generate scene images (portrait for video-compatible backgrounds)
  console.log('\n🖼️ Scene Images (backgrounds):');
  for (const item of SCENE_PROMPTS) {
    const outputPath = path.join(SCENES_DIR, item.filename);
    const success = await generateAndSaveImage(
      item.prompt, 
      outputPath, 
      '1024x1536',
      { quality: 'medium' }
    );
    if (success) successCount++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Generated ${successCount}/${totalCount} images`);
  console.log(`\nSubjects: ${SUBJECTS_DIR}`);
  console.log(`Scenes: ${SCENES_DIR}`);
  
  if (successCount < totalCount) {
    console.log('\n⚠️ Some images failed to generate. You may want to re-run or add manually.');
  }

  console.log('\n📋 Next steps:');
  console.log('1. Review the generated images');
  console.log('2. Run the eval suite: npm run eval');
}

main().catch(console.error);
