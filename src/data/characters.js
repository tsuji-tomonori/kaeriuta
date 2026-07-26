/** 探偵側の表示名はこの一箇所だけを差し替える。画像IDは役割名で固定する。 */
export const detectiveNames = { kogoro: '毛塚 悟郎', ran: '毛塚 蘭子', conan: '江戸見 コウナン' };
export const characters = {
  shiori: { name: '鬼灯 栞', sprite: 'chara_shiori', expressions: ['normal', 'uneasy', 'resolve'] },
  sogen: { name: '鬼灯 宗玄', sprite: 'chara_sogen', expressions: ['smile', 'speech', 'shadow', 'cold'] },
  goko: { name: '鬼灯 剛蔵', sprite: 'chara_goko', expressions: ['normal', 'grim', 'angry'] },
  fujino: { name: '鬼灯 藤乃', sprite: 'chara_fujino', expressions: ['normal', 'uneasy', 'sad'] },
  saeki: { name: '佐伯 道生', sprite: 'chara_saeki', expressions: ['normal', 'guarded', 'pale'] },
  makabe: { name: '真壁 悠', sprite: 'chara_makabe', expressions: ['normal', 'uneasy', 'stern'] },
  onda: { name: '恩田 徹', sprite: 'chara_onda', expressions: ['normal', 'wary', 'smirk'] },
  uno: { name: '宇野 岩男', sprite: 'chara_uno', expressions: ['normal', 'kind', 'shadow'] },
  housekeeper: { name: '家政婦・志津', sprite: 'chara_housekeeper', expressions: ['normal', 'uneasy', 'bow'] },
  toyo: { name: 'トヨ', sprite: 'chara_toyo', expressions: ['normal', 'wary', 'sad'] },
  kogoro: { get name() { return detectiveNames.kogoro; }, sprite: 'chara_detective', expressions: ['normal', 'boast', 'sleepy'] },
  ran: { get name() { return detectiveNames.ran; }, sprite: 'chara_companion', expressions: ['normal', 'kind', 'uneasy'] },
  conan: { get name() { return detectiveNames.conan; }, sprite: 'chara_observer', expressions: ['normal', 'watch', 'serious'] },
};
