import { temariuta } from './temariuta.js';

// 盤に置く札は、内部IDではなく作中で読める言葉を必ず持つ。
export const boardCards = {
  onda: { id:'onda', kind:'dead', name:'恩田徹', note:'初版本に疑いを書き込んでいた老評論家' },
  sogen: { id:'sogen', kind:'dead', name:'鬼灯宗玄', note:'顔を失って発見された、館の主' },
  goko: { id:'goko', kind:'actor', name:'鬼灯剛蔵', note:'宗玄の紙を受け取っていた兄' },
  poison: { id:'poison', kind:'meaning', name:'珈琲の毒', note:'金の盃に残された眠りの読み' },
  corpse_callus: { id:'corpse_callus', kind:'meaning', name:'死体のペンだこ', note:'白布の下に残った、書く者の指' },
  body_swap: { id:'body_swap', kind:'meaning', name:'顔のすげ替え', note:'名と顔を切り離すための偽装' },
  old_servant: { id:'old_servant', kind:'dead', name:'古参の使用人', note:'館の古い頁を知る者' },
  false_death: { id:'false_death', kind:'meaning', name:'偽りの水死', note:'水底へ沈められた不在の筋書き' },
  accomplice: { id:'accomplice', kind:'dead', name:'共犯の男', note:'唄の外で役を渡された者' },
  shiori: { id:'shiori', kind:'actor', name:'霧原栞', note:'頁を読み、余白を恐れる司書' },
  underground: { id:'underground', kind:'meaning', name:'地下の通路', note:'館の綴じ目の奥へ続く道' },
  silencing: { id:'silencing', kind:'meaning', name:'口封じ', note:'届くはずの歌を閉じるための手' },
  truth_closure: { id:'truth_closure', kind:'meaning', name:'真実による幕引き', note:'作り話を本当の筆で閉じる読み' },
  surface: { id:'surface', kind:'meaning', name:'表の読み', note:'まず卓上に置ける、穏当な筋書き' },
};

export const boardVerses = [
  { number:1, summary:'客が毒で眠らされる', text:temariuta[0], unlock:'表の読み', contradictions:{ actor:{ goko:'一番の実行者に鬼灯剛蔵を置いた。だが剛蔵は散会のあと大広間から動いていない。誰かの証言と、この配置は両立しない。' } } },
  { number:2, summary:'主人が顔を失う', text:temariuta[1], unlock:'表の読み', contradictions:{ meaning:{ corpse_callus:'二番の死体へ、ペンだこだけを置くには頁が足りない。失われた顔と、まだ結び直せていない。' } } },
  { number:3, summary:'水辺で一人沈む', text:temariuta[2], unlock:'宗玄の脚本', contradictions:{} },
  { number:4, summary:'唄うたいが声を失う', text:temariuta[3], unlock:'宗玄の脚本', contradictions:{} },
  { number:5, summary:'逃げた鳥が撃ち落とされる', text:temariuta[4], unlock:'律の裏読み', contradictions:{} },
  { number:6, summary:'語り部が幕を引く', text:temariuta[5], unlock:'律の裏読み', contradictions:{} },
];

// 順序へ意味を埋め込まない。物語上の正解は従来の配列から変更していない。
export const boardSolution = [
  { dead:'onda', actor:'goko', meaning:'poison' },
  { dead:'sogen', actor:'sogen', meaning:'body_swap' },
  { dead:'old_servant', actor:'sogen', meaning:'false_death' },
  { dead:'accomplice', actor:'shiori', meaning:'underground' },
  { dead:'shiori', actor:'sogen', meaning:'silencing' },
  { dead:'sogen', actor:'sogen', meaning:'truth_closure' },
];
