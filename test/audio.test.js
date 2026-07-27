import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioManager } from '../src/engine/audio.js';

test('Audio と document がない Node 環境では音声 API が安全な no-op になる', () => {
  const audio = new AudioManager();
  assert.doesNotThrow(() => {
    audio.applySettings({ bgmVolume: 0.2, seVolume: 0.3, muteAudio: true });
    audio.playBGM('bgm_arrival', 100);
    audio.playSE('se_glass');
    audio.resume();
    audio.stopBGM();
  });
  assert.equal(audio.bgm, null);
});
