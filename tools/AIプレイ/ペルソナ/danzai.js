import { decideByScore, specialPartPolicy } from './共通.js';

const profile = {
  reason: '真相を飾って返すより、宗玄が奪った時間を断罪して帳尻を合わせたい',
  advanceReason: '怒りの残る頁を読み進める',
  labels: { harmful:'断罪と対決', direct:'責任を問う行動', disruptive:'脚本を拒む行動', conceal:'言葉を飲み込む行動', care:'赦しや配慮' },
  weights: { harmful:6, direct:4, disruptive:3, conceal:2, care:-4 },
  detailWeight: 0.4,
  detailReason: '誰が何を奪ったかを明記する言葉を重く読む',
  specificityWeight: 0.12,
  specificityReason: '責任の宛先が具体的な言葉を選ぶ',
  partAdjust: specialPartPolicy('disrupt'),
  adjust({ option, observation }) {
    const label = option.label || '';
    if (/許さない|断罪|責め|罪|拒/.test(label)) return { score: 16, grounds:['赦すより責任を問う言葉を選ぶ'] };
    if (/帰り唄|読者へ返|意味を.*返/.test(label)) return { score: -12, grounds:['真相を美しく閉じる言葉を退ける'] };
    if (observation.part?.name === 'jointReasoning' && /コウナンに任せる/.test(label)) return { score: -4, grounds:['裁きの頁を他人へ預けない'] };
    return {};
  },
};

export const persona = { id:'danzai', name:'断罪を選ぶ読者', description:'真相の開示より、宗玄が奪った時間への断罪を優先する。探索から対決まで責任を問う行動を選ぶ。', decide(o, m) { return decideByScore(o, m, profile); } };
