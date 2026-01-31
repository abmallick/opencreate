<template>
  <div class="app">
    <header class="hero">
      <div>
        <p class="eyebrow">Campaign Studio</p>
        <h1>Compose bold creatives in minutes.</h1>
        <p class="subhead">
          Drop in the product, add a scene, and let the creative engine place it with style. Iterate on
          angle, scale, and position without leaving the flow.
        </p>
      </div>
      <div class="hero-card">
        <div class="stat">
          <span>01</span>
          <p>Upload the subject</p>
        </div>
        <div class="stat">
          <span>02</span>
          <p>Pick the backdrop</p>
        </div>
        <div class="stat">
          <span>03</span>
          <p>Generate image + video</p>
        </div>
      </div>
    </header>

    <section class="panel">
      <div class="grid">
        <div class="column">
          <h2>Inputs</h2>
          <p class="muted">Keep the subject crisp and the scene wide for the best blend.</p>

          <div class="card" style="--delay: 1">
            <h3>1. Subject image</h3>
            <p class="muted">PNG or JPG. Clear background preferred.</p>
            <label class="upload" :class="{ filled: objectPreview }">
              <input type="file" accept="image/*" @change="onObjectImage" />
              <div v-if="!objectPreview">
                <strong>Upload subject</strong>
                <span>Drag and drop or browse</span>
              </div>
              <div v-else class="preview">
                <img :src="objectPreview" alt="Subject preview" />
                <button type="button" class="ghost" @click="clearObject">Replace</button>
              </div>
            </label>
            <p v-if="objectError" class="error">{{ objectError }}</p>
          </div>

          <div class="card" style="--delay: 2">
            <h3>2. Scene image</h3>
            <p class="muted">The environment where the subject will live.</p>
            <label class="upload" :class="{ filled: scenePreview }">
              <input type="file" accept="image/*" @change="onSceneImage" />
              <div v-if="!scenePreview">
                <strong>Upload scene</strong>
                <span>Wide shots work best</span>
              </div>
              <div v-else class="preview">
                <img :src="scenePreview" alt="Scene preview" />
                <button type="button" class="ghost" @click="clearScene">Replace</button>
              </div>
            </label>
            <p v-if="sceneError" class="error">{{ sceneError }}</p>
          </div>

          <div class="card" style="--delay: 3">
            <h3>3. Creative guidance</h3>
            <label class="field">
              <span>Prompt</span>
              <textarea
                v-model="prompt"
                placeholder="E.g. Place the bottle on the marble counter with soft morning light"
              ></textarea>
            </label>
            <div class="controls">
              <label class="field">
                <span>Position</span>
                <select v-model="position">
                  <option value="center">Center</option>
                  <option value="left">Left third</option>
                  <option value="right">Right third</option>
                  <option value="foreground">Foreground</option>
                  <option value="background">Background</option>
                </select>
              </label>
              <label class="field">
                <span>Scale</span>
                <input type="range" min="30" max="120" v-model="scale" />
                <small>{{ scale }}%</small>
              </label>
              <label class="field">
                <span>View</span>
                <select v-model="view">
                  <option value="hero">Hero shot</option>
                  <option value="top">Top-down</option>
                  <option value="angled">Angled 3/4</option>
                  <option value="close">Close-up</option>
                </select>
              </label>
            </div>
            <label class="field">
              <span>Brand mood</span>
              <input
                v-model="mood"
                type="text"
                placeholder="Warm, premium, minimalist, playful"
              />
            </label>
          </div>

          <div class="actions">
            <button
              type="button"
              class="primary"
              :disabled="!canGenerate || imageLoading"
              @click="generateImage"
            >
              <span v-if="!imageLoading">Generate Creative</span>
              <span v-else>Composing…</span>
            </button>
            <button type="button" class="ghost" @click="resetAll" :disabled="imageLoading">
              Reset
            </button>
            <p v-if="imageError" class="error">{{ imageError }}</p>
          </div>
        </div>

        <div class="column">
          <h2>Output</h2>
          <p class="muted">Review and iterate without re-uploading.</p>

          <div class="card output" style="--delay: 1">
            <div v-if="!generatedImage && !imageLoading" class="empty">
              <p>No creative generated yet.</p>
              <span>Once ready, it appears here.</span>
            </div>
            <div v-if="imageLoading" class="loading">
              <div class="spinner"></div>
              <p>Blending your subject into the scene…</p>
            </div>
            <div v-if="generatedImage" class="result">
              <img :src="generatedImage" alt="Generated creative" />
              <div class="result-actions">
                <button type="button" class="primary" @click="downloadImage">Download image</button>
                <button type="button" class="ghost" @click="clearGenerated">Clear</button>
              </div>
            </div>
          </div>

          <div class="card video" style="--delay: 2">
            <h3>Generate creative video</h3>
            <p class="muted">
              Uses the generated image as the starting frame and a short prompt to animate. Requires a
              completed image.
            </p>
            <label class="field">
              <span>Video prompt</span>
              <textarea
                v-model="videoPrompt"
                placeholder="Add gentle camera push-in, floating sparkles"
              ></textarea>
            </label>
            <label class="field">
              <span>Video duration</span>
              <select v-model="videoDuration">
                <option value="4">4 seconds (snappiest)</option>
                <option value="8">8 seconds</option>
                <option value="12">12 seconds (longest)</option>
              </select>
            </label>
            <button
              type="button"
              class="primary"
              :disabled="!canGenerateVideo || videoLoading"
              @click="generateVideo"
            >
              <span v-if="!videoLoading">Generate Creative Video</span>
              <span v-else>Animating…</span>
            </button>
            <p v-if="videoError" class="error">{{ videoError }}</p>

            <div v-if="videoStatus" class="status">
              <span>{{ videoStatus }}</span>
            </div>

            <div v-if="videoUrl" class="video-preview">
              <video controls :src="videoUrl"></video>
              <button type="button" class="ghost" @click="downloadVideo">Download video</button>
            </div>
          </div>

          <div class="card tips" style="--delay: 3">
            <h3>Creative safety checks</h3>
            <ul>
              <li>Ensure you have usage rights for both images.</li>
              <li>Avoid sensitive or trademarked elements without permission.</li>
              <li>If the subject is cropped oddly, try a larger scale or different view.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';

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
const generatedImage = ref('');
const videoUrl = ref('');
const videoStatus = ref('');
const videoId = ref('');

const prompt = ref('');
const mood = ref('');
const position = ref('center');
const scale = ref(70);
const view = ref('hero');
const videoPrompt = ref('');
const videoDuration = ref('4');

let pollTimer = null;

const maxFileSize = 12 * 1024 * 1024;

const canGenerate = computed(() => objectFile.value && sceneFile.value);
const canGenerateVideo = computed(
  () => generatedImage.value && videoPrompt.value.trim() && videoDuration.value
);

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
  videoUrl.value = '';
  videoStatus.value = '';
  videoId.value = '';
  if (pollTimer) clearInterval(pollTimer);
}

function resetAll() {
  clearObject();
  clearScene();
  clearGenerated();
  prompt.value = '';
  mood.value = '';
  position.value = 'center';
  scale.value = 70;
  view.value = 'hero';
  videoPrompt.value = '';
  videoDuration.value = '4';
  objectError.value = '';
  sceneError.value = '';
  imageError.value = '';
  videoError.value = '';
}

function buildPrompt() {
  const parts = [prompt.value.trim()].filter(Boolean);
  parts.push(`Position the subject: ${position.value}.`);
  parts.push(`Scale: ${scale.value}%. View: ${view.value}.`);
  if (mood.value.trim()) parts.push(`Mood: ${mood.value.trim()}.`);
  return parts.join(' ');
}

async function generateImage() {
  imageError.value = '';
  videoError.value = '';
  if (!canGenerate.value) {
    imageError.value = 'Please add both images before generating.';
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
    payload.append('sceneImage', sceneFile.value);
    payload.append('prompt', buildPrompt());

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
  } catch (error) {
    imageError.value = error.message || 'Something went wrong.';
  } finally {
    imageLoading.value = false;
  }
}

async function generateVideo() {
  videoError.value = '';
  if (!generatedImage.value) {
    videoError.value = 'Generate an image first.';
    return;
  }
  if (!videoPrompt.value.trim()) {
    videoError.value = 'Add a short video prompt.';
    return;
  }

  videoLoading.value = true;
  videoStatus.value = 'Submitting to Sora…';
  videoUrl.value = '';

  try {
    const response = await fetch('/api/generate-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: videoPrompt.value.trim(),
        image: generatedImage.value,
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
.app {
  padding: 40px 6vw 80px;
}

.hero {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 32px;
  margin-bottom: 48px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 12px;
  color: var(--sea);
  margin: 0 0 12px;
}

.subhead {
  color: var(--ink-soft);
  max-width: 520px;
  font-size: 16px;
  line-height: 1.6;
}

.hero-card {
  background: linear-gradient(140deg, #fff, #f6fffb);
  padding: 24px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  display: grid;
  gap: 16px;
  animation: fadeUp 0.8s ease both;
  animation-delay: 120ms;
}

.stat {
  display: flex;
  gap: 12px;
  align-items: center;
}

.stat span {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--sea);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.panel {
  background: var(--mist);
  border-radius: var(--radius-lg);
  padding: 32px;
  box-shadow: var(--shadow);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
}

.column {
  display: grid;
  gap: 20px;
}

.card {
  background: var(--card);
  padding: 20px;
  border-radius: var(--radius-md);
  box-shadow: 0 8px 30px rgba(31, 36, 48, 0.08);
  display: grid;
  gap: 12px;
  animation: fadeUp 0.7s ease both;
  animation-delay: calc(var(--delay, 0) * 120ms);
}

.muted {
  color: var(--ink-soft);
  margin: 0;
  font-size: 14px;
}

.upload {
  border: 1px dashed #cfd6e1;
  border-radius: var(--radius-sm);
  padding: 18px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  display: grid;
  gap: 8px;
}

.upload:hover {
  border-color: var(--sea);
  box-shadow: var(--ring);
}

.upload input {
  display: none;
}

.upload.filled {
  padding: 12px;
}

.preview img {
  border-radius: 14px;
  max-height: 180px;
  object-fit: cover;
  margin: 0 auto;
}

.controls {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.field {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: var(--ink-soft);
}

input[type="text"],
textarea,
select {
  border: 1px solid #d7dde6;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  color: var(--ink);
}

textarea {
  min-height: 90px;
  resize: vertical;
}

input:focus,
textarea:focus,
select:focus {
  outline: none;
  box-shadow: var(--ring);
  border-color: var(--sea);
}

.actions {
  display: grid;
  gap: 10px;
}

.primary {
  border: none;
  border-radius: 999px;
  padding: 12px 20px;
  background: linear-gradient(120deg, var(--sea), #16877a);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.primary:hover:not(:disabled) {
  transform: translateY(-1px) scale(1.01);
}

.ghost {
  border: 1px solid #d1d8e2;
  border-radius: 999px;
  padding: 10px 16px;
  background: transparent;
  cursor: pointer;
}

.error {
  color: var(--error);
  font-size: 13px;
  margin: 0;
}

.output {
  min-height: 320px;
  place-items: center;
}

.empty {
  text-align: center;
  color: var(--ink-soft);
}

.loading {
  display: grid;
  gap: 12px;
  place-items: center;
}

.spinner {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 4px solid #dbe2ec;
  border-top-color: var(--sun);
  animation: spin 1s linear infinite;
}

.result-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 12px;
}

.video-preview video {
  width: 100%;
  border-radius: 16px;
}

.status {
  background: #f2f5f9;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
  color: var(--ink-soft);
}

.tips ul {
  margin: 0;
  padding-left: 16px;
  color: var(--ink-soft);
  font-size: 13px;
  line-height: 1.6;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 720px) {
  .app {
    padding: 24px 5vw 60px;
  }

  .panel {
    padding: 20px;
  }
}
</style>
