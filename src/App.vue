<template>
  <div v-if="!isAuthenticated" class="auth-page">
    <div class="auth-card">
      <p class="eyebrow">Creative Studio</p>
      <h1>Sign in to continue</h1>
      <p class="auth-subtitle">Use your OpenCreate credentials to access the studio.</p>
      <form class="auth-form" @submit.prevent="handleAuth">
        <label class="field">
          <span>Username</span>
          <input v-model="authUsername" type="text" autocomplete="username" />
        </label>
        <label class="field">
          <span>Password</span>
          <input v-model="authPassword" type="password" autocomplete="current-password" />
        </label>
        <button class="primary" type="submit" :disabled="authLoading">
          <span v-if="!authLoading">Enter studio</span>
          <span v-else>Checking…</span>
        </button>
        <p v-if="authError" class="error">{{ authError }}</p>
      </form>
    </div>
  </div>
  <div v-else class="page" :class="{ 'ad-mode': mode === 'video' }">
    <header class="top">
      <div>
        <p class="eyebrow">Creative Studio</p>
        <h1>Compose standout product visuals.</h1>
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
      <div class="panel" :class="{ 'creative-panel': mode === 'creative' }">
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

          <div class="preset-section">
            <div class="preset-header">
              <p class="preset-title">Creative presets</p>
              <span v-if="creativePresetBusy" class="preset-status">Loading…</span>
            </div>
            <div class="preset-grid">
              <button
                v-for="preset in creativePresets"
                :key="preset.id"
                type="button"
                class="preset-card"
                :class="{ active: activeCreativePreset === preset.id }"
                :disabled="creativePresetBusy"
                @click="applyCreativePreset(preset)"
              >
                <div class="preset-thumbs">
                  <div class="preset-thumb">
                    <img :src="preset.objectImage" :alt="`${preset.label} product`" />
                  </div>
                  <div class="preset-thumb">
                    <img :src="preset.sceneImage" :alt="`${preset.label} scene`" />
                  </div>
                </div>
                <div class="preset-text">
                  <p class="preset-label">{{ preset.label }}</p>
                  <p class="preset-desc">{{ preset.description }}</p>
                </div>
              </button>
            </div>
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
          <div class="ad-form-body">
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

            <div class="preset-section">
              <div class="preset-header">
                <p class="preset-title">Ad presets</p>
                <span v-if="adPresetBusy" class="preset-status">Loading…</span>
              </div>
              <div class="preset-grid">
                <button
                  v-for="preset in adPresets"
                  :key="preset.id"
                  type="button"
                  class="preset-card"
                  :class="{ active: activeAdPreset === preset.id }"
                  :disabled="adPresetBusy"
                  @click="applyAdPreset(preset)"
                >
                  <div class="preset-thumbs single">
                    <div class="preset-thumb">
                      <img :src="preset.image" :alt="`${preset.label} frame`" />
                    </div>
                  </div>
                  <div class="preset-text">
                    <p class="preset-label">{{ preset.label }}</p>
                    <p class="preset-desc">{{ preset.description }}</p>
                  </div>
                </button>
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
          </div>

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
        <div v-show="mode === 'creative'" class="preview-card creative-preview">
          <div v-if="!generatedImage && !imageLoading" class="empty">Your creative appears here.</div>
          <div v-if="imageLoading && !generatedImage" class="loading">
            <div class="spinner"></div>
            <p>Blending subject with scene…</p>
          </div>
          <div v-if="generatedImage" class="result creative-result">
            <div class="creative-result-body">
              <div class="cta-column">
                <button class="ghost" @click="downloadImage">Download</button>
                <button class="ghost" @click="clearGenerated">Clear</button>
                <button class="primary ad-cta" @click="mode = 'video'">Generate ad</button>
              </div>
              <div class="creative-media">
                <div
                  ref="imageViewport"
                  class="image-viewport"
                  @pointerdown="startImagePan"
                  @pointermove="moveImagePan"
                  @pointerup="endImagePan"
                  @pointerleave="endImagePan"
                  @pointercancel="endImagePan"
                  @wheel.prevent="onImageWheel"
                >
                  <img
                    class="zoomable-image"
                    :src="generatedImage"
                    alt="Generated creative"
                    :style="imageTransform"
                    draggable="false"
                  />
                  <div v-if="isRegenerating" class="image-overlay">
                    <div class="spinner"></div>
                    <p>Editing image…</p>
                  </div>
                </div>
              </div>
              <div class="prompt-row">
                <label class="field preview-field">
                  <span>Edit prompt</span>
                  <textarea v-model="previewPrompt" placeholder="Refine your prompt..."></textarea>
                </label>
                <button class="primary" :disabled="!canRegenerate || isRegenerating" @click="regenerateImage">
                  <span v-if="!isRegenerating">Regenerate</span>
                  <span v-else>Editing…</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-show="mode === 'video'" class="preview-card video-preview ad-preview-panel">
          <div class="ad-preview-body">
            <div v-if="showScriptPanel || !videoSubmitted" class="script-panel">
              <p class="script-title">Generated script (editable)</p>
              <textarea
                v-model="videoScript"
                class="script-textarea"
                placeholder="Generate a script to preview here"
              ></textarea>
              <div class="script-meta">Review and edit before generating the ad.</div>
            </div>
            <div v-else class="video-output">
              <div v-if="videoLoading" class="ad-center">
                <div class="spinner"></div>
                <p>Rendering your ad…</p>
              </div>
              <div v-else-if="videoStatus && !videoCompleted" class="ad-center">
                <div class="spinner"></div>
                <p>{{ videoStatusLabel }}</p>
              </div>
              <div v-else-if="videoUrl" class="result">
                <video controls :src="videoUrl"></video>
                <div class="row">
                  <button class="primary" @click="downloadVideo">Download</button>
                </div>
                <div class="remix-section">
                  <label class="field">
                    <span>Edit this video</span>
                    <textarea
                      v-model="remixPrompt"
                      placeholder="Describe a single change, e.g., 'Change the lighting to sunset tones'"
                      :disabled="remixLoading"
                    ></textarea>
                  </label>
                  <button
                    class="primary"
                    :disabled="!canRemix"
                    @click="remixVideo"
                  >
                    <span v-if="!remixLoading">Apply Edit</span>
                    <span v-else>Remixing…</span>
                  </button>
                </div>
              </div>
              <div v-else class="empty">Generate an ad to preview it here.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const mode = ref('creative');
const isAuthenticated = ref(false);
const authUsername = ref('');
const authPassword = ref('');
const authError = ref('');
const authLoading = ref(false);

const creativePresets = [
{
    id: 'creative-1',
    label: 'Candle by bedside',
    description: 'Candle on bedside table.',
    objectImage: '/presets/creative-1-object.jpg',
    sceneImage: '/presets/creative-1-scene.jpg',
    prompt: 'Set the candle on the bedside table.'
  },
  {
    id: 'creative-2',
    label: 'Sofa by the river bank.',
    description: 'Premium sofa by the river bank.',
    objectImage: '/presets/creative-2-object.jpg',
    sceneImage: '/presets/creative-2-scene.jpg',
    prompt: 'Place the sofa by the river bank with warm daylight and soft shadows.'
  }
];

const adPresets = [
{
    id: 'ad-1',
    label: 'Cozy bedroom',
    description: 'Cozy bedroom with candle and warm light.',
    image: '/presets/ad-1.png',
    prompt: 'Couple sits on the bed, warm light, Instagram style.'
  },
  {
    id: 'ad-2',
    label: 'Weekend Cozy',
    description: 'Relaxed couple, chilling.',
    image: '/presets/ad-2.png',
    prompt: 'Couple sits on the sofa, cozy weekend feel, Instagram style.',
  }
];

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
const remixPrompt = ref('');
const remixLoading = ref(false);
const imageViewport = ref(null);
const imageZoom = ref(1);
const imagePan = ref({ x: 0, y: 0 });
const isPanningImage = ref(false);
const panStart = ref({ x: 0, y: 0 });
const panOrigin = ref({ x: 0, y: 0 });
const creativePresetBusy = ref(false);
const adPresetBusy = ref(false);
const activeCreativePreset = ref('');
const activeAdPreset = ref('');

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
const canRemix = computed(() =>
  videoId.value && videoCompleted.value && remixPrompt.value.trim() && !remixLoading.value
);
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

const imageTransform = computed(() => ({
  transform: `translate(${imagePan.value.x}px, ${imagePan.value.y}px) scale(${imageZoom.value})`
}));

function validateImage(file) {
  if (!file) return 'Please select an image.';
  if (!file.type.startsWith('image/')) return 'Only image files are supported.';
  if (file.size > maxFileSize) return 'Image is too large (max 12MB).';
  return '';
}

async function handleAuth() {
  authError.value = '';
  if (!authUsername.value.trim() || !authPassword.value) {
    authError.value = 'Enter both a username and password.';
    return;
  }

  authLoading.value = true;

  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: authUsername.value.trim(),
        password: authPassword.value
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Invalid credentials.');
    }

    isAuthenticated.value = true;
    sessionStorage.setItem('opencreate-auth', 'true');
  } catch (error) {
    authError.value = error.message || 'Unable to authenticate.';
  } finally {
    authLoading.value = false;
  }
}

function toPreview(file, setter) {
  const reader = new FileReader();
  reader.onload = (e) => setter(e.target.result);
  reader.readAsDataURL(file);
}

async function fetchFileFromUrl(url, fallbackName) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Preset asset not found: ${url}`);
  }
  const blob = await response.blob();
  const name = url.split('/').pop() || fallbackName;
  return new File([blob], name, { type: blob.type || 'image/jpeg' });
}

async function applyCreativePreset(preset) {
  imageError.value = '';
  videoError.value = '';
  objectError.value = '';
  sceneError.value = '';
  creativePresetBusy.value = true;
  activeCreativePreset.value = preset.id;
  clearGenerated();

  try {
    const [object, scene] = await Promise.all([
      fetchFileFromUrl(preset.objectImage, 'object.jpg'),
      fetchFileFromUrl(preset.sceneImage, 'scene.jpg')
    ]);

    objectFile.value = object;
    sceneFile.value = scene;
    toPreview(object, (val) => (objectPreview.value = val));
    toPreview(scene, (val) => (scenePreview.value = val));
    prompt.value = preset.prompt;
  } catch (error) {
    activeCreativePreset.value = '';
    imageError.value = error.message || 'Unable to load preset.';
  } finally {
    creativePresetBusy.value = false;
  }
}

async function applyAdPreset(preset) {
  videoError.value = '';
  adPresetBusy.value = true;
  activeAdPreset.value = preset.id;
  clearVideoOutput();
  videoInputPreview.value = '';
  videoInputFile.value = null;
  videoScript.value = '';
  showScriptPanel.value = false;

  try {
    const file = await fetchFileFromUrl(preset.image, 'ad.jpg');
    videoInputFile.value = file;
    toPreview(file, (val) => (videoInputPreview.value = val));
    videoPrompt.value = preset.prompt;
    if (preset.duration) {
      videoDuration.value = preset.duration;
    }
  } catch (error) {
    activeAdPreset.value = '';
    videoError.value = error.message || 'Unable to load preset.';
  } finally {
    adPresetBusy.value = false;
  }
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
  activeCreativePreset.value = '';
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
  activeCreativePreset.value = '';
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
  activeAdPreset.value = '';
}

function useGeneratedForVideo() {
  if (!generatedImage.value) return;
  videoInputPreview.value = generatedImage.value;
  videoInputFile.value = null;
}

function clearObject() {
  objectFile.value = null;
  objectPreview.value = '';
  activeCreativePreset.value = '';
}

function clearScene() {
  sceneFile.value = null;
  scenePreview.value = '';
  activeCreativePreset.value = '';
}

function clearGenerated() {
  generatedImage.value = '';
  previewPrompt.value = '';
  isRegenerating.value = false;
  resetImageTransform();
}

function clearVideoInput() {
  videoInputPreview.value = '';
  videoInputFile.value = null;
  videoScript.value = '';
  showScriptPanel.value = false;
  activeAdPreset.value = '';
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
  clearVideoOutput();
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

function resetImageTransform() {
  imageZoom.value = 1;
  imagePan.value = { x: 0, y: 0 };
  isPanningImage.value = false;
}

function clampImagePan(nextPan) {
  const viewport = imageViewport.value;
  if (!viewport) return nextPan;
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  const maxOffsetX = Math.max(0, ((imageZoom.value - 1) * width) / 2);
  const maxOffsetY = Math.max(0, ((imageZoom.value - 1) * height) / 2);
  return {
    x: Math.min(maxOffsetX, Math.max(-maxOffsetX, nextPan.x)),
    y: Math.min(maxOffsetY, Math.max(-maxOffsetY, nextPan.y))
  };
}

function startImagePan(event) {
  if (!generatedImage.value) return;
  isPanningImage.value = true;
  panStart.value = { x: event.clientX, y: event.clientY };
  panOrigin.value = { ...imagePan.value };
  event.currentTarget?.setPointerCapture?.(event.pointerId);
}

function moveImagePan(event) {
  if (!isPanningImage.value) return;
  const dx = event.clientX - panStart.value.x;
  const dy = event.clientY - panStart.value.y;
  imagePan.value = clampImagePan({ x: panOrigin.value.x + dx, y: panOrigin.value.y + dy });
}

function endImagePan(event) {
  if (!isPanningImage.value) return;
  isPanningImage.value = false;
  event.currentTarget?.releasePointerCapture?.(event.pointerId);
}

function onImageWheel(event) {
  if (!generatedImage.value) return;
  const delta = event.deltaY || 0;
  const zoomStep = delta > 0 ? -0.1 : 0.1;
  const nextZoom = Math.min(3, Math.max(1, imageZoom.value + zoomStep));
  imageZoom.value = Number(nextZoom.toFixed(2));
  imagePan.value = clampImagePan(imagePan.value);
}

watch(generatedImage, () => {
  resetImageTransform();
});

async function generateImage() {
  imageError.value = '';
  videoError.value = '';
  if (!canGenerate.value) {
    imageError.value = 'Please add a product image before generating.';
    return;
  }

  imageLoading.value = true;
  generatedImage.value = '';

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

async function remixVideo() {
  if (!videoId.value || !remixPrompt.value.trim()) return;

  videoError.value = '';
  remixLoading.value = true;
  videoStatus.value = 'Submitting remix...';
  videoUrl.value = '';

  try {
    const response = await fetch(`/api/video/${videoId.value}/remix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: remixPrompt.value.trim() })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to start remix.');
    }

    const data = await response.json();
    videoId.value = data.id;
    remixPrompt.value = '';
    pollVideo();
  } catch (error) {
    videoError.value = error.message || 'Remix failed.';
    videoStatus.value = '';
  } finally {
    remixLoading.value = false;
  }
}

onMounted(() => {
  const storedAuth = sessionStorage.getItem('opencreate-auth');
  isAuthenticated.value = storedAuth === 'true';
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 5vw;
  background: radial-gradient(circle at top left, #fff6e1 0%, #f5f0ea 40%, #e7f4f2 100%);
}

.auth-card {
  width: min(460px, 100%);
  background: rgba(255, 255, 255, 0.92);
  border-radius: 28px;
  padding: 28px;
  box-shadow: 0 30px 80px rgba(26, 33, 44, 0.16);
  display: grid;
  gap: 14px;
}

.auth-subtitle {
  margin: 0 0 8px;
  color: #4a5866;
  font-size: 14px;
  line-height: 1.6;
}

.auth-form {
  display: grid;
  gap: 14px;
}

.auth-form input {
  height: 44px;
  border-radius: 14px;
  border: 1px solid #d7dee4;
  padding: 0 14px;
  font-size: 14px;
  background: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.auth-form input:focus {
  outline: none;
  border-color: #157066;
  box-shadow: 0 0 0 3px rgba(21, 112, 102, 0.15);
}

.page {
  min-height: 100vh;
  padding: 24px 5vw 40px;
  background: radial-gradient(circle at top left, #fff6e1 0%, #f5f0ea 40%, #e7f4f2 100%);
}

.page.ad-mode {
  --panel-height: 100%;
  height: 100vh;
  height: 100svh;
  padding: 18px 5vw clamp(18px, 3vh, 28px);
  display: flex;
  flex-direction: column;
}

.page.ad-mode .top {
  margin-bottom: 12px;
  flex: 0 0 auto;
}

.page.ad-mode .stage {
  gap: 18px;
  flex: 1;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr);
}

.page.ad-mode .panel,
.page.ad-mode .preview-card {
  padding: 16px;
  height: 100%;
  min-height: 0;
}

.page.ad-mode .panel .stack {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.page.ad-mode .panel .stack > * {
  flex: 0 0 auto;
}

.page.ad-mode .panel .stack .row {
  margin-top: auto;
  padding-top: 6px;
}

.page.ad-mode .ad-form-body {
  flex: 1;
  min-height: 0;
  display: grid;
  gap: 12px;
  overflow: auto;
  padding-right: 4px;
}

.page.ad-mode .ad-form-body textarea {
  min-height: 44px;
  max-height: 96px;
}

.page.ad-mode select {
  height: 42px;
}

:root {
  --panel-height: clamp(420px, 56vh, 520px);
}

.top {
  display: grid;
  gap: 18px;
  align-items: end;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  margin-bottom: 20px;
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
  min-height: 180px;
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
  max-height: 120px;
  object-fit: cover;
}

.drop.single {
  min-height: 180px;
}

.preset-section {
  display: grid;
  gap: 10px;
}

.preset-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preset-title {
  margin: 0;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.28em;
  color: #6b7785;
}

.preset-status {
  font-size: 12px;
  color: #4a5866;
}

.preset-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.preset-card {
  border: 1px solid #dfe5ea;
  border-radius: 16px;
  padding: 12px;
  background: #fff;
  display: grid;
  gap: 10px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.preset-card:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}

.preset-card:hover {
  border-color: #157066;
  box-shadow: 0 12px 26px rgba(21, 112, 102, 0.12);
  transform: translateY(-1px);
}

.preset-card.active {
  border-color: #157066;
  box-shadow: 0 0 0 2px rgba(21, 112, 102, 0.18);
}

.preset-thumbs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.preset-thumbs.single {
  grid-template-columns: 1fr;
}

.preset-thumb {
  border-radius: 12px;
  overflow: hidden;
  background: #eef2f4;
  height: 78px;
}

.preset-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preset-text {
  display: grid;
  gap: 4px;
}

.preset-label {
  margin: 0;
  font-weight: 600;
  color: #2f3c4a;
  font-size: 13px;
}

.preset-desc {
  margin: 0;
  font-size: 12px;
  color: #6b7785;
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

.video-output {
  height: 100%;
  display: grid;
  grid-template-rows: 1fr;
}

.video-output .loading,
.video-output .status-panel {
  height: 100%;
}

.video-output .result {
  width: 100%;
  align-content: start;
  justify-items: stretch;
}

.video-output .result .row {
  justify-content: center;
  align-items: center;
  align-self: start;
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
  align-items: stretch;
}

.creative-panel {
  min-height: var(--panel-height);
}

.creative-panel .stack {
  gap: 14px;
}

.creative-panel .drop-grid {
  gap: 12px;
}

.creative-panel .drop {
  min-height: 150px;
}

.creative-panel .drop-preview img {
  max-height: 110px;
}

.creative-preview {
  height: var(--panel-height);
}

.video-preview {
  height: var(--panel-height);
}

.ad-preview-panel {
  height: var(--panel-height);
  overflow: hidden;
}

.ad-preview-body {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.ad-center {
  height: 100%;
  display: grid;
  place-items: center;
  text-align: center;
  color: #556270;
  gap: 10px;
}

.empty {
  color: #4a5866;
  font-size: 14px;
  display: grid;
  place-items: center;
  height: 100%;
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
  width: 100%;
  object-fit: contain;
}

.result video {
  max-height: 320px;
}

.remix-section {
  width: 100%;
  display: grid;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e9ed;
}

.remix-section textarea {
  min-height: 56px;
}

.remix-section .primary {
  justify-self: start;
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
  border-radius: inherit;
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

.creative-result {
  width: 100%;
  justify-items: stretch;
}

.creative-result-body {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(160px, 200px) 1fr;
  gap: 18px;
  align-items: start;
  height: 100%;
}

.cta-column {
  display: grid;
  gap: 10px;
  align-content: start;
}

.cta-column .primary,
.cta-column .ghost {
  width: 100%;
}

.creative-media {
  display: grid;
  gap: 12px;
  grid-template-rows: minmax(0, 1fr) auto;
}

.prompt-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  width: 100%;
  grid-column: 1 / -1;
}

.prompt-row .preview-field {
  flex: 1;
}

.prompt-row .primary {
  white-space: nowrap;
}

.image-viewport {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  min-height: 320px;
  max-height: 460px;
  border-radius: 24px;
  overflow: hidden;
  background: #f7f4ef;
  cursor: grab;
  display: grid;
  place-items: center;
  touch-action: none;
  height: 100%;
}

.image-viewport:active {
  cursor: grabbing;
}

.zoomable-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform-origin: center;
  transition: transform 0.06s ease-out;
  user-select: none;
  pointer-events: none;
}

.preview-field textarea {
  min-height: 72px;
}

.script-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  flex: 1;
}

.script-title {
  margin: 0;
  font-weight: 600;
  color: #2f3c4a;
}

.script-textarea {
  flex: 1;
  min-height: clamp(320px, 58vh, 640px);
  max-height: none;
  height: 100%;
  resize: none;
  overflow: auto;
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

  .creative-result-body {
    grid-template-columns: 1fr;
  }

  .cta-column {
    grid-auto-flow: row;
  }

  .prompt-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
