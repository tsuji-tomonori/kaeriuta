import { modal, finish, stateOf, has, condition, displayText } from '../common.js';
import { addTestimony } from '../notebook/index.js';
import { items } from '../../data/items.js';

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
export function applyResponse(model, response, broken = []) { let effects = [...(response.result.effects || [])]; if (response.result.conditional?.ifBroken && broken.includes(response.result.conditional.ifBroken)) effects = response.result.conditional.effects || []; const conviction = (model.conviction || 0) + effects.filter(e => e.t === 'param' && e.key === 'conviction').reduce((a, e) => a + e.delta, 0); const overknow = (model.overknow || 0) + effects.filter(e => e.t === 'param' && e.key === 'overknow').reduce((a, e) => a + e.delta, 0); return { ...model, conviction: Math.max(0, Math.min(100, conviction)), overknow, broken: response.result.break ? [...broken, model.node.id] : broken, effects }; }

const effectDelta = (response, key) => (response.result.effects || []).filter(e => e.t === 'param' && e.key === key).reduce((total, e) => total + e.delta, 0);
export function effectivenessFor(response) { const delta = effectDelta(response, 'conviction'); return delta <= -12 ? '強力' : delta < 0 ? '手応えあり' : '効果は小さい'; }
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
  const m = modal(ctx, data.title); let i = 0, effects = [], broken = [], conviction = args?.initialConviction ?? data.initialConviction ?? s.params?.conviction ?? 50, overknow = s.params?.overknow ?? 0;
  const render = () => {
   const node = data.nodes[i]; const suspicion = (s.params?.suspicion ?? 0) + effects.filter(e => e.t === 'param' && e.key === 'suspicion').reduce((total, e) => total + e.delta, 0); const gaze = gazeValue({ overknow, suspicion }); const eye = node.responses.some(r => r.result.overknow) ? 'parts-eye blink' : 'parts-eye';
   const options = responseOptions(node.responses, { hasCard: card => has(ctx, card), meetsCondition: cond => condition(ctx, cond) });
   const buttons = options.map(({ response, key, disabled }) => { const meta = response.card && cardMeta(response.card); const details = [meta?.source ? `${displayText(meta.source)}で得た札` : '', `効き目：${effectivenessFor(response)}`, ...costLabelsFor(response), meta?.exposure ? `使うと${displayText(meta.exposure)}` : '', response.note ? displayText(response.note) : ''].filter(Boolean); return `<div class="parts-option ${disabled ? 'is-disabled' : ''}"><button data-r="${key}"${disabled ? ' disabled aria-disabled="true"' : ''}>${responsePrefix(response.kind)}${displayText(response.label)}</button>${details.length ? `<small class="option-note">${details.map(detail => `<span>${detail}</span>`).join('')}</small>` : ''}</div>`; }).join('');
   m.main.innerHTML = `<div class="rebut-gauges"><div class="rebut-head">悟郎の確信 <b>${displayText(conviction, 0)}%</b><i><em style="width:${displayText(conviction, 0)}%"></em></i></div><div class="rebut-head rebut-gaze ${gaze >= 80 ? 'danger' : ''}">コウナンの注視 <b>${gaze}%</b><i><em style="width:${gaze}%"></em></i><small>注視 ${gazeWord(gaze)}</small></div></div><div class="chain">${data.nodes.map((n, x) => `<div class="chain-node ${x === i ? 'active' : ''} ${broken.includes(n.id) ? 'broken' : ''}"><small>${displayText(n.kind ?? n.type)}</small><strong>${displayText(n.id).toUpperCase()}</strong><span>${displayText(n.claim)}</span></div>`).join('')}</div><div class="${eye}">👁 コウナンの視線</div><p class="claim">「${displayText(node.claim)}」</p><p class="parts-note">${displayText(data.rule, '応答を選ぶ。真実を知りすぎている言葉には、視線が向く。')}</p><div class="parts-actions">${buttons}</div>`;
   m.main.querySelectorAll('[data-r]').forEach(button => button.onclick = () => { const response = node.responses[Number(button.dataset.r)]; if (!response) return; const out = applyResponse({ conviction, overknow, node }, response, broken); conviction = out.conviction; overknow = out.overknow; effects.push(...out.effects); broken = out.broken; i++; if (i < data.nodes.length) { render(); return; } if (data.testimony) testimony(); else done(); });
  };
  const testimony = () => { const t = data.testimony; m.main.innerHTML = `<p class="claim">コウナン「${t.question}」</p><p>この返答は証言ログに残ります。</p><div class="parts-actions">${t.options.map(([v, l]) => `<button data-v="${v}">${l}</button>`).join('')}</div>`; m.main.querySelectorAll('button').forEach(button => button.onclick = () => { const value = button.dataset.v; addTestimony(ctx, { who: '栞', question: t.key, answer: value }); effects.push({ t: 'log', key: t.key, value }); if (value === 'counter') effects.push({ t: 'param', key: 'suspicion', delta: 5 }); done(); }); };
  const complete = () => { const outcome = resultFor(conviction, overknow); effects.push({ t: 'log', key: `rebuttal_${data.id}`, value: outcome }); if (outcome === 'conan_marked') effects.push({ t: 'log', key: 'conan_mark', value: true }); finish(m.root, resolve, { effects, outcome, conviction, overknow }); };
  const done = () => { const outcome = resultFor(conviction, overknow); const suspicion = (s.params?.suspicion ?? 0) + effects.filter(e => e.t === 'param' && e.key === 'suspicion').reduce((total, e) => total + e.delta, 0); const gaze = gazeValue({ overknow, suspicion }); const copy = outcomeText[outcome]; m.main.innerHTML = `<h2>${{ perfect: '完封', pending: '保留', watched: '要注意人物化', conan_marked: 'コウナン個別マーク' }[outcome]}</h2><div class="rebut-result"><p><strong>${copy[0]}</strong> ${conviction}%</p><p class="${gaze >= 80 ? 'danger' : ''}"><strong>${copy[1]}：${gazeWord(gaze)}</strong> ${gaze}%</p><p>${copy[2]}</p></div><button id="done">尋問を終える</button>`; m.main.querySelector('#done').onclick = complete; };
  m.close.onclick = complete; render();
 });
} };
