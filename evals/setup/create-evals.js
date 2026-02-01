/**
 * Create OpenAI Eval configurations for Campaign Studio
 * 
 * This script creates three evals:
 * 1. Image Quality Eval - evaluates image blending quality
 * 2. Video Identity Eval - evaluates subject preservation in video frames
 * 3. Remix B&W Eval - verifies video remix applied correctly
 * 
 * Run: npm run eval:setup
 */

import 'dotenv/config';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVAL_IDS_PATH = path.join(__dirname, '..', 'eval-ids.json');

const openai = new OpenAI();

// Load existing eval IDs if available
function loadEvalIds() {
  try {
    return JSON.parse(fs.readFileSync(EVAL_IDS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

// Save eval IDs to file
function saveEvalIds(ids) {
  fs.writeFileSync(EVAL_IDS_PATH, JSON.stringify(ids, null, 2));
}

/**
 * Create Image Quality Eval
 * Evaluates blended images for subject preservation, scene integration, and overall quality
 */
async function createImageQualityEval() {
  console.log('Creating Image Quality Eval...');
  
  const evalObj = await openai.evals.create({
    name: 'Campaign Studio - Image Quality',
    data_source_config: {
      type: 'custom',
      item_schema: {
        type: 'object',
        properties: {
          subject_image_url: { type: 'string', description: 'URL of the subject/product image' },
          scene_image_url: { type: 'string', description: 'URL of the scene/background image' },
          prompt: { type: 'string', description: 'User prompt for the image blend' },
          generated_image_url: { type: 'string', description: 'URL of the generated blended image' }
        },
        required: ['subject_image_url', 'scene_image_url', 'prompt', 'generated_image_url']
      },
      include_sample_schema: false
    },
    testing_criteria: [
      {
        type: 'label_model',
        name: 'Image Quality Grader',
        model: 'gpt-4o',
        input: [
          {
            role: 'developer',
            content: `You are an expert evaluator for marketing creative images. You will be shown:
1. A subject/product image (the item to be composited)
2. A scene/background image
3. The final blended result
4. The prompt used for the blend

Evaluate the final image and assign one of these labels:
- "excellent": Subject is perfectly preserved, naturally integrated into scene, professional quality
- "good": Subject mostly preserved, decent integration, minor issues
- "acceptable": Subject recognizable, some integration issues, usable for drafts
- "poor": Significant quality issues, subject distorted or poorly integrated
- "failed": Subject unrecognizable or major generation failures

Consider:
- Subject identity preservation (is the product/item recognizable and accurate?)
- Scene integration (does the subject look natural in the scene?)
- Overall visual quality (lighting, shadows, composition)`
          },
          {
            role: 'user',
            content: [
              { type: 'input_text', text: 'Prompt: {{ item.prompt }}\n\nSubject image:' },
              { type: 'input_image', image_url: '{{ item.subject_image_url }}' },
              { type: 'input_text', text: '\n\nScene image:' },
              { type: 'input_image', image_url: '{{ item.scene_image_url }}' },
              { type: 'input_text', text: '\n\nGenerated result:' },
              { type: 'input_image', image_url: '{{ item.generated_image_url }}' }
            ]
          }
        ],
        labels: ['excellent', 'good', 'acceptable', 'poor', 'failed'],
        passing_labels: ['excellent', 'good', 'acceptable']
      }
    ],
    metadata: {
      description: 'Evaluates image blending quality for Campaign Studio'
    }
  });

  console.log(`  Created: ${evalObj.id}`);
  return evalObj.id;
}

/**
 * Create Video Identity Eval
 * Evaluates if the subject is preserved across video frames
 */
async function createVideoIdentityEval() {
  console.log('Creating Video Identity Eval...');
  
  const evalObj = await openai.evals.create({
    name: 'Campaign Studio - Video Identity',
    data_source_config: {
      type: 'custom',
      item_schema: {
        type: 'object',
        properties: {
          reference_image_url: { type: 'string', description: 'URL of the reference product image' },
          frame_urls: {
            type: 'array',
            items: { type: 'string' },
            description: 'URLs of extracted video frames (8 frames)'
          },
          script: { type: 'string', description: 'The script/prompt used for video generation' }
        },
        required: ['reference_image_url', 'frame_urls', 'script']
      },
      include_sample_schema: false
    },
    testing_criteria: [
      {
        type: 'label_model',
        name: 'Video Identity Grader',
        model: 'gpt-4o',
        input: [
          {
            role: 'developer',
            content: `You are an expert evaluator for AI-generated marketing videos. You will be shown:
1. A reference product image (what the subject should look like)
2. 8 frames extracted from the generated video

Evaluate if the subject/product maintains its identity throughout the video and assign one of these labels:
- "excellent": Subject perfectly preserved in all frames, instantly recognizable as the same product
- "good": Subject mostly consistent, minor variations but clearly the same item
- "acceptable": Subject recognizable but some frames show notable differences
- "poor": Subject identity inconsistent, hard to tell it's the same product
- "failed": Subject unrecognizable or completely different from reference

Focus on:
- Is the product/subject consistent across all frames?
- Does it match the reference image in key visual features?
- Are there any major morphing or identity drift issues?`
          },
          {
            role: 'user',
            content: [
              { type: 'input_text', text: 'Script: {{ item.script }}\n\nReference product image:' },
              { type: 'input_image', image_url: '{{ item.reference_image_url }}' },
              { type: 'input_text', text: '\n\nVideo frames (in order):' },
              { type: 'input_image', image_url: '{{ item.frame_urls[0] }}' },
              { type: 'input_image', image_url: '{{ item.frame_urls[1] }}' },
              { type: 'input_image', image_url: '{{ item.frame_urls[2] }}' },
              { type: 'input_image', image_url: '{{ item.frame_urls[3] }}' },
              { type: 'input_image', image_url: '{{ item.frame_urls[4] }}' },
              { type: 'input_image', image_url: '{{ item.frame_urls[5] }}' },
              { type: 'input_image', image_url: '{{ item.frame_urls[6] }}' },
              { type: 'input_image', image_url: '{{ item.frame_urls[7] }}' }
            ]
          }
        ],
        labels: ['excellent', 'good', 'acceptable', 'poor', 'failed'],
        passing_labels: ['excellent', 'good', 'acceptable']
      }
    ],
    metadata: {
      description: 'Evaluates subject identity preservation in generated videos'
    }
  });

  console.log(`  Created: ${evalObj.id}`);
  return evalObj.id;
}

/**
 * Create Remix B&W Eval
 * Verifies that the B&W remix was applied correctly
 */
async function createRemixBWEval() {
  console.log('Creating Remix B&W Eval...');
  
  const evalObj = await openai.evals.create({
    name: 'Campaign Studio - Remix B&W Verification',
    data_source_config: {
      type: 'custom',
      item_schema: {
        type: 'object',
        properties: {
          frame_url: { type: 'string', description: 'URL of a frame from the remixed video' },
          remix_prompt: { type: 'string', description: 'The remix prompt (should be B&W conversion)' }
        },
        required: ['frame_url', 'remix_prompt']
      },
      include_sample_schema: false
    },
    testing_criteria: [
      {
        type: 'label_model',
        name: 'Remix B&W Verifier',
        model: 'gpt-4o-mini',
        input: [
          {
            role: 'developer',
            content: `You are verifying if a video frame has been converted to black and white.

The remix prompt requested: "{{ item.remix_prompt }}"

Look at the provided video frame and determine if it is in black and white (grayscale).

Assign one of these labels:
- "pass": The image is clearly in black and white / grayscale
- "fail": The image still has color or the effect was not applied`
          },
          {
            role: 'user',
            content: [
              { type: 'input_text', text: 'Video frame:' },
              { type: 'input_image', image_url: '{{ item.frame_url }}' }
            ]
          }
        ],
        labels: ['pass', 'fail'],
        passing_labels: ['pass']
      }
    ],
    metadata: {
      description: 'Verifies B&W remix effect was correctly applied'
    }
  });

  console.log(`  Created: ${evalObj.id}`);
  return evalObj.id;
}

/**
 * Main function to create all evals
 */
async function main() {
  console.log('Setting up Campaign Studio Evals...\n');
  
  const existingIds = loadEvalIds();
  const evalIds = { ...existingIds };

  try {
    // Create evals (only if not already created)
    if (!evalIds.imageQuality) {
      evalIds.imageQuality = await createImageQualityEval();
    } else {
      console.log(`Image Quality Eval already exists: ${evalIds.imageQuality}`);
    }

    if (!evalIds.videoIdentity) {
      evalIds.videoIdentity = await createVideoIdentityEval();
    } else {
      console.log(`Video Identity Eval already exists: ${evalIds.videoIdentity}`);
    }

    if (!evalIds.remixBW) {
      evalIds.remixBW = await createRemixBWEval();
    } else {
      console.log(`Remix B&W Eval already exists: ${evalIds.remixBW}`);
    }

    // Save eval IDs
    saveEvalIds(evalIds);

    console.log('\n✅ Eval setup complete!');
    console.log('\nEval IDs saved to:', EVAL_IDS_PATH);
    console.log(JSON.stringify(evalIds, null, 2));
    
  } catch (error) {
    console.error('\n❌ Error creating evals:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

main();
