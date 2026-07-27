import { gazeValue } from '../systems/rebuttal/index.js';

export const endingsMeta = [
  {
    id: 'a1_arrest',
    sceneId: 'end_a1',
    code: 'A-1',
    name: '逮捕',
    route: 'A',
    bg: 'bg_hall_morning',
    summary: '推理ショーで名指しされ、栞は自らの沈黙も含めて連行される。霧原律の名を調書へ残す仕事だけを託す。',
    order: 1,
    reason: '悟郎の確信または疑いが70以上のまま、推理ショーで栞が名指しされた。',
    nextHint: '反証の頁を一枚だけ閉じ、悟郎の確信と少年の注視を同時に読み直せば、別の綴じ方があるかもしれない。'
  },
  {
    id: 'a2_escape',
    sceneId: 'end_a2',
    code: 'A-2',
    name: '脱出',
    route: 'A',
    bg: 'bg_old_road',
    summary: '栞は五番の唄が示した旧道から館を逃れる。逃走の先にも、読まれない頁の記憶がついてくる。',
    order: 2,
    reason: '旧道を知り、疑いが69以下のときに、館を出る選択を通した。',
    nextHint: '旧道の頁を閉じて卓に残れば、逃走とは別の結末を読めるかもしれない。'
  },
  {
    id: 'a3_puppet',
    sceneId: 'end_a3',
    code: 'A-3',
    name: '操り人形',
    route: 'A',
    bg: 'bg_room_fireplace',
    summary: '焦げた指示メモから、復讐さえ宗玄の口封じに利用されたと知る。操られた事実と、自ら選んだ罪だけが残る。',
    order: 3,
    reason: '計画または生存の札が足りず、反論も沈黙も宗玄の脚本を崩せなかった。',
    nextHint: '先に一冊、計画書か生存の証拠を拾っていれば、紙片の外へ出られたかもしれない。'
  },
  {
    id: 'a4_reversal',
    sceneId: 'end_a4',
    code: 'A-4',
    name: '逆転',
    route: 'A',
    bg: 'bg_hidden_room',
    summary: '栞は自分の罪を認めたうえで宗玄の生存と四十年の盗作を告発する。二人の手錠が、真実と代償を別々に記録する。',
    order: 4,
    reason: '過去2・計画4・生存3以上と三通の計画書、死体のペンだこ、覗き穴図を揃え、皆の前で読み上げた。',
    nextHint: '頁を揃えず沈黙を選べば、逆転ではない結末も開くかもしれない。'
  },
  {
    id: 'b1_true',
    sceneId: 'end_b1',
    code: 'B-1',
    name: '真相',
    route: 'B',
    bg: 'bg_rooftop_dawn',
    summary: '「帰り唄」の題と折句が、霧原律の名を四十年ぶりに本棚へ返す。宗玄は死の幕を下ろせず、生きて読者になる。',
    order: 5,
    reason: '折句・原題・計画書三通を揃え、共同推理を完遂して「帰り唄」の意味を返した。',
    nextHint: '最後の一行を断罪へ向ければ、真相を閉じないまま終える頁があるかもしれない。'
  },
  {
    id: 'b2_unfinished',
    sceneId: 'end_b2',
    code: 'B-2',
    name: '未完',
    route: 'B',
    bg: 'bg_library_day',
    summary: '宗玄は断罪を自らの結末に変え、律の原稿は出所不明の資料として保管される。真相は次の読者を待つ未完の本になる。',
    order: 6,
    reason: '共同推理を閉じるか、最後に断罪または沈黙を選び、原題の意味を返さなかった。',
    nextHint: '宗玄を裁く言葉を一度飲み込み、題の意味を返せば、別の読者へ届くかもしれない。'
  },
  {
    id: 'b3_silenced',
    sceneId: 'end_b3',
    code: 'B-3',
    name: '口封じ',
    route: 'B',
    bg: 'bg_corridor_night',
    summary: '告白した栞を、宇野が五番の「逃げた小鳥」として襲う。奪われた声の代わりに、「帰る」の一語だけが残る。',
    order: 7,
    reason: '五番の夜に宇野の標的となり、口封じの脚本へ踏み込んだ。',
    nextHint: '少年のそばで頁を開いたままにすれば、羽の落ちる廊下を避けられるかもしれない。'
  }
];

export function endingMeta(id) {
  return endingsMeta.find(meta => meta.id === id || meta.sceneId === id);
}

export function buildEndingExplanation(id, state = {}) {
  const meta = endingMeta(id) ?? {};
  const params = state.params ?? {}; const logs = state.logs ?? {};
  const conviction = Number(params.conviction ?? 0); const gaze = gazeValue(params);
  const marked = logs.conan_mark || logs.rebuttal_rebuttal_ch4a === 'conan_marked';
  const reasoningDetail = { b1_true:'共同推理を最後まで綴じ、律の原題を返した。', b2_unfinished:'共同推理は真相へ届かず、結末を閉じきれなかった。', b2_locked:'折句を欠き、共同推理の頁を閉じた。' };
  const detail = marked ? '推理には抗えた。しかし、あなた自身を読まれた。' : (reasoningDetail[logs.joint_reasoning] ?? '選んだ頁が、この結末の綴じ目になった。');
  return { title: `${meta.code ?? 'END'}　${meta.name ?? ''}`, metrics: `悟郎の確信：${conviction}%\nコウナンの注視：${gaze}%`, reason: meta.reason ?? '', detail, nextHint: meta.nextHint ?? '' };
}
