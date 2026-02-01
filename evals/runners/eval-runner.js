/**
 * Eval Runner for Campaign Studio
 * 
 * Orchestrates content generation and submits results to OpenAI Evals API.
 * 
 * Usage: npm run eval
 * 
 * Prerequisites:
 * 1. Run `npm run eval:setup` to create the eval configurations
 * 2. Add real test images to evals/datasets/subjects/ and evals/datasets/scenes/
 * 3. Ensure OPENAI_API_KEY is set in environment
 */

import 'dotenv/config';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

// Import services
import { createOpenAIClient } from '../../server/clients/openai.js';
import { createImageBlendingService } from '../../server/services/imageBlending.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASETS_DIR = path.join(__dirname, '..', 'datasets');
const RESULTS_DIR = path.join(__dirname, '..', 'results');
const EVAL_IDS_PATH = path.join(__dirname, '..', 'eval-ids.json');

// Ensure results directory exists
fs.mkdirSync(RESULTS_DIR, { recursive: true });

// Initialize OpenAI clients
const openai = new OpenAI();
const openaiClient = createOpenAIClient({ apiKey: process.env.OPENAI_API_KEY });

// Initialize services
const imageBlendingService = createImageBlendingService({ openaiClient });

// Load eval IDs
function loadEvalIds() {
  try {
    return JSON.parse(fs.readFileSync(EVAL_IDS_PATH, 'utf-8'));
  } catch (e) {
    console.error('Error: Eval IDs not found. Run `npm run eval:setup` first.');
    process.exit(1);
  }
}

// Load test cases
function loadTestCases() {
  const testCasesPath = path.join(DATASETS_DIR, 'test-cases.json');
  return JSON.parse(fs.readFileSync(testCasesPath, 'utf-8'));
}

// Read image file and prepare for service
function readImageFile(relativePath) {
  const fullPath = path.join(DATASETS_DIR, relativePath);
  const buffer = fs.readFileSync(fullPath);
  const ext = path.extname(fullPath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  return { buffer, mime, name: path.basename(fullPath) };
}

// Convert buffer to data URL
function bufferToDataUrl(buffer, mime = 'image/png') {
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

// Upload file to OpenAI for evals
async function uploadEvalsFile(jsonlContent, filename) {
  const tempPath = path.join(os.tmpdir(), filename);
  fs.writeFileSync(tempPath, jsonlContent);
  
  const file = await openai.files.create({
    file: fs.createReadStream(tempPath),
    purpose: 'evals'
  });
  
  fs.unlinkSync(tempPath);
  console.log(`  Uploaded: ${filename} (${file.id})`);
  return file.id;
}

// Wait for eval run to complete
async function waitForEvalRun(evalId, runId, maxWaitMs = 600000, pollInterval = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const run = await openai.evals.runs.retrieve(evalId, runId);
    
    if (run.status === 'completed') {
      return run;
    }
    
    if (run.status === 'failed' || run.status === 'canceled') {
      throw new Error(`Eval run ${run.status}: ${run.error || 'Unknown error'}`);
    }
    
    console.log(`  Eval run ${runId}: ${run.status}...`);
    await new Promise(r => setTimeout(r, pollInterval));
  }
  
  throw new Error('Eval run timed out');
}

/**
 * Run Image Quality Evaluations
 */
async function runImageQualityEval(evalId, testCases) {
  console.log('\n📸 Running Image Quality Eval...');
  
  const results = [];
  
  // Generate blended images
  for (const tc of testCases.imageBlending) {
    console.log(`  Generating: ${tc.id} - ${tc.description}`);
    
    try {
      const subjectImage = readImageFile(tc.subject);
      const sceneImage = readImageFile(tc.scene);
      
      const result = await imageBlendingService.blendImages({
        objectImage: subjectImage,
        sceneImage: sceneImage,
        userPrompt: tc.prompt
      });
      
      // Prepare eval item
      results.push({
        item: {
          subject_image_url: bufferToDataUrl(subjectImage.buffer, subjectImage.mime),
          scene_image_url: bufferToDataUrl(sceneImage.buffer, sceneImage.mime),
          prompt: tc.prompt,
          generated_image_url: `data:${result.mime};base64,${result.base64}`
        }
      });
      
      console.log(`    ✓ Generated`);
    } catch (error) {
      console.error(`    ✗ Failed: ${error.message}`);
    }
  }
  
  if (results.length === 0) {
    console.log('  No images generated, skipping eval');
    return { run: null };
  }
  
  // Upload JSONL file
  const jsonl = results.map(r => JSON.stringify(r)).join('\n');
  const fileId = await uploadEvalsFile(jsonl, `image-eval-${Date.now()}.jsonl`);
  
  // Create eval run
  console.log('  Creating eval run...');
  const run = await openai.evals.runs.create(evalId, {
    name: `Image Quality - ${new Date().toISOString()}`,
    data_source: {
      type: 'jsonl',
      source: {
        type: 'file_id',
        id: fileId
      }
    }
  });
  
  console.log(`  Run created: ${run.id}`);
  console.log(`  Dashboard: ${run.report_url}`);
  
  // Wait for completion
  const completedRun = await waitForEvalRun(evalId, run.id);
  console.log(`  Results: ${completedRun.result_counts.passed}/${completedRun.result_counts.total} passed`);
  
  return { run: completedRun };
}

/**
 * Main eval runner
 */
async function main() {
  console.log('🚀 Campaign Studio Eval Runner\n');
  console.log('='.repeat(50));
  
  // Check prerequisites
  if (!process.env.OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY not set');
    process.exit(1);
  }
  
  const evalIds = loadEvalIds();
  const testCases = loadTestCases();
  
  console.log('Eval IDs loaded:', Object.keys(evalIds).join(', '));
  console.log('Test cases:', {
    imageBlending: testCases.imageBlending?.length || 0
  });
  
  const startTime = Date.now();
  const summary = {
    imageQuality: null
  };
  
  try {
    // Image Quality Eval
    const imageResult = await runImageQualityEval(evalIds.imageQuality, testCases);
    summary.imageQuality = imageResult.run?.result_counts;
    
  } catch (error) {
    console.error('\n❌ Eval failed:', error.message);
  }
  
  // Print summary
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log('\n' + '='.repeat(50));
  console.log('📊 EVAL SUMMARY');
  console.log('='.repeat(50));
  
  for (const [name, result] of Object.entries(summary)) {
    if (result) {
      const passed = result.passed ?? 0;
      const total = result.total ?? 0;
      const status = passed === total ? '✅' : '⚠️';
      console.log(`${status} ${name}: ${passed}/${total} passed`);
    } else {
      console.log(`⏭️ ${name}: skipped`);
    }
  }
  
  console.log(`\n⏱️ Total time: ${elapsed} minutes`);
  
  // Save summary
  const summaryPath = path.join(RESULTS_DIR, `summary-${Date.now()}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    elapsed: `${elapsed} minutes`,
    summary
  }, null, 2));
  console.log(`\n📁 Summary saved: ${summaryPath}`);
}

main().catch(console.error);
