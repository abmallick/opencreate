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
      <div class="actions">
        <button class="pill" @click="mode = 'creative'" :class="{ active: mode === 'creative' }">
          Generate creative
        </button>
        <button class="pill" @click="mode = 'video'" :class="{ active: mode === 'video' }">
          Generate ad
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
            <button class="ghost" @click="resetAll" :disabled="imageLoading">Reset</button>
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
              :disabled="!canGenerateVideo || videoLoading"
              @click="generateVideo"
            >
              <span v-if="!videoLoading">Generate ad</span>
              <span v-else>Animating…</span>
            </button>
            <button class="ghost" @click="clearGenerated" :disabled="videoLoading">Clear</button>
          </div>
          <p v-if="videoError" class="error">{{ videoError }}</p>
          <div v-if="videoStatus" class="status">{{ videoStatus }}</div>
        </div>
      </div>

      <div class="preview">
        <div v-if="mode === 'creative'" class="preview-card">
          <div v-if="!generatedImage && !imageLoading" class="empty">Your creative appears here.</div>
          <div v-if="imageLoading" class="loading">
            <div class="spinner"></div>
            <p>Blending subject with scene…</p>
          </div>
          <div v-if="generatedImage" class="result">
            <img :src="generatedImage" alt="Generated creative" />
            <div class="row">
              <button class="primary" @click="downloadImage">Download</button>
              <button class="ghost" @click="clearGenerated">Clear</button>
              <button class="ghost" @click="mode = 'video'">Generate ad</button>
            </div>
          </div>
        </div>

        <div v-else class="preview-card">
          <div v-if="!videoSubmitted" class="script-panel">
            <p class="script-title">Generated script (editable)</p>
            <textarea
              v-model="videoScript"
              class="script-textarea"
              placeholder="Generate a script to preview here"
            ></textarea>
            <div class="script-meta">Review and edit before generating the ad.</div>
          </div>
          <div v-else>
            <div v-if="!videoUrl && !videoLoading" class="empty">Your ad video will appear here.</div>
            <div v-if="videoLoading" class="loading">
              <div class="spinner"></div>
              <p>Rendering your ad…</p>
            </div>
            <div v-if="videoUrl" class="result">
              <video controls :src="videoUrl"></video>
              <div class="row">
                <button class="primary" @click="downloadVideo">Download</button>
                <button class="ghost" @click="clearVideoOutput">Clear</button>
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
const videoPrompt = ref('');
const videoScript = ref('');
const videoDuration = ref('4');
const videoInputFile = ref(null);
const videoInputPreview = ref('');

let pollTimer = null;

const maxFileSize = 12 * 1024 * 1024;

const canGenerate = computed(() => objectFile.value);
const canGenerateScript = computed(
  () => videoInputPreview.value && videoPrompt.value.trim() && videoDuration.value
);
const canGenerateVideo = computed(
  () => videoInputPreview.value && videoScript.value.trim() && videoDuration.value
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
}

function clearVideoOutput() {
  videoUrl.value = '';
  videoStatus.value = '';
  videoId.value = '';
  videoSubmitted.value = false;
  if (pollTimer) clearInterval(pollTimer);
}

function resetAll() {
  clearObject();
  clearScene();
  clearGenerated();
  clearVideoInput();
  prompt.value = '';
  videoPrompt.value = '';
  videoScript.value = '';
  videoDuration.value = '4';
  videoSubmitted.value = false;
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
    useGeneratedForVideo();
  } catch (error) {
    imageError.value = error.message || 'Something went wrong.';
  } finally {
    imageLoading.value = false;
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
  } catch (error) {
    videoError.value = error.message || 'Something went wrong.';
  } finally {
    scriptLoading.value = false;
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
.page {
  min-height: 100vh;
  padding: 36px 5vw 48px;
  background: radial-gradient(circle at top left, #fff6e1 0%, #f5f0ea 40%, #e7f4f2 100%);
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

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.pill {
  border: 1px solid rgba(21, 112, 102, 0.2);
  background: #fff;
  border-radius: 999px;
  padding: 10px 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pill.active {
  background: #157066;
  color: #fff;
  border-color: #157066;
  box-shadow: 0 10px 24px rgba(21, 112, 102, 0.25);
}

.stage {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 28px;
}

.panel {
  background: rgba(255, 255, 255, 0.85);
  border-radius: 28px;
  padding: 22px;
  box-shadow: 0 30px 80px rgba(26, 33, 44, 0.12);
  align-self: start;
}

.stack {
  display: grid;
  gap: 20px;
}

.drop-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.drop {
  border: 1.5px dashed #cdd7dc;
  border-radius: 18px;
  padding: 14px;
  min-height: 140px;
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
  min-height: 160px;
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
  min-height: 72px;
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

.status {
  background: #f1f4f7;
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 13px;
  color: #556270;
}

.preview {
  display: grid;
}

.preview-card {
  background: rgba(255, 255, 255, 0.85);
  border-radius: 28px;
  padding: 22px;
  min-height: 320px;
  height: 320px;
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
  gap: 16px;
  justify-items: center;
}

.result img,
.result video {
  border-radius: 20px;
  max-height: 240px;
  width: 100%;
  object-fit: contain;
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
  .actions {
    justify-content: flex-start;
  }

  .panel,
  .preview-card {
    padding: 20px;
  }
}
</style>
