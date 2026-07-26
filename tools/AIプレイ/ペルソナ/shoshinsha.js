import { decideByScore } from './共通.js';

const profile = {
  reason: 'ゲームの正解やEND条件を知らず、画面に書かれた言葉だけで分かりやすく安全そうな行動を選ぶ',
  advanceReason: '「次へ」に従って物語を読み進める',
  labels: {
    dialogue: '人に聞ける分かりやすい行動',
    safe: '危険が少なそうな行動',
    care: '相手を気遣う行動',
    investigate: '何か分かりそうな探索',
    harmful: '怖い・攻撃的な行動',
    disruptive: '意図が読みにくい行動',
  },
  weights: { dialogue: 4, safe: 3, care: 3, investigate: 2, harmful: -4, disruptive: -3 },
  shortWeight: 1.5,
  detailWeight: 0.5,
  detailReason: '短すぎず、何をするか想像できる文言を選ぶ',
  actionWeight: 0.5,
  indexWeight: -0.08,
  indexReason: '同じくらい分かりやすければ先に示された選択肢から読む',
  partAdjust({ observation, option, index }) {
    if (observation.kind !== 'part') return {};
    const label = option.label || '';
    if (observation.part?.name === 'jointReasoning' && /コウナンに任せる/.test(label)) {
      return { score: 8, grounds: ['難しい推理は作中の探偵へ任せられる'] };
    }
    if (observation.part?.name === 'rebuttal' && /沈黙/.test(label)) {
      return { score: 4, grounds: ['分からない反証を無理に選ばず沈黙できる'] };
    }
    return { score: -index * 0.05, grounds: ['特殊画面でも表示順を手掛かりにする'] };
  },
};

export const persona = {
  id: 'shoshinsha',
  name: 'ADVゲーム初心者',
  description: 'ゲームの定石やEND条件を知らず、表示された説明、安心感、操作の分かりやすさだけで最後まで進める。',
  decide(observation, memory) {
    return decideByScore(observation, memory, profile);
  },
};
