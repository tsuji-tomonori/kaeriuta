import { flags as flagDefinitions } from '../data/flags.js';

export const PROGRESS_KEY = 'kaeriuta-progress';

export const DEFAULT_SETTINGS = Object.freeze({
  skipRead: true,
  skipAll: false,
  autoWait: 1.0,
  explorationHints: false,
  textSpeed: 1.0,
  bgmVolume: 0.6,
  ambienceVolume: 0.6,
  seVolume: 0.8,
  muteAudio: false,
});
const READ_FLUSH_THRESHOLD = 24;
const FALLBACK_UNLOCK = { ending: 'b1_true', allPastFlags: true };
const recordsModule = await import('../data/records.js').catch(() => ({}));
const memoirUnlock = recordsModule.ritsuMemoir?.unlock ?? FALLBACK_UNLOCK;
const readBuffers = new Map();
let lifecycleInstalled = false;

function freshProgress() {
  return {
    version: 1,
    endings: {},
    read: {},
    chapters: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function normalizeSettings(settings) {
  const merged = { ...DEFAULT_SETTINGS, ...(settings ?? {}) };
  return {
    skipRead: Boolean(merged.skipRead),
    skipAll: Boolean(merged.skipAll),
    autoWait: Number.isFinite(Number(merged.autoWait)) ? Math.max(0.5, Math.min(3, Number(merged.autoWait))) : DEFAULT_SETTINGS.autoWait,
    explorationHints: Boolean(merged.explorationHints),
    textSpeed: Number.isFinite(Number(merged.textSpeed)) ? Math.max(0.5, Math.min(2, Number(merged.textSpeed))) : DEFAULT_SETTINGS.textSpeed,
    bgmVolume: Number.isFinite(Number(merged.bgmVolume)) ? Math.max(0, Math.min(1, Number(merged.bgmVolume))) : DEFAULT_SETTINGS.bgmVolume,
    ambienceVolume: Number.isFinite(Number(merged.ambienceVolume)) ? Math.max(0, Math.min(1, Number(merged.ambienceVolume))) : DEFAULT_SETTINGS.ambienceVolume,
    seVolume: Number.isFinite(Number(merged.seVolume)) ? Math.max(0, Math.min(1, Number(merged.seVolume))) : DEFAULT_SETTINGS.seVolume,
    muteAudio: Boolean(merged.muteAudio),
  };
}

function normalizeProgress(value) {
  const base = freshProgress();
  if (!value || value.version !== 1) return base;
  return {
    version: 1,
    endings: value.endings && typeof value.endings === 'object' ? value.endings : {},
    read: value.read && typeof value.read === 'object' ? value.read : {},
    chapters: value.chapters && typeof value.chapters === 'object' ? value.chapters : {},
    settings: normalizeSettings(value.settings),
  };
}

function parseStored(storage) {
  try {
    return normalizeProgress(JSON.parse(storage?.getItem(PROGRESS_KEY)));
  } catch {
    return freshProgress();
  }
}

function cloneProgress(progress) {
  return structuredClone(progress);
}

function installLifecycleFlush() {
  if (lifecycleInstalled || typeof window === 'undefined' || typeof document === 'undefined') return;
  lifecycleInstalled = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushRead(globalThis.localStorage);
  });
  window.addEventListener('pagehide', () => flushRead(globalThis.localStorage));
}

export function loadProgress(storage = globalThis.localStorage) {
  installLifecycleFlush();
  const buffered = readBuffers.get(storage);
  return cloneProgress(buffered?.progress ?? parseStored(storage));
}

export function saveProgress(progress, storage = globalThis.localStorage) {
  const normalized = normalizeProgress(progress);
  storage?.setItem(PROGRESS_KEY, JSON.stringify(normalized));
  readBuffers.delete(storage);
  return cloneProgress(normalized);
}

export function recordEnding(endingId, state, storage = globalThis.localStorage) {
  const progress = loadProgress(storage);
  const previous = progress.endings[endingId];
  const acquiredFlags = Object.values(state?.flags ?? {}).flat().filter((id) => typeof id === 'string');
  progress.endings[endingId] = {
    clearedAt: Date.now(),
    count: (previous?.count ?? 0) + 1,
    past: state?.flags?.past?.length ?? 0,
    flags: Object.fromEntries(acquiredFlags.map((id) => [id, true])),
  };
  return saveProgress(progress, storage);
}

export function isEndingCleared(endingId, progress) {
  return Boolean(progress?.endings?.[endingId]);
}

export function clearedEndings(progress) {
  return Object.keys(progress?.endings ?? {});
}

export function clearedEndingCount(progress) {
  return clearedEndings(progress).length;
}

export function markRead(sceneId, nodeKey, storage = globalThis.localStorage) {
  if (!sceneId || !nodeKey) return loadProgress(storage);
  let buffer = readBuffers.get(storage);
  if (!buffer) {
    buffer = { progress: parseStored(storage), dirty: 0 };
    readBuffers.set(storage, buffer);
  }
  buffer.progress.read[sceneId] ??= {};
  if (!buffer.progress.read[sceneId][nodeKey]) {
    buffer.progress.read[sceneId][nodeKey] = 1;
    buffer.dirty += 1;
  }
  if (buffer.dirty >= READ_FLUSH_THRESHOLD) flushRead(storage);
  installLifecycleFlush();
  return cloneProgress(buffer.progress);
}

export function isRead(sceneId, nodeKey, progress) {
  return progress?.read?.[sceneId]?.[nodeKey] === 1;
}

export function flushRead(storage = globalThis.localStorage) {
  const buffer = readBuffers.get(storage);
  if (!buffer) return loadProgress(storage);
  storage?.setItem(PROGRESS_KEY, JSON.stringify(normalizeProgress(buffer.progress)));
  readBuffers.delete(storage);
  return cloneProgress(buffer.progress);
}

export function loadSettings(storage = globalThis.localStorage) {
  return { ...loadProgress(storage).settings };
}

// The title screen used this key before settings were kept in progress.
// Retain it as a read-only compatibility signal for existing players.
export function explorationHintsEnabled(storage = globalThis.localStorage) {
  return Boolean(loadSettings(storage).explorationHints)
    || storage?.getItem('kaeriuta-exploration-hints') === 'on';
}

export function saveSettings(patch, storage = globalThis.localStorage) {
  const progress = loadProgress(storage);
  progress.settings = { ...progress.settings, ...patch };
  return { ...saveProgress(progress, storage).settings };
}

export function resetProgress(storage = globalThis.localStorage) {
  readBuffers.delete(storage);
  storage?.removeItem(PROGRESS_KEY);
  return freshProgress();
}

export function isMemoirUnlocked(progress) {
  const requiredEnding = memoirUnlock?.ending;
  if (requiredEnding && !isEndingCleared(requiredEnding, progress)) return false;
  if (!memoirUnlock?.allPastFlags) return true;
  const allPastCount = Object.values(flagDefinitions).filter((flag) => flag.line === 'past').length;
  return (progress?.endings?.[requiredEnding]?.past ?? 0) >= allPastCount;
}
