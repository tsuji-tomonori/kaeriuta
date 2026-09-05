import { temariuta } from './temariuta.js';

// 盤に置く札は、内部IDではなく作中で読める言葉を必ず持つ。
export const boardCards = {
  onda: { id:'onda', kinds:['dead'], name:'恩田徹', note:'初版本に疑いを書き込んでいた老評論家' },
  sogen: { id:'sogen', kinds:['dead','actor'], name:'鬼灯宗玄', note:'顔を失って発見された、館の主' },
  goko: { id:'goko', kinds:['actor'], name:'鬼灯剛蔵', note:'宗玄の紙を受け取っていた兄' },
  poison: { id:'poison', kinds:['meaning'], name:'珈琲の毒', note:'金の盃に残された眠りの読み' },
  corpse_callus: { id:'corpse_callus', kinds:['meaning'], name:'死体のペンだこ', note:'白布の下に残った、書く者の指' },
  body_swap: { id:'body_swap', kinds:['meaning'], name:'顔のすげ替え', note:'名と顔を切り離すための偽装' },
  old_servant: { id:'old_servant', kinds:['dead'], name:'古参の使用人', note:'館の古い頁を知る者' },
  false_death: { id:'false_death', kinds:['meaning'], name:'偽りの水死', note:'水底へ沈められた不在の筋書き' },
  accomplice: { id:'accomplice', kinds:['dead'], name:'共犯の男', note:'唄の外で役を渡された者' },
  shiori: { id:'shiori', kinds:['actor','dead'], name:'鬼灯栞', note:'自分の名も盤上の駒になったと知る司書' },
  underground: { id:'underground', kinds:['meaning'], name:'地下の通路', note:'館の綴じ目の奥へ続く道' },
  silencing: { id:'silencing', kinds:['meaning'], name:'口封じ', note:'届くはずの歌を閉じるための手' },
  truth_closure: { id:'truth_closure', kinds:['meaning'], name:'真実による幕引き', note:'作り話を本当の筆で閉じる読み' },
  surface: { id:'surface', kinds:['meaning'], name:'表の読み', note:'まず卓上に置ける、穏当な筋書き' },
};

export const boardVerses = [
  { number:1, summary:'客が毒で眠らされる', text:temariuta[0], unlock:'表の読み', contradictions:{
    truth:{
      dead:{ sogen:'一番の死者を宗玄にすると、顔を失う二番と同じ夜へ重なる。金の盃の客は別にいる。', shiori:'一番の死者を私にすると、頁の外へ退いたはずの司書が金の盃を受けたことになる。' },
      actor:{ sogen:'一番の実行者を宗玄にすると、死者として横たわる二番の姿と手が重なる。宗玄の役はここではない。', shiori:'一番の実行者を私にすると、毒を渡した手を示す証言が一つも残らない。余白だけでは盃に触れられない。' },
      meaning:{ surface:'一番を表の読みのままにすると、金の盃が誰の手で眠りになったかを読まずに残す。ここでは一段深く結ぶ。', corpse_callus:'一番の金の盃をペンだこで読むと、眠りへ至る手段が消える。指の痕は別の節の手掛かりだ。', body_swap:'一番を顔のすげ替えと読むには、失われた名も顔も唄にない。盃の底に残るものを捨てられない。' },
    },
    show:{
      dead:{ sogen:'見せる盤の一番を宗玄にすると、顔のない館主を二番から奪う。悟郎たちへ渡す順序が崩れる。', shiori:'見せる盤の一番へ私の名を置けば、毒の客を司書だと悟郎たちへ名指しすることになる。' },
      actor:{ goko:'見せる盤の一番を剛蔵にすると、散会後も大広間にいた証言を自分で壊す。表の説明としても通らない。', shiori:'見せる盤の一番へ私の名を置けば、悟郎たちの前で司書を毒の手として差し出すことになる。' },
      meaning:{ surface:'見せる盤の一番を表の読みだけで止めると、悟郎たちへ差し出す毒の説明が空欄のまま残る。', corpse_callus:'見せる盤の一番をペンだこにすると、金の盃と眠りを結ぶ表の筋が切れる。', body_swap:'見せる盤の一番に顔のすげ替えを置くと、顔を失う二番の説明まで先取りしてしまう。' },
    },
  } },
  { number:2, summary:'主人が顔を失う', text:temariuta[1], unlock:'表の読み', contradictions:{
    truth:{
      dead:{ onda:'二番の死者を恩田にすると、金の盃の客を一番から消してしまう。顔を失ったのは館の主だ。', shiori:'二番の死者を私にすると、白布の下の手と館主の名が行き場を失う。私はまだ盤を読んでいる。' },
      actor:{ goko:'二番の実行者を剛蔵にすると、顔を失わせるための紙と手の痕が結ばれない。兄の役は別にある。', shiori:'二番の実行者を私にすると、名を落とす仕掛けを私が作った証拠がない。読んだ者と書いた者を混ぜている。' },
      meaning:{ surface:'二番を表の読みのままにすると、失われた顔を誰が何のために替えたかが残る。ここでは偽装を読む。', poison:'二番を毒で読むと、金の盃を一番から取り去ることになる。ここで失われたのは眠りではなく顔だ。', corpse_callus:'二番へペンだこだけを置くには頁が足りない。失われた顔と、まだ結び直せていない。' },
    },
    show:{
      dead:{ onda:'見せる盤の二番を恩田にすると、一番で眠った客の名を消してしまう。悟郎たちにも説明できない。', shiori:'見せる盤の二番へ私の名を置けば、顔のない館主の代わりに司書の死を悟郎たちへ告げることになる。' },
      actor:{ sogen:'見せる盤の二番を宗玄自身の手にすると、死者が自分の顔を奪った説明になる。表の読みとしても苦しい。', shiori:'見せる盤の二番へ私の名を置けば、司書が館主を偽装したと悟郎たちへ名指しすることになる。' },
      meaning:{ surface:'見せる盤の二番を表の読みのままにすると、顔のない館主という説明が空欄のまま残る。', corpse_callus:'見せる盤の二番をペンだこにすると、悟郎たちへ見せる死体の説明が細部だけで止まる。', body_swap:'見せる盤の二番に顔のすげ替えを置けば、館主の生存を疑わせる。今は悟郎たちへ渡せない読みだ。' },
    },
  } },
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

// 悟郎たちへ渡せる、証言と表層の状況証拠で組んだ読み。栞を名指ししない。
export const boardCover = [
  // 恩田を眠らせたのは宗玄、という館の内側だけで通る穏当な説明。
  { dead:'onda', actor:'sogen', meaning:'poison' },
  // 宗玄を殺された館主として置く。顔のすげ替えは、生存を指すため渡せない。
  { dead:'sogen', actor:'goko', meaning:'poison' },
  { dead:'old_servant', actor:'goko', meaning:'false_death' },
  { dead:'old_servant', actor:'sogen', meaning:'underground' },
  { dead:'accomplice', actor:'sogen', meaning:'silencing' },
  { dead:'sogen', actor:'goko', meaning:'surface' },
];
