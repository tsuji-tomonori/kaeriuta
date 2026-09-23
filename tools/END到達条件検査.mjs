/**
 * END到達条件検査
 *
 * 自由行動の予算（第一章4/6、第二章4/6）を組合せで全探索し、固定選択と
 * 分岐を含む到達状態を構成する。これは「条件を満たす状態を注入する」検査では
 * なく、各ENDへ至る資源消費済みの行動列を出す回帰用の証明である。
 */
import assert from 'node:assert/strict';
import { scenes } from '../src/data/scenario/index.js';
import { createGameState } from '../src/engine/state.js';
import { applyEffect, evaluateCondition } from '../src/engine/script-runner.js';
import { currentNode, advanceExecution, enterBranch, gotoLabel, resetExecution } from '../src/engine/execution.js';
import { rebuttalCh2 } from '../src/data/parts/rebuttal-ch2.js';
import { rebuttalCh4a } from '../src/data/parts/rebuttal-ch4a.js';
import { rebuttalB3 } from '../src/data/parts/rebuttal-b3.js';
import { inferenceFinal } from '../src/data/parts/inference-final.js';
import { applyResponse, resultFor } from '../src/systems/rebuttal/index.js';
import { observedResponse } from '../src/systems/rebuttal/observation.js';
import { canBreak, canUseRelic, triggersBravado, isB1Open, isB2Locked } from '../src/systems/inference/index.js';
import { evidenceUsedFor, exposureEffectsFor } from '../src/systems/exposure.js';
import { flags } from '../src/data/flags.js';

import { chapter1 } from '../src/data/scenario/chapter1.js';
import { chapter2 } from '../src/data/scenario/chapter2.js';
import { enrichFreeActions } from '../src/systems/freeaction/index.js';

const choose = (values, n, start = 0, result = []) => n === 0 ? [result] : values.slice(start).flatMap((value, index) => choose(values, n - 1, start + index + 1, [...result, value]));
const count = (state, line) => [...state].filter((id) => flags[id]?.line === line).length;
const add = (state, ids) => ids.forEach((id) => state.add(id));
// 行動名・報酬を複製しない。各4回、各行動の注目先は必ず片方だけ。
function dayPlans(chapter) {
  const call = chapter.nodes.find(node => node.part === 'freeAction');
  const choices = enrichFreeActions(call.args.actions);
  return choose(choices, call.args.blocks).flatMap(actions => {
    let variants = [{ labels: [], effects: [] }];
    for (const action of actions) variants = variants.flatMap(plan => action.scenes.focus.options.map(focus => ({
      labels: [...plan.labels, `${action.label}（${focus.label}）`],
      effects: [...plan.effects, ...action.reward, ...action.risk, ...focus.effects],
    })));
    return variants;
  });
}
const allPlans = [];
for (const day1 of dayPlans(chapter1)) for (const day2 of dayPlans(chapter2)) {
  const state = new Set(['instruction_memo', 'sogen_no_callus']);
  const effects = [...day1.effects, ...day2.effects];
  add(state, effects.filter(e => e.t === 'flag').map(e => e.id));
  state.add('corpse_callus'); // 第二章の朝に「死体の手元を見る」
  if (state.has('other_plan')) state.add('three_plans');
  const suspicion = effects.filter(e => e.t === 'param' && e.key === 'suspicion').reduce((n, e) => Math.max(0, Math.min(100, n + e.delta)), 0);
  allPlans.push({ d1: day1.labels, d2: day2.labels, state, suspicion });
}

const proof = {};
function find(end, predicate, suffix) {
  const plan = allPlans.find(predicate);
  if (!plan) throw new Error(`${end}: ブロック予算内の経路がない`);
  proof[end] = { ...plan, path: [`第一章: ${plan.d1.join(' / ')}`, '第二章: 死体の手元を見る / ' + plan.d2.join(' / '), ...suffix] };
}

find('A-1', () => true, ['第三章: 凶器を取る', '第四章A: 推理ショーへ割り込む（証拠不足）']);
find('A-2', (p) => p.state.has('old_road') && p.suspicion <= 49, ['第三章: 凶器を取る', '第四章A: 隙を見て館を出る → 旧道を下る']);
find('A-3', (p) => count(p.state, 'plan') < 4 || count(p.state, 'alive') < 3, ['第三章: 凶器を取る', '第四章A: 反論を続ける（札が不足）']);
find('A-4', (p) => {
  const state = new Set(p.state); state.add('peephole_map');
  return count(state, 'past') >= 2 && count(state, 'plan') >= 4 && count(state, 'alive') >= 3
    && ['three_plans', 'corpse_callus', 'peephole_map'].every((id) => state.has(id));
}, ['第三章: 凶器を取る', '第四章A: 階段の下を見る（覗き穴図）', '推理ショー: 挙手して割り込む → 皆の前で読み上げる']);
find('B-1', (p) => p.state.has('three_plans'), ['第三章: 少年の扉を叩く → 本にメモを挟む', '第四章B: 共犯者のふりを続ける（標的化回避）', '共同推理を完遂 → 「帰り唄」の意味を返す']);
find('B-2', () => true, ['第三章: 少年の扉を叩く → 蘭を介して近づく', '第四章B: コナンの側を離れない', '共同推理後: 「あなたを絶対に許さない」']);
find('B-3', () => true, ['第三章: 少年の扉を直接叩く（察知35）', '第四章B: 部屋に籠る（察知+15）', '五番の夜: 扉を開ける']);

// 告白ルートで固定取得する原稿群。B-1/B-2のEND本文に必要な証拠もここで
// 実際のシーン順に加える（原稿、食料庫、隠し部屋）。
for (const id of ['B-1', 'B-2']) add(proof[id].state, ['food_ledger', 'uno_ledger_handwriting', 'tea_brand_testimony', 'peephole_map', 'search_record', 'lattice_shadow', 'temariuta_murder_page', 'award_photo_right_hand', 'folklorist_reply', 'onda_annotated_book', 'winter_lamp_style', 'manuscript_left_hand', 'left_handed_pen', 'original_title', 'acrostic']);
add(proof['A-4'].state, ['peephole_map']);

// 条件表の候補を、実シナリオの分岐と効果でも再生する（DOM・Chromeは使わない）。
function replay(end, plan) {
  let state = createGameState(), steps = 0;
  const path = [];
  const effects = entries => { for (const effect of entries) state = applyEffect(state, effect, flags); };
  const chooseOption = (node, options) => {
    const find = text => options.find(o => o.label.includes(text));
    if (node.prompt === '宗玄の乾杯をどう受け取る？') return find('注視');
    if (node.prompt === '宴の席、どこに座る？') return find('遠い席');
    if (node.prompt === '散会後、どうする？') return find('自室');
    if (node.prompt?.startsWith('左へ')) return options.find(o => o.goto === (end.startsWith('A') ? 'execution' : 'confession'));
    if (node.prompt === '佐伯の問いに答える') return find('無言');
    if (node.prompt === 'どう接触する？') return find(end === 'B-3' ? 'このまま' : end === 'B-2' ? '蘭子' : 'メモ');
    if (node.prompt === '夜をどう越える？') return find(end === 'B-3' ? '籠る' : end === 'B-2' ? '離れない' : 'ふり');
    if (node.prompt === '逃げ道を選ぶ') return end === 'B-3' ? find('扉を開ける') : options.find(o => o.goto === 'survive');
    if (node.prompt === '音の正体を確かめる？') return find(end === 'A-4' ? '階段' : '自室');
    if (node.prompt === '推理ショーで何をする？') return options.find(o => o.goto === ({'A-1':'interrupt','A-2':'escape','A-3':'resist','A-4':'interrupt'}[end]));
    if (node.prompt === '六番の唄に、何を返す？') return options.find(o => o.goto === (end === 'B-1' ? 'b1' : 'b2'));
    return options[0];
  };
  while (steps++ < 20000) {
    const scene = scenes[state.sceneId], node = currentNode(scene, state);
    assert.ok(node, `${end}: シーンを読み尽くした`);
    if (node.t === 'end') return { ending:node.endingId, steps, path, state };
    if (node.t === 'jump') { state.sceneId = node.scene; state = resetExecution(state); continue; }
    if (node.t === 'if') { state = enterBranch(state, scene, node, evaluateCondition(node.cond, state, flags) ? 'then' : 'else'); continue; }
    if (node.t === 'choice') {
      const selected = chooseOption(node, node.options.filter(o => evaluateCondition(o.cond, state, flags)));
      assert.ok(selected, `${end}: 選べない選択肢 ${node.prompt}`);
      effects(selected.effects || []); path.push(selected.label);
      const target = gotoLabel(state, scene, selected.goto);
      state = target.found ? target.state : advanceExecution(state, scene); continue;
    }
    if (node.t === 'call') {
      if (node.part === 'freeAction') {
        const labels = node.args.day === 1 ? plan.d1 : plan.d2;
        assert.equal(labels.length, node.args.blocks);
        const actions = enrichFreeActions(node.args.actions);
        for (const label of labels) {
          const action = actions.find(a => label.startsWith(a.label + '（'));
          const focus = action?.scenes.focus.options.find(o => label === `${action.label}（${o.label}）`);
          assert.ok(focus, label); effects([...action.reward, ...action.risk, ...focus.effects]); path.push(label);
        }
      }
      if (node.part === 'rebuttal') {
        const data = {rebuttal_ch2:rebuttalCh2,rebuttal_ch4a:rebuttalCh4a,rebuttal_b3:rebuttalB3}[node.args.id];
        let model = {conviction:node.args.initialConviction ?? data.initialConviction, overknow:state.params.overknow, broken:[]};
        for (const claim of data.nodes) {
          const available = claim.responses.filter(r => (!r.card || state.items.includes(r.card) || Object.values(state.flags).flat().includes(r.card)) && evaluateCondition(r.cond, state, flags))
            .map(r => observedResponse(state, data.id, claim.id, r));
          // 偽札の露見は回避し、日常の札・転嫁・沈黙の実在する応答で通す。
          const safe = available.filter(r => !r.result.overknow && !r.card?.startsWith('alibi_'));
          const response = end === 'B-3' && data === rebuttalB3 ? safe.find(r => r.kind === 'silence') : safe.reduce((best, r) => {
            const rank = x => applyResponse({...model,node:claim},x,model.broken).conviction;
            return rank(r) < rank(best) ? r : best;
          });
          model = applyResponse({...model,node:claim},response,model.broken); effects(model.effects); path.push(`反論：${response.label}`);
        }
        effects([{t:'log',key:`rebuttal_${data.id}`,value:resultFor(model.conviction,model.overknow)}]);
        if (data.testimony) effects([{t:'log',key:data.testimony.key,value:data.testimony.options[0][0]}]);
      }
      if (node.part === 'jointReasoning') {
        const cards = [...state.items,...Object.values(state.flags).flat()];
        let agitation = 0, uno = false, relicUses = 0;
        const reasoning = inferenceFinal.phases.flatMap(p => p.nodes).filter(n => node.args.variant !== 'a4' || n.id === 'n1');
        // 外堀を先に崩し、宇野の証言を得てから作者と計画を問う。
        for (const claim of reasoning) {
          assert.ok(!isB2Locked(claim,cards), `${end}: 作者の署名がない`);
          let multiplier;
          if (canBreak(claim,cards,triggersBravado(agitation),uno)) multiplier = 1;
          else if (claim.relicBonus && canUseRelic(relicUses)) { multiplier = 2; relicUses++; }
          else if (claim.conanProxy) multiplier = 0;
          else assert.fail(`${end}: 共同推理の根拠不足 ${claim.id}`);
          agitation = Math.min(100,agitation + claim.agitation * multiplier);
          effects([{t:'param',key:'agitation',delta:claim.agitation * multiplier}]);
          if (multiplier === 1) effects(evidenceUsedFor(claim,cards).flatMap(exposureEffectsFor));
          if (multiplier === 2) effects([{t:'param',key:'conscience',delta:-1}]);
          if (claim.id === 'n6') uno = true;
          path.push(`共同推理：${claim.claim}（${multiplier === 1 ? '自分で提示' : multiplier === 2 ? '遺品' : 'コウナン'}）`);
        }
        const value = node.args.variant === 'a4' ? 'a4_reversal' : end === 'B-1' && isB1Open(agitation) ? 'b1_true' : 'b2_unfinished';
        effects([{t:'log',key:'joint_reasoning',value}]);
      }
    }
    if (['flag','item','param','log'].includes(node.t)) effects([node]);
    state = advanceExecution(state, scene);
  }
  throw new Error(`${end}: 再生が終端しない`);
}
const endingIds = ['a1_arrest','a2_escape','a3_puppet','a4_reversal','b1_true','b2_unfinished','b3_silenced'];
for (const [index,end] of ['A-1','A-2','A-3','A-4','B-1','B-2','B-3'].entries()) {
  const result = replay(end,proof[end]);
  assert.equal(result.ending,endingIds[index], `${end}: 実シナリオの終端`);
  proof[end].path = result.path;
  proof[end].steps = result.steps;
}

console.log('END到達条件検査（自由行動予算: 第一章4/6、第二章4/6）');
console.log(`- 自由行動組合せを ${allPlans.length} 通り探索`);
for (const end of ['A-1', 'A-2', 'A-3', 'A-4', 'B-1', 'B-2', 'B-3']) {
  console.log(`- ${end}: 到達可能（実シナリオ${proof[end].steps}ノード再生）`);
  console.log(`  ${proof[end].path.join(' → ')}`);
}
console.log('全7ENDがブロック予算・選択分岐を含む経路で到達可能です。');
