/** 実音源がないα版では呼び出しを記録するだけで、再生失敗をゲーム進行に波及させない。 */
export class AudioManager {
  constructor() { this.bgm = null; }
  playSE(_id) {}
  playBGM(_id, _fade = 0) {}
  stopBGM() { this.bgm?.pause(); this.bgm = null; }
}
