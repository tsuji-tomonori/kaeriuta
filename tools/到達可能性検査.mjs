/**
 * 到達可能性検査（実プレイではない）。
 *
 * 特殊パート {t:'call'} は実行せず、END に必要なフラグも事前に注入する。
 * シナリオグラフの代表経路を静的に検査するための補助ツールであり、DOM を
 * 操作する実プレイは tools/AIプレイ/実行.sh を使うこと。
 */
import { scenes } from '../src/data/scenario/index.js';
import { createGameState } from '../src/engine/state.js';
import { applyEffect, evaluateCondition } from '../src/engine/script-runner.js';
import { flags } from '../src/data/flags.js';
import { currentNode, advanceExecution, enterBranch, gotoLabel, resetExecution } from '../src/engine/execution.js';

function run(name, chooser, seed = []) {
  let state = createGameState(); for (const effect of seed) state = applyEffect(state, effect, flags);
  let steps = 0;
  while (steps++ < 20000) {
    const scene = scenes[state.sceneId]; const node = currentNode(scene, state);
    if (!node) throw new Error(`${name}: scene exhausted (${state.sceneId})`);
    if (node.t === 'end') return node.endingId;
    if (node.t === 'jump') { state.sceneId = node.scene; state = resetExecution(state); continue; }
    if (node.t === 'if') { state = enterBranch(state, scene, node, evaluateCondition(node.cond, state, flags) ? 'then' : 'else'); continue; }
    if (node.t === 'choice') { const options = node.options.filter((option) => evaluateCondition(option.cond, state, flags)); const option = chooser(node, options) || options[0]; if (!option) throw new Error(`${name}: 選択肢なし`); for (const effect of option.effects || []) state = applyEffect(state, effect, flags); const target = gotoLabel(state, scene, option.goto); state = target.found ? target.state : advanceExecution(state, scene); continue; }
    if (node.t === 'call') { state = advanceExecution(state, scene); continue; }
    if (['flag','item','param','log'].includes(node.t)) state = applyEffect(state, node, flags);
    state = advanceExecution(state, scene);
  }
  throw new Error(`${name}: 無限ループ`);
}
const all = ['old_road','three_plans','corpse_callus','original_title','dedication_erasure','search_record','lattice_shadow','manuscript_left_hand','folklorist_reply','onda_annotated_book','winter_lamp_style','other_plan','menu_roster','dental_tampering','food_ledger','peephole_map','hidden_dimension','medical_record_copy','temariuta_murder_page','uno_ledger_handwriting','tea_brand_testimony','award_photo_right_hand'].map((id) => ({t:'flag',id}));
const select = (route, ending) => (node, options) => {
  if (node.prompt?.startsWith('左へ')) return options.find((o) => o.goto === route) || options[0];
  if (node.prompt === '正午の決断') return options.find((o) => o.goto === ending) || options[0];
  if (node.prompt === '逃げ道を選ぶ') return options.find((o) => o.goto === 'survive') || options[0];
  if (node.prompt === '六番の唄に、何を返す？') return options.find((o) => o.goto === ending) || options[0];
  return options[0];
};
const paths = [
 ['A-1', select('execution', 'a1'), []],
 ['A-4', select('execution', 'a4'), all],
 ['B-1', select('confession', 'b1'), [...all, {t:'log',key:'joint_reasoning',value:'b1_true'}]],
 ['B-2', select('confession', 'b2'), [{t:'flag',id:'hidden_dimension'}]],
];
for (const [name, chooser, seed] of paths) console.log(`${name}: ${run(name, chooser, seed)}`);
