import { createGameState } from './state.js';
const PREFIX = 'kaeriuta-alpha-';
export function saveKey(slot) { return `${PREFIX}${slot}`; }
export function serializeState(state) { return JSON.stringify(state); }
export function deserializeState(raw) {
  try {
    const value = JSON.parse(raw);
    if (value?.version === 2 && Array.isArray(value.executionStack)) return value;
    return null;
  } catch { return null; }
}
export function saveGame(slot, state, storage = localStorage) { storage.setItem(saveKey(slot), serializeState(state)); }
export function loadGame(slot, storage = localStorage) { return deserializeState(storage.getItem(saveKey(slot))) ?? null; }
export function hasSave(slot, storage = localStorage) { return Boolean(loadGame(slot, storage)); }
export function clearSave(slot, storage = localStorage) { storage.removeItem(saveKey(slot)); }
export function newGame() { return createGameState(); }
