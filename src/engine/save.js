import { createGameState } from './state.js';
import { scenes } from '../data/scenario/index.js';

const PREFIX = 'kaeriuta-alpha-';
export const SAVE_SLOTS = ['1', '2', '3'];
export const AUTO_SLOT = 'auto';

export function saveKey(slot) { return `${PREFIX}${slot}`; }
export function serializeState(state) { return JSON.stringify(state); }
export function deserializeState(raw) {
  try {
    const value = JSON.parse(raw);
    if (value?.version === 2 && Array.isArray(value.executionStack)) return value;
    return null;
  } catch { return null; }
}

function flagCount(state, line) {
  return Array.isArray(state?.flags?.[line]) ? state.flags[line].length : 0;
}

function saveMeta(state) {
  return {
    chapter: scenes[state?.sceneId]?.chapter ?? '章情報なし',
    sceneId: state?.sceneId ?? null,
    suspicion: state?.params?.suspicion ?? 0,
    conviction: state?.params?.conviction ?? 0,
    endingId: state?.endingId ?? null,
    past: flagCount(state, 'past'),
    plan: flagCount(state, 'plan'),
    alive: flagCount(state, 'alive'),
  };
}

function parseSave(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value?.format === 3 && value.state?.version === 2 && Array.isArray(value.state.executionStack)) {
      return {
        savedAt: Number.isFinite(value.savedAt) ? value.savedAt : null,
        meta: { ...saveMeta(value.state), ...(value.meta ?? {}) },
        state: value.state,
      };
    }
    if (value?.version === 2 && Array.isArray(value.executionStack)) {
      return { savedAt: null, meta: saveMeta(value), state: value };
    }
  } catch {}
  return null;
}

export function saveGame(slot, state, storage = globalThis.localStorage) {
  const record = { format: 3, savedAt: Date.now(), meta: saveMeta(state), state };
  storage?.setItem(saveKey(slot), JSON.stringify(record));
}

export function loadSaveRecord(slot, storage = globalThis.localStorage) {
  return parseSave(storage?.getItem(saveKey(slot)));
}

export function loadGame(slot, storage = globalThis.localStorage) {
  return loadSaveRecord(slot, storage)?.state ?? null;
}

export function listSaves(slots, storage = globalThis.localStorage) {
  return slots.map((slot) => {
    const record = loadSaveRecord(slot, storage);
    return {
      slot,
      exists: Boolean(record),
      savedAt: record?.savedAt ?? null,
      meta: record?.meta ?? null,
    };
  });
}

export function hasSave(slot, storage = globalThis.localStorage) {
  return Boolean(loadSaveRecord(slot, storage));
}

export function clearSave(slot, storage = globalThis.localStorage) {
  storage?.removeItem(saveKey(slot));
}

export function newGame() { return createGameState(); }
