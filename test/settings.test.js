import test from 'node:test';
import assert from 'node:assert/strict';
import { explorationHintsEnabled, loadSettings, saveSettings } from '../src/engine/progress.js';

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test('音量設定は既定値を持ち、範囲内に正規化される', () => {
  const storage = createStorage();
  assert.deepEqual(
    Object.fromEntries(['bgmVolume', 'seVolume', 'muteAudio'].map((key) => [key, loadSettings(storage)[key]])),
    { bgmVolume: 0.6, seVolume: 0.8, muteAudio: false },
  );
  const settings = saveSettings({ bgmVolume: 2, seVolume: -1, muteAudio: 'yes' }, storage);
  assert.equal(settings.bgmVolume, 1);
  assert.equal(settings.seVolume, 0);
  assert.equal(settings.muteAudio, true);
});

test('自由探索ヒントは設定を正本にしつつ旧キーも互換として読む', () => {
  const storage = createStorage();
  assert.equal(explorationHintsEnabled(storage), false);
  saveSettings({ explorationHints: true }, storage);
  assert.equal(explorationHintsEnabled(storage), true);
  saveSettings({ explorationHints: false }, storage);
  storage.setItem('kaeriuta-exploration-hints', 'on');
  assert.equal(explorationHintsEnabled(storage), true);
});
