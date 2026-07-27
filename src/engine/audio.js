import { resolveAsset } from './assets.js';

/** 再生不能な環境でも、シナリオの進行を止めない音声管理。 */
export class AudioManager {
  constructor() {
    this.bgm = null;
    this.bgmId = null;
    this.ambience = null;
    this.ambienceId = null;
    this.bgmVolume = 0.6;
    this.ambienceVolume = 0.6;
    this.seVolume = 0.8;
    this.muteAudio = false;
    this._fadeTimer = null;
    this._ambienceFadeTimer = null;
    this._blockedBGM = false;
  }

  _canCreateAudio() { return typeof Audio !== 'undefined'; }
  _bgmGain() { return this.muteAudio ? 0 : this.bgmVolume; }
  _ambienceGain() { return this.muteAudio ? 0 : this.ambienceVolume; }
  _seGain() { return this.muteAudio ? 0 : this.seVolume; }
  _safePlay(audio, isBGM = false) {
    try {
      const result = audio?.play?.();
      if (result?.catch) result.catch(() => { if (isBGM) this._blockedBGM = true; });
    } catch { if (isBGM) this._blockedBGM = true; }
  }
  _clearFade() { if (this._fadeTimer) clearInterval(this._fadeTimer); this._fadeTimer = null; }
  _clearAmbienceFade() { if (this._ambienceFadeTimer) clearInterval(this._ambienceFadeTimer); this._ambienceFadeTimer = null; }

  applySettings(settings = {}) {
    this.bgmVolume = Number.isFinite(settings.bgmVolume) && settings.bgmVolume >= 0 && settings.bgmVolume <= 1 ? settings.bgmVolume : 0.6;
    this.ambienceVolume = Number.isFinite(settings.ambienceVolume) && settings.ambienceVolume >= 0 && settings.ambienceVolume <= 1 ? settings.ambienceVolume : 0.6;
    this.seVolume = Number.isFinite(settings.seVolume) && settings.seVolume >= 0 && settings.seVolume <= 1 ? settings.seVolume : 0.8;
    this.muteAudio = typeof settings.muteAudio === 'boolean' ? settings.muteAudio : false;
    try { if (this.bgm) this.bgm.volume = this._bgmGain(); } catch {}
    try { if (this.ambience) this.ambience.volume = this._ambienceGain(); } catch {}
  }

  resume() { if (this.bgm) this._safePlay(this.bgm, true); }

  playSE(id) {
    if (!this._canCreateAudio()) return;
    try {
      const audio = new Audio(resolveAsset(id).src);
      audio.volume = this._seGain();
      audio.addEventListener?.('ended', () => { try { audio.src = ''; audio.load?.(); } catch {} }, { once: true });
      this._safePlay(audio);
    } catch {}
  }

  playBGM(id, fade = 0) {
    if (this.bgmId === id && this.bgm) return;
    if (!this._canCreateAudio()) return;
    let next;
    try {
      next = new Audio(resolveAsset(id).src);
      next.loop = true;
      next.volume = 0;
    } catch { return; }
    const previous = this.bgm;
    this._clearFade();
    this.bgm = next;
    this.bgmId = id;
    this._blockedBGM = false;
    this._safePlay(next, true);
    const duration = Number.isFinite(fade) && fade > 0 ? fade : 0;
    if (!previous || !duration) {
      try { next.volume = this._bgmGain(); previous?.pause?.(); } catch {}
      return;
    }
    const started = Date.now();
    const oldVolume = Number.isFinite(previous.volume) ? previous.volume : this._bgmGain();
    this._fadeTimer = setInterval(() => {
      try {
        const progress = Math.min(1, (Date.now() - started) / duration);
        next.volume = this._bgmGain() * progress;
        previous.volume = oldVolume * (1 - progress);
        if (progress >= 1) { this._clearFade(); previous.pause?.(); previous.src = ''; }
      } catch { this._clearFade(); }
    }, 30);
  }

  stopBGM() {
    this._clearFade();
    try { this.bgm?.pause?.(); this.bgm && (this.bgm.src = ''); } catch {}
    this.bgm = null;
    this.bgmId = null;
  }

  playAmbience(id, fade = 0) {
    if (this.ambienceId === id && this.ambience) return;
    if (!this._canCreateAudio()) return;
    let next;
    try { next = new Audio(resolveAsset(id).src); next.loop = true; next.volume = 0; } catch { return; }
    const previous = this.ambience;
    this._clearAmbienceFade();
    this.ambience = next;
    this.ambienceId = id;
    this._safePlay(next);
    const duration = Number.isFinite(fade) && fade > 0 ? fade : 0;
    if (!previous || !duration) {
      try { next.volume = this._ambienceGain(); previous?.pause?.(); previous && (previous.src = ''); } catch {}
      return;
    }
    const started = Date.now();
    const oldVolume = Number.isFinite(previous.volume) ? previous.volume : this._ambienceGain();
    this._ambienceFadeTimer = setInterval(() => {
      try {
        const progress = Math.min(1, (Date.now() - started) / duration);
        next.volume = this._ambienceGain() * progress;
        previous.volume = oldVolume * (1 - progress);
        if (progress >= 1) { this._clearAmbienceFade(); previous.pause?.(); previous.src = ''; }
      } catch { this._clearAmbienceFade(); }
    }, 30);
  }

  stopAmbience(fade = 0) {
    const previous = this.ambience;
    this._clearAmbienceFade();
    this.ambience = null;
    this.ambienceId = null;
    if (!previous) return;
    const duration = Number.isFinite(fade) && fade > 0 ? fade : 0;
    if (!duration) { try { previous.pause?.(); previous.src = ''; } catch {} return; }
    const started = Date.now(); const oldVolume = Number.isFinite(previous.volume) ? previous.volume : this._ambienceGain();
    this._ambienceFadeTimer = setInterval(() => {
      try { const progress = Math.min(1, (Date.now() - started) / duration); previous.volume = oldVolume * (1 - progress); if (progress >= 1) { this._clearAmbienceFade(); previous.pause?.(); previous.src = ''; } } catch { this._clearAmbienceFade(); }
    }, 30);
  }
}
