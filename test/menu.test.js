import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../src/engine/state.js';
import { flags } from '../src/data/flags.js';
import { availableChapters, chapterSlot } from '../src/data/chapters.js';
import {
  clearedEndingCount,
  flushRead,
  isEndingCleared,
  isMemoirUnlocked,
  isRead,
  loadProgress,
  markRead,
  recordEnding,
  saveProgress,
} from '../src/engine/progress.js';
import { listSaves, loadGame, loadSaveRecord, saveGame, saveKey } from '../src/engine/save.js';

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values,
  };
}

test('END進捗を記録して読み出せる', () => {
  const storage = createStorage();
  const state = createGameState();
  state.flags.past.push('acrostic');
  const progress = recordEnding('a1_arrest', state, storage);
  assert.equal(isEndingCleared('a1_arrest', progress), true);
  assert.equal(clearedEndingCount(progress), 1);
  assert.equal(progress.endings.a1_arrest.count, 1);
  assert.equal(progress.endings.a1_arrest.past, 1);
  assert.equal(progress.endings.a1_arrest.flags.acrostic, true);
  assert.equal(isEndingCleared('b1_true', loadProgress(storage)), false);
});

test('既読はflushするまでバッファされ、flush後に往復できる', () => {
  const storage = createStorage();
  const progress = markRead('chapter1', 'nodes#12', storage);
  assert.equal(isRead('chapter1', 'nodes#12', progress), true);
  assert.equal(storage.values.has('kaeriuta-progress'), false);
  flushRead(storage);
  assert.equal(isRead('chapter1', 'nodes#12', loadProgress(storage)), true);
});

test('律の手記は真相ENDと全pastフラグが揃ったときだけ解禁される', () => {
  const progress = loadProgress(createStorage());
  progress.endings.b1_true = { clearedAt: 1, count: 1, past: 0, flags: {} };
  assert.equal(isMemoirUnlocked(progress), false);
  progress.endings.b1_true.past = Object.values(flags).filter((flag) => flag.line === 'past').length;
  assert.equal(isMemoirUnlocked(progress), true);
  delete progress.endings.b1_true;
  assert.equal(isMemoirUnlocked(progress), false);
});

test('format 3セーブはメタ情報を持ち、一覧とstateロードに使える', () => {
  const storage = createStorage();
  const state = createGameState();
  state.sceneId = 'chapter3';
  state.params.suspicion = 42;
  state.flags.plan.push('cleanup');
  saveGame('3', state, storage);
  const stored = JSON.parse(storage.values.get(saveKey('3')));
  assert.equal(stored.format, 3);
  assert.equal(typeof stored.savedAt, 'number');
  const record = loadSaveRecord('3', storage);
  assert.equal(record.meta.chapter, '第三章　2日目・夜');
  assert.equal(record.meta.suspicion, 42);
  assert.equal(record.meta.plan, 1);
  assert.deepEqual(loadGame('3', storage), state);
  assert.deepEqual(listSaves(['1', '3'], storage).map(({ slot, exists }) => ({ slot, exists })), [
    { slot: '1', exists: false },
    { slot: '3', exists: true },
  ]);
});

test('章選択は章頭スナップショットがある章だけを利用可能にする', () => {
  const storage = createStorage();
  const state = createGameState();
  state.sceneId = 'chapter2';
  saveGame(chapterSlot(state.sceneId), state, storage);
  const entries = availableChapters(storage);
  assert.equal(chapterSlot('chapter2'), 'chapter-2');
  assert.equal(chapterSlot('end_a1'), null);
  assert.equal(entries.find((chapter) => chapter.key === 'ch2').available, true);
  assert.equal(entries.find((chapter) => chapter.key === 'ch3').available, false);
});

test('version 2の旧形式セーブを保存レコードへ読み替えられる', () => {
  const state = createGameState();
  state.sceneId = 'chapter1';
  const storage = createStorage({ [saveKey('1')]: JSON.stringify(state) });
  const record = loadSaveRecord('1', storage);
  assert.deepEqual(record.state, state);
  assert.equal(record.savedAt, null);
  assert.equal(record.meta.chapter, '第一章　1日目');
});

test('設定を含む進捗を正規化して保存できる', () => {
  const storage = createStorage();
  const progress = loadProgress(storage);
  progress.settings.textSpeed = 1.5;
  saveProgress(progress, storage);
  assert.equal(loadProgress(storage).settings.textSpeed, 1.5);
});
