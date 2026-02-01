/**
 * Build prompt for image blending (product + scene)
 * @param {string} [userPrompt] - Optional user prompt
 * @returns {string}
 */
export function buildImagePrompt(userPrompt) {
  const base =
    'Use image 1 as the subject and image 2 as the scene. Place the subject naturally into the scene with realistic lighting, shadow, and perspective. Preserve branding details, textures, and colors on the subject. The output image should have an aspect ratio suitable for viewing on social media apps like Instagram and TikTok.';
  if (!userPrompt) return base;
  return `${base} ${userPrompt}`;
}

/**
 * Build prompt for image regeneration/editing
 * @param {string} [userPrompt] - Optional user prompt
 * @returns {string}
 */
export function buildRegeneratePrompt(userPrompt) {
  const base =
    'Refine and improve this image based on the prompt. Only make the changes specified in the prompt and keep the image as close as possible to the original.';
  if (!userPrompt) return base;
  return `${base} ${userPrompt}`;
}

/**
 * Build detailed cinematic prompt for video generation
 * @param {string} [userPrompt] - User's script/prompt
 * @returns {string}
 */
export function buildVideoPrompt(userPrompt) {
  const cleaned = userPrompt?.trim();
  const timingMatches = cleaned ? [...cleaned.matchAll(/\[(\d{2}:\d{2})-(\d{2}:\d{2})\]/g)] : [];
  const shotCount = timingMatches.length;
  const lastEnd = timingMatches.length ? timingMatches[timingMatches.length - 1][2] : null;
  const durationSeconds = lastEnd
    ? lastEnd
        .split(':')
        .map((value) => Number(value))
        .reduce((total, value) => total * 60 + value, 0)
    : null;

  const formatAndLookLine =
    durationSeconds != null
      ? `Duration ${durationSeconds}s; 180° shutter; digital capture emulating 65 mm photochemical contrast; fine grain; subtle halation on speculars; no gate weave.`
      : 'Duration unspecified; 180° shutter; digital capture emulating 65 mm photochemical contrast; fine grain; subtle halation on speculars; no gate weave.';
  const shotListHeader =
    shotCount > 0 && durationSeconds != null
      ? `Optimized Shot List (${shotCount} shots / ${durationSeconds} s total)`
      : shotCount > 0
      ? `Optimized Shot List (${shotCount} shots / duration unspecified)`
      : 'Optimized Shot List (shots and duration unspecified)';
  const base = [
    'Format & Look',
    formatAndLookLine,
    '',
    'Lenses & Filtration',
    '32 mm / 50 mm spherical primes; Black Pro-Mist 1/4; slight CPL rotation to manage glass reflections on train windows.',
    '',
    'Grade / Palette',
    'Highlights: clean morning sunlight with amber lift.',
    'Mids: balanced neutrals with slight teal cast in shadows.',
    'Blacks: soft, neutral with mild lift for haze retention.',
    '',
    'Lighting & Atmosphere',
    'Natural sunlight from camera left, low angle (07:30 AM).',
    'Bounce: 4×4 ultrabounce silver from trackside.',
    'Negative fill from opposite wall.',
    'Practical: sodium platform lights on dim fade.',
    'Atmos: gentle mist; train exhaust drift through light beam.',
    '',
    'Location & Framing',
    'Urban commuter platform, dawn.',
    'Foreground: yellow safety line, coffee cup on bench.',
    'Midground: waiting passengers silhouetted in haze.',
    'Background: arriving train braking to a stop.',
    'Avoid signage or corporate branding.',
    '',
    'Wardrobe / Props / Extras',
    'Main subject: mid-30s traveler, navy coat, backpack slung on one shoulder, holding phone loosely at side.',
    'Extras: commuters in muted tones; one cyclist pushing bike.',
    'Props: paper coffee cup, rolling luggage, LED departure board (generic destinations).',
    '',
    'Sound',
    'Diegetic only: faint rail screech, train brakes hiss, distant announcement muffled (-20 LUFS), low ambient hum.',
    'Footsteps and paper rustle; no score or added foley.',
    '',
    shotListHeader,
    cleaned || '',
    '',
    'Camera Notes (Why It Reads)',
    'Keep eyeline low and close to lens axis for intimacy.',
    'Allow micro flares from train glass as aesthetic texture.',
    'Preserve subtle handheld imperfection for realism.',
    'Do not break silhouette clarity with overexposed flare; retain skin highlight roll-off.',
    '',
    'Finishing',
    'Fine-grain overlay with mild chroma noise for realism; restrained halation on practicals; warm-cool LUT for morning split tone.',
    'Mix: prioritize train and ambient detail over footstep transients.',
    'Poster frame: traveler mid-turn, golden rim light, arriving train soft-focus in background haze.'
  ];

  return base.join('\n');
}

/**
 * Build prompt for script generation
 * @param {string} brief - The ad brief
 * @param {number} seconds - Video duration in seconds
 * @returns {string}
 */
export function buildScriptPrompt(brief, seconds) {
  return [
    'Write a concise ad video script for a premium marketing spot.',
    `Total duration: ${seconds} seconds.`,
    'Output format: timestamped beats that fully cover the total duration.',
    'Each line must be in the form: [MM:SS-MM:SS] Beat description (scene + action + camera).',
    'The final timestamp must end exactly at the total duration.',
    'Use 3-7 beats depending on duration.',
    'Keep it brand-safe, product-forward, and cinematic.',
    '',
    `Brief: ${brief}`
  ].join('\n');
}
