import fs from 'node:fs';
import { scenes } from '../src/data/scenario/index.js';
import { flags } from '../src/data/flags.js';
import { items } from '../src/data/items.js';
import { characters } from '../src/data/characters.js';
import { parts } from '../src/systems/index.js';

const manifest = JSON.parse(fs.readFileSync(new URL('../assets/manifest.json', import.meta.url), 'utf8'));
const assetIds = new Set(manifest.assets.map((asset) => asset.id));
const errors = [];
const labels = new Map();
const gotos = [];
const calls = [];
const endings = new Map();
const sceneJumps = [];
const expectedCalls = {
  rebuttal: new Set(['rebuttal_ch2', 'rebuttal_ch4a']),
  jointReasoning: new Set(['inference_final', 'inference_final_a4']),
  freeAction: new Set(['freeaction_day1', 'freeaction_day2']),
  temariBoard: new Set(['temari_board_day2']),
  chapterSummary: new Set(['summary_ch1', 'summary_ch2', 'summary_ch3a', 'summary_ch3b']),
};

function error(where, message) { errors.push(`${where}: ${message}`); }
function checkCondition(cond, where) {
  if (!cond) return;
  if (cond.flag && !flags[cond.flag]) error(where, `未定義flag: ${cond.flag}`);
  if (cond.item && !items[cond.item]) error(where, `未定義item: ${cond.item}`);
  for (const child of [...(cond.and || []), ...(cond.or || []), ...(cond.not ? [cond.not] : [])]) checkCondition(child, where);
}
function checkEffect(effect, where) {
  if (effect.t === 'flag' && !flags[effect.id]) error(where, `未定義flag: ${effect.id}`);
  if (effect.t === 'item' && !items[effect.id]) error(where, `未定義item: ${effect.id}`);
}
function checkCard(id, where) {
  if (!items[id] && !flags[id]) error(where, `未定義item/flag: ${id}`);
}
function checkCallArgs(value, where) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { value.forEach((entry, index) => checkCallArgs(entry, `${where}.${index}`)); return; }
  if (value.cond) checkCondition(value.cond, where);
  if (value.effects) value.effects.forEach((effect) => checkEffect(effect, where));
  if (value.card) checkCard(value.card, where);
  // `cards` in rebuttal/jointReasoning are evidence. temariBoard also has
  // actor/death cards, which intentionally are not inventory IDs.
  if (value.cards && !where.includes('temariBoard')) value.cards.forEach((id) => checkCard(id, where));
  if (value.requirements) value.requirements.flat(2).forEach((id) => checkCard(id, where));
  Object.entries(value).forEach(([key, child]) => {
    if (!['cond', 'effects', 'card', 'cards', 'requirements'].includes(key)) checkCallArgs(child, `${where}.${key}`);
  });
}
function walk(nodes, scene, path = [], nested = false) {
  nodes.forEach((node, index) => {
    const where = `${scene.id} ${[...path, index].join('.')}`;
    if (node.requires) {
      if (!Array.isArray(node.requires)) error(where, 'requires は配列で指定してください');
      else node.requires.forEach((id) => checkCard(id, `${where} requires`));
    }
    if (node.t === 'label') {
      if (!node.id) error(where, 'labelのidがありません');
      else if (labels.has(`${scene.id}:${node.id}`)) error(where, `labelが重複: ${node.id}`);
      else labels.set(`${scene.id}:${node.id}`, { scene: scene.id, nested, where });
    }
    if (node.t === 'choice') {
      node.options.forEach((option, optionIndex) => {
        checkCondition(option.cond, `${where} option ${optionIndex}`);
        (option.effects || []).forEach((effect) => checkEffect(effect, `${where} option ${optionIndex}`));
        if (option.goto) gotos.push({ scene: scene.id, id: option.goto, where: `${where} option ${optionIndex}` });
      });
    }
    if (node.t === 'if') {
      checkCondition(node.cond, where);
      walk(node.then || [], scene, [...path, index, 'then'], true);
      walk(node.else || [], scene, [...path, index, 'else'], true);
    }
    if (node.t === 'call') {
      checkCallArgs(node.args, `${where} ${node.part}`);
      if (!parts[node.part]) error(where, `未登録part: ${node.part}`);
      if (!node.args?.id || !expectedCalls[node.part]?.has(node.args.id)) error(where, `part ${node.part} の未対応id: ${node.args?.id || '(なし)'}`);
    }
    if (node.t === 'call') calls.push({ part: node.part, args: node.args, where });
    if (node.t === 'end') endings.set(node.endingId, where);
    if (['flag', 'item', 'param', 'log'].includes(node.t)) checkEffect(node, where);
    if (node.t === 'jump') {
      sceneJumps.push({ from: scene.id, to: node.scene, where });
      if (!scenes[node.scene]) error(where, `jump先のsceneが未定義: ${node.scene}`);
    }
    if (node.t === 'say' && node.who && !characters[node.who]) error(where, `未定義character: ${node.who}`);
    if (['bg', 'cg', 'bgm', 'se'].includes(node.t) && !assetIds.has(node.id)) error(where, `未定義asset: ${node.id}`);
    if (node.t === 'chara' && !assetIds.has(`${node.id}_${node.expr}`)) error(where, `未定義asset: ${node.id}_${node.expr}`);
  });
}

Object.values(scenes).forEach((scene) => walk(scene.nodes, scene));
for (const goto of gotos) {
  const label = labels.get(`${goto.scene}:${goto.id}`);
  if (!label) error(goto.where, `goto先のlabelが未定義: ${goto.id}`);
}
for (const [key, label] of labels) {
  const id = key.slice(label.scene.length + 1);
  const incoming = gotos.some((goto) => goto.id === id && goto.scene === label.scene);
  if (label.nested && !incoming) error(label.where, `到達不能なlabel: ${id}`);
}

// A scene with no incoming jump is allowed only for the prologue entry point.
for (const [sceneKey, scene] of Object.entries(scenes)) {
  // prologue remains the runtime entry. chapter1 is linked by the integration
  // hand-off because this wave must not edit prologue/main.js.
  if (sceneKey === 'prologue' || sceneKey === 'chapter1') continue;
  const incoming = sceneJumps.some((jump) => jump.to === sceneKey);
  if (!incoming) error(scene.id, '到達不能なscene');
}
for (const endingId of ['a1_arrest', 'a2_escape', 'a3_puppet', 'a4_reversal', 'b1_true', 'b2_unfinished', 'b3_silenced']) {
  if (!endings.has(endingId)) error('endings', `ENDが未定義または到達不能: ${endingId}`);
}

if (errors.length) {
  console.error(`シナリオ検証: 不整合 ${errors.length}件`);
  errors.forEach((message) => console.error(`- ${message}`));
  process.exitCode = 1;
} else {
  console.log('シナリオ検証: 不整合0件');
  console.log('call 一覧:');
  calls.forEach(({ part, args, where }) => console.log(`- ${part} / ${args?.id || '(idなし)'} (${where})`));
}
