<template>
  <div class="page">
    <header class="top">
      <div>
        <p class="eyebrow">Creative Studio</p>
        <h1>Compose standout product visuals.</h1>
        <p class="lede">
          A minimal flow for marketing teams: upload a product, set the scene, and generate image + video
          in one place.
        </p>
      </div>
      <div class="mode-tabs">
        <button class="tab" @click="mode = 'creative'" :class="{ active: mode === 'creative' }">
          Create Creative
        </button>
        <button class="tab" @click="mode = 'video'" :class="{ active: mode === 'video' }">
          Create Ad
        </button>
      </div>
    </header>

    <section class="stage">
      <div class="panel">
        <div v-if="mode === 'creative'" class="stack">
          <div class="drop-grid">
            <label class="drop" :class="{ filled: objectPreview }">
              <input type="file" accept="image/*" @change="onObjectImage" />
              <div v-if="!objectPreview" class="drop-empty">
                <strong>Drop in your product image</strong>
                <span>PNG or JPG · best with clean background</span>
              </div>
              <div v-else class="drop-preview">
                <img :src="objectPreview" alt="Product preview" />
                <button type="button" class="ghost" @click="clearObject">Replace</button>
              </div>
            </label>

            <label class="drop" :class="{ filled: scenePreview }">
              <input type="file" accept="image/*" @change="onSceneImage" />
              <div v-if="!scenePreview" class="drop-empty">
                <strong>Add a scene image (optional)</strong>
                <span>Wide shot works best</span>
              </div>
              <div v-else class="drop-preview">
                <img :src="scenePreview" alt="Scene preview" />
                <button type="button" class="ghost" @click="clearScene">Replace</button>
              </div>
            </label>
          </div>

          <label class="field">
            <span>Prompt for creative</span>
            <textarea
              v-model="prompt"
              placeholder="Place the product on a terrazzo counter with warm daylight"
            ></textarea>
          </label>

          <div class="row">
            <button class="primary" :disabled="!canGenerate || imageLoading" @click="generateImage">
              <span v-if="!imageLoading">Generate creative</span>
              <span v-else>Composing…</span>
            </button>
          </div>
          <p v-if="imageError" class="error">{{ imageError }}</p>
        </div>

        <div v-else class="stack">
          <div class="drop single" :class="{ filled: videoInputPreview }">
            <div v-if="!videoInputPreview" class="drop-empty">
              <strong>Use generated image or upload one</strong>
              <span>We will use this as the first frame</span>
              <label class="tiny">
                <input type="file" accept="image/*" @change="onVideoInputImage" />
                <span>Upload image</span>
              </label>
              <button
                v-if="generatedImage"
                type="button"
                class="ghost"
                @click="useGeneratedForVideo"
              >
                Use generated
              </button>
            </div>
            <div v-else class="drop-preview">
              <img :src="videoInputPreview" alt="Video input preview" />
              <div class="inline-actions">
                <button type="button" class="ghost" @click="clearVideoInput">Replace</button>
                <button
                  v-if="generatedImage"
                  type="button"
                  class="ghost"
                  @click="useGeneratedForVideo"
                >
                  Use generated
                </button>
              </div>
            </div>
          </div>

          <label class="field">
            <span>Ad brief</span>
            <textarea
              v-model="videoPrompt"
              placeholder="Couple sits on the sofa, cozy weekend feel, Instagram style"
            ></textarea>
          </label>

          <label class="field">
            <span>Video duration</span>
            <select v-model="videoDuration">
              <option value="4">4 seconds</option>
              <option value="8">8 seconds</option>
              <option value="12">12 seconds</option>
            </select>
          </label>

          <div class="row">
            <button
              class="primary"
              :disabled="!canGenerateScript || scriptLoading"
              @click="generateVideoScript"
            >
              <span v-if="!scriptLoading">Generate script</span>
              <span v-else>Writing…</span>
            </button>
            <button
              class="ghost"
              :disabled="!videoScript || !videoSubmitted"
              @click="toggleScriptPanel"
            >
              {{ showScriptPanel ? 'Hide script' : 'View script' }}
            </button>
            <button
              class="primary ad-cta"
              :disabled="!canGenerateVideo || videoLoading"
              @click="generateVideo"
            >
              <span v-if="!videoLoading">Generate ad</span>
              <span v-else>Animating…</span>
            </button>
          </div>
          <p v-if="videoError" class="error">{{ videoError }}</p>
        </div>
      </div>

      <div class="preview">
        <div v-if="mode === 'creative'" class="preview-card">
          <div v-if="!generatedImage && !imageLoading" class="empty">Your creative appears here.</div>
          <div v-if="imageLoading && !generatedImage" class="loading">
            <div class="spinner"></div>
            <p>Blending subject with scene…</p>
          </div>
          <div v-if="generatedImage" class="result">
            <div class="image-container">
              <img :src="generatedImage" alt="Generated creative" />
              <div v-if="isRegenerating" class="image-overlay">
                <div class="spinner"></div>
                <p>Editing image…</p>
              </div>
            </div>
            <label class="field preview-field">
              <span>Edit prompt</span>
              <textarea v-model="previewPrompt" placeholder="Refine your prompt..."></textarea>
            </label>
            <div class="result-actions">
              <div class="row">
                <button class="primary" :disabled="!canRegenerate || isRegenerating" @click="regenerateImage">
                  <span v-if="!isRegenerating">Regenerate</span>
                  <span v-else>Editing…</span>
                </button>
                <button class="ghost" @click="downloadImage">Download</button>
              </div>
              <div class="row secondary">
                <button class="ghost" @click="clearGenerated">Clear</button>
                <button class="ghost" @click="mode = 'video'">Generate ad</button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="preview-card">
          <div v-if="showScriptPanel || !videoSubmitted" class="script-panel">
            <p class="script-title">Generated script (editable)</p>
            <textarea
              v-model="videoScript"
              class="script-textarea"
              placeholder="Generate a script to preview here"
            ></textarea>
            <div class="script-meta">Review and edit before generating the ad.</div>
          </div>
          <div v-else>
            <div v-if="videoLoading" class="loading">
              <div class="spinner"></div>
              <p>Rendering your ad…</p>
            </div>
            <div v-else-if="videoStatus && !videoCompleted" class="status-panel">
              <div class="spinner"></div>
              <p>{{ videoStatusLabel }}</p>
            </div>
            <div v-if="videoUrl" class="result">
              <video controls :src="videoUrl"></video>
              <div class="row">
                <button class="primary" @click="downloadVideo">Download</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';

const mode = ref('creative');

const objectFile = ref(null);
const sceneFile = ref(null);
const objectPreview = ref('');
const scenePreview = ref('');
const objectError = ref('');
const sceneError = ref('');
const imageError = ref('');
const videoError = ref('');
const imageLoading = ref(false);
const videoLoading = ref(false);
const scriptLoading = ref(false);
const generatedImage = ref('');
const videoUrl = ref('');
const videoStatus = ref('');
const videoId = ref('');
const videoSubmitted = ref(false);

const prompt = ref('');
const previewPrompt = ref('');
const videoPrompt = ref('');
const videoScript = ref('');
const videoDuration = ref('4');
const videoInputFile = ref(null);
const videoInputPreview = ref('');
const showScriptPanel = ref(false);
const isRegenerating = ref(false);

let pollTimer = null;

const maxFileSize = 12 * 1024 * 1024;

const canGenerate = computed(() => objectFile.value);
const canRegenerate = computed(() => generatedImage.value && previewPrompt.value.trim());
const canGenerateScript = computed(
  () => videoInputPreview.value && videoPrompt.value.trim() && videoDuration.value
);
const canGenerateVideo = computed(
  () => videoInputPreview.value && videoScript.value.trim() && videoDuration.value
);
const videoCompleted = computed(() => {
  const status = (videoStatus.value || '').toLowerCase().trim();
  return status.includes('completed');
});
const videoStatusLabel = computed(() => {
  const status = (videoStatus.value || '').toLowerCase().trim();
  if (!status) return '';
  const normalized = status.replace(/[\s-]+/g, '_');
  const labels = {
    in_progress: 'In Progress',
    queued: 'Queued',
    pending: 'Queued',
    running: 'In Progress',
    processing: 'In Progress',
    rendering: 'Rendering',
    submitted: 'Submitting',
    submitted_to_sora: 'Submitting',
    completed: 'Completed',
    failed: 'Failed'
  };
  return labels[normalized] || 'In Progress';
});

function validateImage(file) {
  if (!file) return 'Please select an image.';
  if (!file.type.startsWith('image/')) return 'Only image files are supported.';
  if (file.size > maxFileSize) return 'Image is too large (max 12MB).';
  return '';
}

function toPreview(file, setter) {
  const reader = new FileReader();
  reader.onload = (e) => setter(e.target.result);
  reader.readAsDataURL(file);
}

function onObjectImage(event) {
  const file = event.target.files?.[0];
  objectError.value = validateImage(file);
  if (objectError.value) {
    objectFile.value = null;
    objectPreview.value = '';
    return;
  }
  objectFile.value = file;
  toPreview(file, (val) => (objectPreview.value = val));
}

function onSceneImage(event) {
  const file = event.target.files?.[0];
  sceneError.value = validateImage(file);
  if (sceneError.value) {
    sceneFile.value = null;
    scenePreview.value = '';
    return;
  }
  sceneFile.value = file;
  toPreview(file, (val) => (scenePreview.value = val));
}

function onVideoInputImage(event) {
  const file = event.target.files?.[0];
  videoError.value = validateImage(file);
  if (videoError.value) {
    videoInputFile.value = null;
    videoInputPreview.value = '';
    return;
  }
  videoInputFile.value = file;
  toPreview(file, (val) => (videoInputPreview.value = val));
}

function useGeneratedForVideo() {
  if (!generatedImage.value) return;
  videoInputPreview.value = generatedImage.value;
  videoInputFile.value = null;
}

function clearObject() {
  objectFile.value = null;
  objectPreview.value = '';
}

function clearScene() {
  sceneFile.value = null;
  scenePreview.value = '';
}

function clearGenerated() {
  generatedImage.value = '';
  previewPrompt.value = '';
  isRegenerating.value = false;
  videoUrl.value = '';
  videoStatus.value = '';
  videoId.value = '';
  videoScript.value = '';
  videoSubmitted.value = false;
  if (pollTimer) clearInterval(pollTimer);
}

function clearVideoInput() {
  videoInputPreview.value = '';
  videoInputFile.value = null;
  videoScript.value = '';
  showScriptPanel.value = false;
}

function clearVideoOutput() {
  videoUrl.value = '';
  videoStatus.value = '';
  videoId.value = '';
  videoSubmitted.value = false;
  showScriptPanel.value = false;
  if (pollTimer) clearInterval(pollTimer);
}

function resetAll() {
  clearObject();
  clearScene();
  clearGenerated();
  clearVideoInput();
  prompt.value = '';
  previewPrompt.value = '';
  videoPrompt.value = '';
  videoScript.value = '';
  videoDuration.value = '4';
  videoSubmitted.value = false;
  showScriptPanel.value = false;
  objectError.value = '';
  sceneError.value = '';
  imageError.value = '';
  videoError.value = '';
}

async function generateImage() {
  imageError.value = '';
  videoError.value = '';
  if (!canGenerate.value) {
    imageError.value = 'Please add a product image before generating.';
    return;
  }

  imageLoading.value = true;
  generatedImage.value = '';
  videoUrl.value = '';
  videoStatus.value = '';
  videoId.value = '';

  try {
    const payload = new FormData();
    payload.append('objectImage', objectFile.value);
    if (sceneFile.value) payload.append('sceneImage', sceneFile.value);
    payload.append('prompt', prompt.value.trim());

    const response = await fetch('/api/generate-image', {
      method: 'POST',
      body: payload
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to generate creative.');
    }

    const data = await response.json();
    generatedImage.value = `data:${data.mime};base64,${data.base64}`;
    previewPrompt.value = prompt.value.trim();
    useGeneratedForVideo();
  } catch (error) {
    imageError.value = error.message || 'Something went wrong.';
  } finally {
    imageLoading.value = false;
  }
}

async function regenerateImage() {
  imageError.value = '';
  if (!canRegenerate.value) {
    imageError.value = 'Please enter a prompt to edit the image.';
    return;
  }

  isRegenerating.value = true;

  try {
    const response = await fetch('/api/edit-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: generatedImage.value,
        prompt: previewPrompt.value.trim()
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to edit image.');
    }

    const data = await response.json();
    generatedImage.value = `data:${data.mime};base64,${data.base64}`;
    useGeneratedForVideo();
  } catch (error) {
    imageError.value = error.message || 'Something went wrong.';
  } finally {
    isRegenerating.value = false;
  }
}

async function generateVideo() {
  videoError.value = '';
  if (!videoInputPreview.value) {
    videoError.value = 'Select a starting image.';
    return;
  }
  if (!videoScript.value.trim()) {
    videoError.value = 'Generate or edit a script first.';
    return;
  }

  videoLoading.value = true;
  videoSubmitted.value = true;
  showScriptPanel.value = false;
  videoStatus.value = 'Submitting to Sora…';
  videoUrl.value = '';

  try {
    const response = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: videoScript.value.trim(),
        image: videoInputPreview.value,
        seconds: Number(videoDuration.value)
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to start video job.');
    }

    const data = await response.json();
    videoId.value = data.id;
    pollVideo();
  } catch (error) {
    videoError.value = error.message || 'Something went wrong.';
    videoStatus.value = '';
  } finally {
    videoLoading.value = false;
  }
}

async function generateVideoScript() {
  videoError.value = '';
  videoSubmitted.value = false;
  if (!videoInputPreview.value) {
    videoError.value = 'Select a starting image.';
    return;
  }
  if (!videoPrompt.value.trim()) {
    videoError.value = 'Add a brief before generating a script.';
    return;
  }

  scriptLoading.value = true;
  try {
    const response = await fetch('/api/generate-video-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: videoPrompt.value.trim(),
        seconds: Number(videoDuration.value),
        image: videoInputPreview.value
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to generate script.');
    }

    const data = await response.json();
    videoScript.value = data.script || '';
    showScriptPanel.value = true;
  } catch (error) {
    videoError.value = error.message || 'Something went wrong.';
  } finally {
    scriptLoading.value = false;
  }
}

function toggleScriptPanel() {
  if (!videoScript.value) return;
  showScriptPanel.value = !showScriptPanel.value;
}

function pollVideo() {
  if (!videoId.value) return;
  if (pollTimer) clearInterval(pollTimer);

  pollTimer = setInterval(async () => {
    try {
      const response = await fetch(`/api/video/${videoId.value}`);
      if (!response.ok) return;
      const data = await response.json();
      videoStatus.value = data.status;
      if (data.status === 'completed') {
        clearInterval(pollTimer);
        const download = await fetch(`/api/video/${videoId.value}/content`);
        if (!download.ok) return;
        const blob = await download.blob();
        videoUrl.value = URL.createObjectURL(blob);
      }
      if (data.status === 'failed') {
        clearInterval(pollTimer);
        videoError.value = data.error || 'Video generation failed.';
      }
    } catch (error) {
      videoError.value = 'Unable to fetch video status.';
    }
  }, 4000);
}

function downloadImage() {
  if (!generatedImage.value) return;
  const link = document.createElement('a');
  link.href = generatedImage.value;
  link.download = 'creative.png';
  link.click();
}

function downloadVideo() {
  if (!videoUrl.value) return;
  const link = document.createElement('a');
  link.href = videoUrl.value;
  link.download = 'creative.mp4';
  link.click();
}

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 36px 5vw 48px;
  background: radial-gradient(circle at top left, #fff6e1 0%, #f5f0ea 40%, #e7f4f2 100%);
}

:root {
  --panel-height: clamp(480px, 62vh, 560px);
}

.top {
  display: grid;
  gap: 24px;
  align-items: end;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  margin-bottom: 28px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.28em;
  font-size: 11px;
  color: #157066;
  margin: 0 0 12px;
}

h1 {
  font-family: 'Fraunces', serif;
  font-size: clamp(2.2rem, 3vw, 3.2rem);
  margin: 0;
}

.lede {
  max-width: 540px;
  color: #4a5866;
  font-size: 15px;
  line-height: 1.6;
}

.mode-tabs {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(21, 112, 102, 0.12);
  box-shadow: 0 10px 24px rgba(26, 33, 44, 0.08);
  width: fit-content;
  margin: 0 auto;
}

.tab {
  border: none;
  background: transparent;
  border-radius: 999px;
  padding: 8px 16px;
  font-weight: 600;
  color: #2f3c4a;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab:hover {
  background: rgba(21, 112, 102, 0.08);
}

.tab.active {
  background: #157066;
  color: #fff;
  box-shadow: 0 10px 20px rgba(21, 112, 102, 0.2);
}

.stage {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 28px;
  align-items: stretch;
}

.panel {
  background: rgba(255, 255, 255, 0.85);
  border-radius: 28px;
  padding: 22px;
  box-shadow: 0 30px 80px rgba(26, 33, 44, 0.12);
  min-height: var(--panel-height);
}

.stack {
  display: grid;
  gap: 16px;
  align-content: start;
}

.drop-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.drop {
  border: 1.5px dashed #cdd7dc;
  border-radius: 18px;
  padding: 12px;
  min-height: 120px;
  display: grid;
  place-items: center;
  cursor: pointer;
  background: #fbfbfb;
  transition: all 0.2s ease;
}

.drop.filled {
  padding: 12px;
}

.drop:hover {
  border-color: #157066;
  box-shadow: 0 0 0 3px rgba(21, 112, 102, 0.15);
}

.drop input {
  display: none;
}

.drop-empty {
  text-align: center;
  display: grid;
  gap: 6px;
  color: #4a5866;
  font-size: 13px;
}

.drop-preview {
  display: grid;
  gap: 10px;
  place-items: center;
}

.drop-preview img {
  border-radius: 16px;
  max-height: 140px;
  object-fit: cover;
}

.drop.single {
  min-height: 140px;
}

.inline-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.tiny {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  border: 1px solid #d7e0e6;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
  background: #fff;
  cursor: pointer;
}

.tiny input {
  display: none;
}

.field {
  display: grid;
  gap: 8px;
  font-size: 13px;
  color: #4a5866;
}

textarea,
select {
  border: 1px solid #d7e0e6;
  border-radius: 14px;
  padding: 10px 12px;
  font-size: 14px;
  background: #fff;
}

textarea {
  min-height: 64px;
  resize: vertical;
}

textarea:focus,
select:focus {
  outline: none;
  border-color: #157066;
  box-shadow: 0 0 0 3px rgba(21, 112, 102, 0.2);
}

.row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.primary {
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  background: linear-gradient(120deg, #157066, #1e8e80);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.ad-cta {
  background: linear-gradient(120deg, #0f6a5e, #2aa889);
  box-shadow: 0 16px 30px rgba(21, 112, 102, 0.24);
  padding: 11px 22px;
}

.ad-cta:disabled {
  box-shadow: none;
}

.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.ghost {
  border: 1px solid #d7e0e6;
  border-radius: 999px;
  padding: 10px 16px;
  background: transparent;
  cursor: pointer;
}

.error {
  color: #b42318;
  margin: 0;
  font-size: 13px;
}

.status-panel {
  display: grid;
  gap: 10px;
  place-items: center;
  color: #556270;
  font-size: 13px;
}

.preview {
  display: grid;
}

.preview-card {
  background: rgba(255, 255, 255, 0.85);
  border-radius: 28px;
  padding: 22px;
  min-height: var(--panel-height);
  box-shadow: 0 30px 80px rgba(26, 33, 44, 0.12);
  display: grid;
  align-items: center;
}

.empty {
  color: #4a5866;
  font-size: 14px;
}

.loading {
  display: grid;
  gap: 12px;
  place-items: center;
  color: #4a5866;
}

.spinner {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 4px solid #d7e0e6;
  border-top-color: #f08b5b;
  animation: spin 1s linear infinite;
}

.result {
  display: grid;
  gap: 14px;
  justify-items: center;
}

.result img,
.result video {
  border-radius: 20px;
  max-height: 220px;
  width: 100%;
  object-fit: contain;
}

.image-container {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
}

.image-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #4a5866;
}

.preview-field {
  width: 100%;
}

.preview-field textarea {
  min-height: 56px;
}

.result-actions {
  display: grid;
  gap: 10px;
  width: 100%;
}

.result-actions .row {
  justify-content: center;
}

.result-actions .row.secondary {
  gap: 8px;
}

.result-actions .row.secondary .ghost {
  padding: 8px 14px;
  font-size: 13px;
}

.preview-field textarea {
  min-height: 48px;
}

.script-panel {
  width: 100%;
  display: grid;
  gap: 12px;
  height: 100%;
}

.script-title {
  margin: 0;
  font-weight: 600;
  color: #2f3c4a;
}

.script-textarea {
  min-height: 200px;
}

.script-meta {
  font-size: 12px;
  color: #6b7785;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 860px) {
  .mode-tabs {
    justify-content: center;
  }

  .panel,
  .preview-card {
    padding: 18px;
  }
}
</style>
