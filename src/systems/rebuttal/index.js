import { screenRoot, finish, stateOf, has, condition, displayText } from '../common.js';
import { addTestimony } from '../notebook/index.js';
import { items } from '../../data/items.js';
import { exposureCostLabels, exposureEffectsFor } from '../exposure.js';

// シナリオ側の ID と正本を一箇所で対応させる。day3_show は互換性のため
// rebuttal-ch4a を指す既存の別名として残す。
export const rebuttalRegistry = Object.freeze({
 rebuttal_ch2: async () => (await import('../../data/parts/rebuttal-ch2.js')).rebuttalCh2,
 rebuttal_ch4a: async () => (await import('../../data/parts/rebuttal-ch4a.js')).rebuttalCh4a,
 day3_show: async () => (await import('../../data/parts/rebuttal-ch4a.js')).rebuttalCh4a,
 rebuttal_b3: async () => (await import('../../data/parts/rebuttal-b3.js')).rebuttalB3,
});

const clamp = value => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

// 知りすぎ一回で 45、二回で 90。疑いは補助的に最大 10 だけを加える。
export function gazeValue({ overknow = 0, suspicion = 0 } = {}) {
 return clamp(Math.max(0, Number(overknow) || 0) * 45 + Math.max(0, Number(suspicion) || 0) * 0.1);
}

export function resultFor(conviction, overknow) { return overknow >= 2 ? 'conan_marked' : conviction <= 30 ? 'perfect' : conviction >= 70 ? 'watched' : 'pending'; }
export function applyResponse(model, response, broken = []) { let effects = [...(response.result.effects || [])]; if (response.result.conditional?.ifBroken && broken.includes(response.result.conditional.ifBroken)) effects = response.result.conditional.effects || []; effects = [...effects, ...exposureEffectsFor(response.card)]; const conviction = (model.conviction || 0) + effects.filter(e => e.t === 'param' && e.key === 'conviction').reduce((a, e) => a + e.delta, 0); const overknow = (model.overknow || 0) + effects.filter(e => e.t === 'param' && e.key === 'overknow').reduce((a, e) => a + e.delta, 0); return { ...model, conviction: Math.max(0, Math.min(100, conviction)), overknow, broken: response.result.break ? [...broken, model.node.id] : broken, effects }; }

const effectDelta = (response, key) => (response.result.effects || []).filter(e => e.t === 'param' && e.key === key).reduce((total, e) => total + e.delta, 0);
export function effectivenessFor(response, broken = []) {
 const conditional = response.result.conditional;
 const effects = conditional?.ifBroken && broken.includes(conditional.ifBroken) ? conditional.effects || [] : response.result.effects || [];
 const delta = effects.filter(effect => effect.t === 'param' && effect.key === 'conviction').reduce((total, effect) => total + effect.delta, 0);
 return delta <= -12 ? '強力' : delta < 0 ? '手応えあり' : delta > 0 ? '逆効果（悟郎の確信が上がる）' : '悟郎の確信は変わらない';
}
export function costLabelsFor(response) { const labels = []; if (response.result.overknow || effectDelta(response, 'overknow') > 0) labels.push('👁 知りすぎを疑われる'); if (effectDelta(response, 'conscience') < 0) labels.push('🕯 良心を削る'); if (effectDelta(response, 'trust') < 0) labels.push('🤝 誰かの信頼を失う'); if (effectDelta(response, 'suspicion') > 0) labels.push('疑いが濃くなる'); return labels; }

// data-r は元の responses 配列の index。disabled な札を混ぜても対応はずれない。
export function responseOptions(responses, { hasCard = () => true, meetsCondition = () => true } = {}) {
 return responses.map((response, index) => ({ response, key: String(index), disabled: !meetsCondition(response.cond) || Boolean(response.card && !hasCard(response.card)) })).filter(option => meetsCondition(option.response.cond));
}

const cardMeta = card => items[card] || items[`${card}_card`] || null;
const responsePrefix = kind => kind === 'rebut' ? '反証: ' : kind === 'redirect' ? '転嫁: ' : '沈黙: ';
const gazeWord = value => value >= 80 ? '危険' : value >= 45 ? '注視' : '平静';
const outcomeText = {
 perfect: ['悟郎の推理：崩壊', 'コウナンの注視', '推理の綴じ目をほどき、あなた自身の頁はまだ閉じられていない。'],
 pending: ['悟郎の推理：保留', 'コウナンの注視', '推理は決着しない。それでも、あなたを読む視線は棚へ戻らない。'],
 watched: ['悟郎の推理：濃い', 'コウナンの注視', '推理は残った。反論しても、あなたの行間は見逃されていない。'],
 conan_marked: ['悟郎の推理：崩れても', 'コウナンの注視', '推理には勝った。しかし、あなた自身を見抜かれた。'],
};

export const rebuttal = { async start(ctx, args) {
 const loadSource = rebuttalRegistry[args?.id];
 if (!loadSource) throw new Error(`未知の反論パートID: ${args?.id ?? '(なし)'}`);
 const source = await loadSource();
 const data = args?.nodes ? { ...source, ...args, testimony: args.testimony, nodes: args.nodes.map((node, index) => ({ ...source.nodes[index], ...node, kind: node.kind ?? node.type ?? source.nodes[index]?.kind ?? source.nodes[index]?.type })) } : source;
 const s = stateOf(ctx);
 return new Promise(resolve => {
  const { root, stage } = screenRoot(ctx); let i = 0, effects = [], broken = [], conviction = args?.initialConviction ?? data.initialConviction ?? s.params?.conviction ?? 50, overknow = s.params?.overknow ?? 0, selected = null;
  const gaugesMarkup = (gaze) => `<div class="ku-gauges ku-spacer"><div class="ku-gauge"><span class="ku-gauge-label">悟郎の確信</span><span class="ku-gauge-bar"><i style="width:${displayText(conviction, 0)}%"></i></span><span class="ku-gauge-value">${displayText(conviction, 0)}%</span></div><div class="ku-gauge ${gaze >= 80 ? 'is-danger' : ''}"><span class="ku-gauge-label">コウナンの注視</span><span class="ku-gauge-bar"><i style="width:${gaze}%"></i></span><span class="ku-gauge-value">${gaze}%（${gazeWord(gaze)}）</span></div></div>`;
  const render = () => {
   const node = data.nodes[i]; const suspicion = (s.params?.suspicion ?? 0) + effects.filter(e => e.t === 'param' && e.key === 'suspicion').reduce((total, e) => total + e.delta, 0); const gaze = gazeValue({ overknow, suspicion }); const blinking = node.responses.some(r => r.result.overknow);
   const options = responseOptions(node.responses, { hasCard: card => has(ctx, card), meetsCondition: cond => condition(ctx, cond) });
   const cards = options.map(({ response, key, disabled }) => {
    const meta = response.card && cardMeta(response.card);
    const details = [meta?.source ? `${displayText(meta.source)}で得た札` : '', `効き目：${effectivenessFor(response, broken)}`, ...costLabelsFor(response), ...exposureCostLabels(response.card), meta?.exposure ? `使うと${displayText(meta.exposure)}` : '', response.note ? displayText(response.note) : ''].filter(Boolean);
    return `<button class="ku-card ${disabled ? 'is-irrelevant' : ''} ${selected === key ? 'is-selected' : ''}" data-r="${key}"${disabled ? ' disabled aria-disabled="true"' : ''}><span class="ku-card-kind">${responsePrefix(response.kind)}</span><span class="ku-card-name">${meta ? displayText(meta.name) : displayText(response.label)}</span><span class="ku-card-note">${details.length ? details.map(displayText).join(' ／ ') : disabled ? 'この場では使えません' : displayText(response.label)}</span></button>`;
   }).join('');
   stage.innerHTML = `<div class="ku-topbar"><span class="ku-chip">反論</span><span class="ku-meta">${displayText(data.title)}</span>${gaugesMarkup(gaze)}<button class="ku-close" aria-label="尋問を終える">×</button></div>
    <div class="ku-steps rebut-chain">${data.nodes.map((n, x) => `<div class="ku-step ${x === i ? 'is-active' : ''} ${broken.includes(n.id) ? 'is-done rebut-node-broken' : ''}"><b>${x + 1}</b><span>${displayText(n.kind ?? n.type)}</span></div>`).join('')}</div>
    <div class="rebut-claim"><div class="rebut-claim-eye ${blinking ? 'is-blinking' : ''}">👁 コウナンの視線</div><p class="rebut-claim-text">「${displayText(node.claim)}」</p><p class="rebut-claim-rule">${displayText(data.rule, '応答を選ぶ。真実を知りすぎている言葉には、視線が向く。')}</p></div>
    <div class="ku-thumbzone"><div class="ku-hand-label"><span>手札（この一節に使える札 ${options.filter((option) => !option.disabled).length}／${options.length}）</span></div><div class="ku-hand">${cards}</div><div class="rebut-confirm"><button class="ku-primary" ${selected === null ? 'disabled' : ''}>つきつける</button><span class="ku-primary-hint">${selected === null ? '手札を1枚選ぶ' : 'もう一度タップで選び直す'}</span></div></div>`;
   stage.querySelectorAll('[data-r]').forEach(button => button.onclick = () => { selected = selected === button.dataset.r ? null : button.dataset.r; render(); });
   stage.querySelector('.rebut-confirm .ku-primary').onclick = () => {
    if (selected === null) return;
    const response = node.responses[Number(selected)]; if (!response) return;
    const out = applyResponse({ conviction, overknow, node }, response, broken); conviction = out.conviction; overknow = out.overknow; effects.push(...out.effects); broken = out.broken; selected = null; i++;
    if (i < data.nodes.length) { render(); return; } if (data.testimony) testimony(); else done();
   };
   stage.querySelector('.ku-close').onclick = complete;
  };
  const testimony = () => { const t = data.testimony; stage.innerHTML = `<div class="ku-topbar"><span class="ku-chip">反論</span><span class="ku-meta">${displayText(data.title)}</span><button class="ku-close" aria-label="尋問を終える">×</button></div><div class="rebut-claim rebut-claim--center"><p class="rebut-claim-text">コウナン「${displayText(t.question)}」</p><p class="rebut-claim-rule">この返答は証言ログに残ります。</p></div><div class="ku-thumbzone"><div class="ku-hand">${t.options.map(([v, l]) => `<button class="ku-card" data-v="${v}"><span class="ku-card-name">${displayText(l)}</span></button>`).join('')}</div></div>`; stage.querySelectorAll('[data-v]').forEach(button => button.onclick = () => { const value = button.dataset.v; addTestimony(ctx, { who: '栞', question: t.key, answer: value }); effects.push({ t: 'log', key: t.key, value }); if (value === 'counter') effects.push({ t: 'param', key: 'suspicion', delta: 5 }); done(); }); stage.querySelector('.ku-close').onclick = complete; };
  const complete = () => { const outcome = resultFor(conviction, overknow); effects.push({ t: 'log', key: `rebuttal_${data.id}`, value: outcome }); if (outcome === 'conan_marked') effects.push({ t: 'log', key: 'conan_mark', value: true }); finish(root, resolve, { effects, outcome, conviction, overknow }); };
  const done = () => { const outcome = resultFor(conviction, overknow); const suspicion = (s.params?.suspicion ?? 0) + effects.filter(e => e.t === 'param' && e.key === 'suspicion').reduce((total, e) => total + e.delta, 0); const gaze = gazeValue({ overknow, suspicion }); const copy = outcomeText[outcome]; stage.innerHTML = `<div class="ku-topbar"><span class="ku-chip">反論</span><span class="ku-meta">${{ perfect: '完封', pending: '保留', watched: '要注意人物化', conan_marked: 'コウナン個別マーク' }[outcome]}</span></div><div class="rebut-claim rebut-claim--center"><div class="ku-gauges" style="justify-content:center;margin-bottom:18px"><div class="ku-gauge"><span class="ku-gauge-label">${copy[0]}</span><span class="ku-gauge-value">${conviction}%</span></div><div class="ku-gauge ${gaze >= 80 ? 'is-danger' : ''}"><span class="ku-gauge-label">${copy[1]}：${gazeWord(gaze)}</span><span class="ku-gauge-value">${gaze}%</span></div></div><p class="rebut-claim-rule">${displayText(copy[2])}</p></div><div class="ku-thumbzone"><button class="ku-primary" id="done">尋問を終える</button></div>`; stage.querySelector('#done').onclick = complete; };
  render();
 });
} };
