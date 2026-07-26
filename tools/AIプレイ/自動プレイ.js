import { personas } from './ペルソナ/index.js';
import { startProgression } from '../ブラウザ検証/進行基盤.js';

const personaId = new URLSearchParams(location.search).get('persona') || 'sokkyou';
const persona = personas[personaId];
if (!persona) {
  throw new Error(`未知のペルソナ: ${personaId}`);
}

const marker = document.createElement('meta');
marker.id = 'ai-play-started';
marker.dataset.persona = personaId;
document.head.append(marker);
document.querySelector('#ai-play-launch-status')?.setAttribute('data-started', 'true');
document.querySelector('#ai-play-launch-status').textContent = '自動プレイは起動しました';

const memory = {};
const transcript = [];
const decisions = [];
const checkpoints = [];
let step = 0;
let lastSignature = '';

function text(element) {
  return (element?.textContent || '').replace(/\s+/g, ' ').trim();
}

function buttons(root = document) {
  return [...root.querySelectorAll('button')]
    .filter((button) => !button.disabled && button.offsetParent !== null)
    .map((button, index) => ({ index, label: text(button), enabled: true }));
}

function partName(modal) {
  if (!modal) return null;
  if (modal.querySelector('.freeaction-narrative, .action-list')) return 'freeAction';
  if (modal.querySelector('.rebut-head, .chain')) return 'rebuttal';
  if (modal.querySelector('.node-grid, .agitation')) return 'jointReasoning';
  if (modal.querySelector('.board')) return 'temariBoard';
  return 'unknownPart';
}

function observedState(modal) {
  const hud = text(document.querySelector('#hud'));
  const partText = text(modal?.querySelector('main'));
  const numberAfter = (label, source) => {
    const match = source.match(new RegExp(`${label}\\s*(\\d+)`));
    return match ? Number(match[1]) : null;
  };
  const saved = savedState();
  const hudCount = (icon) => {
    const value = hud.match(new RegExp(`${icon}\\s*(\\d+)`))?.[1];
    return value === undefined ? null : Number(value);
  };
  return {
    params: {
      suspicion: numberAfter('疑惑', hud) ?? saved?.params?.suspicion ?? null,
      conviction: numberAfter('確信(?:度)?', partText) ?? numberAfter('確信', hud) ?? saved?.params?.conviction ?? null,
      overknow: numberAfter('知りすぎ', partText) ?? saved?.params?.overknow ?? null,
      awareness: saved?.params?.awareness ?? null,
      conscience: saved?.params?.conscience ?? null,
    },
    flags: {
      past: hudCount('🕯'),
      plan: hudCount('📜'),
      alive: hudCount('👁'),
    },
    items: saved?.items ?? null,
  };
}

function observation() {
  const modal = document.querySelector('.parts-modal');
  const choice = document.querySelector('.choices');
  const message = document.querySelector('.message-window:not([hidden])');
  const endText = text(message?.querySelector('.message-text'));
  const kind = endText.startsWith('END ') ? 'end' : modal ? 'part' : choice ? 'choice' : 'advance';
  const part = modal ? {
    name: partName(modal),
    title: text(modal.querySelector('header span')),
    text: text(modal.querySelector('main')),
    options: buttons(modal).filter((button) => button.label !== '閉じる'),
  } : null;
  return {
    step,
    chapter: text(document.querySelector('#chapter-title')) || null,
    sceneId: document.querySelector('#app')?.dataset.sceneId || null,
    kind,
    speaker: text(message?.querySelector('.speaker')) || null,
    text: choice ? text(choice.querySelector('p')) : part?.text || endText,
    choices: choice ? buttons(choice) : [],
    part,
    ...observedState(modal),
  };
}

function rememberScreen() {
  const current = observation();
  const signature = JSON.stringify(current);
  if (signature === lastSignature) return;
  lastSignature = signature;
  current.step = ++step;
  transcript.push(current);
  const checkpoint = JSON.stringify({ sceneId: current.sceneId });
  if (checkpoints.at(-1)?.signature !== checkpoint) {
    checkpoints.push({ step, signature: checkpoint, sceneId: current.sceneId, params: current.params, flags: current.flags });
  }
}

function decideChoice({ prompt, choices }) {
  const current = observation();
  current.text = prompt;
  current.choices = choices;
  const decision = persona.decide(current, memory) || {};
  decisions.push({ step, action: 'choice', selected: choices[decision.choice ?? 0]?.label || '', reason: decision.reason || '理由なし', diagnostic: decision.diagnostic || null });
  return decision;
}

function decidePart(name, elements) {
  const current = observation();
  current.kind = 'part';
  current.part = current.part || { name, options: [] };
  current.part.name = name;
  current.part.options = elements.map((element, index) => ({ index, label: text(element), enabled: true }));
  const decision = persona.decide(current, memory) || {};
  const index = decision.part ?? decision.choice ?? 0;
  decisions.push({ step, action: `part:${name}`, selected: current.part.options[index]?.label || current.part.options[0]?.label || '', reason: decision.reason || '理由なし', diagnostic: decision.diagnostic || null });
  return index;
}

// 共同推理は「ノードを選ぶ」と「どう崩すか」が別画面になる。進行基盤は前者だけを
// コールバックに渡すため、後者は AI プレイ側で画面更新を観測して同じ採点器に渡す。
function chooseJointMethod(modal) {
  const elements = [...modal.querySelectorAll('.parts-actions button:not([disabled])')]
    .filter((button) => ['own', 'proxy', 'relic'].includes(button.id));
  const claim = text(modal.querySelector('.claim'));
  if (!elements.length || modal.dataset.aiJointMethodClaim === claim) return;
  modal.dataset.aiJointMethodClaim = claim;
  const current = observation();
  current.kind = 'part';
  current.part = { ...(current.part || {}), name: 'jointReasoning', options: elements.map((element, index) => ({ index, label: text(element), enabled: true })) };
  const decision = persona.decide(current, memory) || {};
  const index = decision.part ?? decision.choice ?? 0;
  const selected = elements[index] || elements[0];
  decisions.push({ step, action: 'part:jointReasoning:method', selected: text(selected), reason: decision.reason || '理由なし', diagnostic: decision.diagnostic || null });
  selected.click();
}

new MutationObserver(() => {
  const modal = document.querySelector('.parts-modal');
  if (modal?.querySelector('#own, #proxy, #relic')) chooseJointMethod(modal);
}).observe(document.documentElement, { childList: true, subtree: true });

function savedState() {
  const raw = localStorage.getItem('kaeriuta-alpha-auto') || localStorage.getItem('kaeriuta-alpha-1');
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value?.format === 3 && value.state?.version === 2) return value.state;
    return value?.version === 2 ? value : null;
  } catch (error) {
    console.error('オートセーブを解析できませんでした', error);
    return null;
  }
}

function writeResult(progress) {
  const state = savedState();
  const scored = decisions.filter((decision) => decision.diagnostic);
  const ambiguous = scored.filter((decision) => !decision.diagnostic.grounded);
  const ambiguousLabels = [...new Set(ambiguous.flatMap((decision) => decision.diagnostic.options || []))];
  const diagnosis = {
    totalSelections: scored.length,
    groundedSelections: scored.length - ambiguous.length,
    fallbackSelections: ambiguous.length,
    fallbackRate: scored.length ? ambiguous.length / scored.length : 0,
    ambiguousLabels,
  };
  const parameterMoves = ['suspicion', 'conviction', 'awareness', 'conscience'].map((key) => {
    const moves = transcript.slice(1).map((entry, index) => {
      const before = transcript[index]; const from = before.params?.[key]; const to = entry.params?.[key];
      return Number.isFinite(from) && Number.isFinite(to) && from !== to ? { delta: to - from, before: before.text, step: entry.step } : null;
    }).filter(Boolean).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 2);
    return { key, moves };
  });
  const scoredDecisions = decisions.filter((decision) => decision.diagnostic);
  const widest = [...scoredDecisions].sort((a, b) => b.diagnostic.margin - a.diagnostic.margin)[0];
  const narrowest = [...scoredDecisions].sort((a, b) => a.diagnostic.margin - b.diagnostic.margin)[0];
  const missedInformation = transcript.filter((entry) => entry.part?.name === 'freeAction' && entry.part.options?.length)
    .flatMap((entry) => entry.part.options.map((option) => option.label)).filter((label, index, all) => all.indexOf(label) === index)
    .filter((label) => !decisions.some((decision) => decision.action === 'part:freeAction' && decision.selected === label));
  const convictionTrend = transcript.map((entry) => entry.params?.conviction).filter(Number.isFinite);
  const jointMethods = decisions.filter((decision) => decision.action === 'part:jointReasoning:method');
  const joint = { broken: jointMethods.length, failures: progress.ending === 'b2_unfinished' ? 1 : 0, methods: jointMethods.map((decision) => decision.selected) };
  const parameterText = parameterMoves.map(({ key, moves }) => `${key}: ${moves.length ? moves.map((move) => `${move.delta > 0 ? '+' : ''}${move.delta}（直前本文「${(move.before || '').slice(0, 42)}」）`).join('／') : '途中観測では変動なし・または未取得'}`).join('。');
  const choiceText = (decision) => decision ? `「${decision.selected}」（差 ${decision.diagnostic.margin}）` : '該当なし';
  const reflection = `到達ENDは${progress.ending || '未確定'}。パラメータ変動の大きい場面は ${parameterText}。方針差が最も強く出た選択は${choiceText(widest)}、最も僅差だった選択は${choiceText(narrowest)}。自由行動で取得可能だったが選ばなかった情報は${missedInformation.join('／') || '観測できた範囲ではなし'}。反論の確信度推移は${convictionTrend.join('→') || '未取得'}。共同推理は${joint.broken}ノードを崩し、失敗・未完了は${joint.failures}件（手段: ${joint.methods.join('／') || 'なし'}）。最終値は疑惑${state?.params?.suspicion ?? '未取得'}、確信度${state?.params?.conviction ?? '未取得'}、察知${state?.params?.awareness ?? '未取得'}、良心${state?.params?.conscience ?? '未取得'}。このEND以外の条件は実行時に公開されないため、未達条件は最終状態と選択ログからは特定不能。`;
  const result = {
    persona: { id: persona.id, name: persona.name, description: persona.description },
    status: progress.status,
    screen: progress.screen,
    stalledScreen: progress.stalledScreen || null,
    stallReason: progress.stallReason || null,
    transcript,
    decisions,
    checkpoints,
    diagnosis,
    analysis: { parameterMoves, widest, narrowest, missedInformation, rebuttal: { convictionTrend }, joint },
    reflection,
    errors: progress.errors,
    final: {
      endingId: progress.ending,
      steps: step,
      sceneId: document.querySelector('#app')?.dataset.sceneId || null,
      lastScreen: progress.lastScreen,
      params: state?.params || null,
      flags: state?.flags || null,
      items: state?.items || null,
      flagCount: state ? Object.values(state.flags || {}).flat().length : null,
      cardCount: state?.items?.length ?? null,
    },
  };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(result))));
  const host = document.createElement('section');
  host.id = 'ai-play-result';
  host.dataset.status = progress.status;
  for (let index = 0; index < encoded.length; index += 24000) {
    const chunk = document.createElement('script');
    chunk.type = 'text/plain';
    chunk.dataset.aiChunk = String(index / 24000);
    chunk.textContent = encoded.slice(index, index + 24000);
    host.append(chunk);
  }
  document.body.append(host);
}

startProgression({
  chooseChoice: decideChoice,
  choosePart: decidePart,
  onTick: rememberScreen,
  onReport: writeResult,
});
