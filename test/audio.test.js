import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioManager } from '../src/engine/audio.js';

test('Audio と document がない Node 環境では音声 API が安全な no-op になる', () => {
  const audio = new AudioManager();
  assert.doesNotThrow(() => {
    audio.applySettings({ bgmVolume: 0.2, ambienceVolume: 0.4, seVolume: 0.3, muteAudio: true });
    audio.playBGM('bgm_arrival', 100);
    audio.playSE('se_glass');
    audio.resume();
    audio.stopBGM();
    audio.playAmbience('amb_corridor', 100);
    audio.stopAmbience(100);
  });
  assert.equal(audio.bgm, null);
  assert.equal(audio.ambience, null);
});

test('EDは非ループ再生でき、カテゴリ別の安全ゲインを適用する', () => {
  const created = [];
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({
        createLinearGradient: () => ({ addColorStop() {} }),
        fillRect() {}, strokeRect() {}, fillText() {},
      }),
      toDataURL: () => 'data:image/png;base64,test',
    }),
  };
  globalThis.Audio = class {
    constructor(src) { this.src = src; this.volume = 1; this.loop = true; created.push(this); }
    play() { return Promise.resolve(); }
    pause() {}
    addEventListener() {}
  };
  try {
    const audio = new AudioManager();
    audio.applySettings({ bgmVolume: 1, ambienceVolume: 1, seVolume: 1 });
    const credits = audio.playBGM('bgm_credits', 0, false);
    assert.equal(credits.loop, false);
    assert.equal(credits.volume, 0.9);
    audio.playSE('se_glass');
    assert.ok(created[1].playbackRate >= 0.98 && created[1].playbackRate <= 1.02);
    assert.equal(created[1].volume, 0.78);
    clearTimeout(audio._duckTimer);
    audio.stopBGM();
  } finally {
    delete globalThis.Audio;
    delete globalThis.document;
  }
});
