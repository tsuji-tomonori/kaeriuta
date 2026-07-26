import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../src/engine/state.js';
import { saveKey } from '../src/engine/save.js';
import {
  initializeApp,
  nodeKeyFromState,
  saveChapterSnapshot,
} from '../src/main.js';

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values,
  };
}

function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener(type, listener) {
      listeners.set(type, (listeners.get(type) ?? []).filter((entry) => entry !== listener));
    },
    listenerCount(type) {
      return listeners.get(type)?.length ?? 0;
    },
  };
}

test('initializeAppを2回呼んでもdocumentリスナが多重登録されない', async () => {
  const documentRef = createEventTarget();
  const options = {
    root: {},
    documentRef,
    loadAssets: false,
    showInitialTitle: false,
  };
  const first = await initializeApp(options);
  assert.equal(documentRef.listenerCount('keydown'), 1);
  assert.equal(documentRef.listenerCount('wheel'), 1);

  const second = await initializeApp(options);
  assert.equal(documentRef.listenerCount('keydown'), 1);
  assert.equal(documentRef.listenerCount('wheel'), 1);

  second.dispose();
  assert.equal(documentRef.listenerCount('keydown'), 0);
  assert.equal(documentRef.listenerCount('wheel'), 0);
  void first;
});

test('nodeKeyはexecutionStack最終フレームのpathとindexから一意に決まる', () => {
  const state = createGameState();
  assert.equal(nodeKeyFromState(state), '#0');
  state.executionStack.push({ path: [7, 'then', 2, 'else'], index: 3 });
  assert.equal(nodeKeyFromState(state), '7.then.2.else#3');
  state.executionStack.at(-1).index = 4;
  assert.equal(nodeKeyFromState(state), '7.then.2.else#4');
});

test('章頭スナップショットはロード経由では保存し直さない', () => {
  const storage = createStorage();
  const state = createGameState();
  state.sceneId = 'chapter2';

  assert.equal(saveChapterSnapshot(state, { fromLoad: true, storage }), false);
  assert.equal(storage.values.has(saveKey('chapter-2')), false);

  assert.equal(saveChapterSnapshot(state, {
    storage,
    now: () => 1234,
  }), true);
  assert.equal(storage.values.has(saveKey('chapter-2')), true);
  const progress = JSON.parse(storage.values.get('kaeriuta-progress'));
  assert.deepEqual(progress.chapters.chapter2, {
    slot: 'chapter-2',
    reachedAt: 1234,
  });
});
