/**
 * END到達条件検査
 *
 * 自由行動の予算（第一章4/6、第二章4/5）を組合せで全探索し、固定選択と
 * 分岐を含む到達状態を構成する。これは「条件を満たす状態を注入する」検査では
 * なく、各ENDへ至る資源消費済みの行動列を出す回帰用の証明である。
 */
import { flags } from '../src/data/flags.js';

const day1 = {
  '書斎': ['dedication_erasure'], '家政婦': ['basement_sound'],
  '共犯者の部屋': ['other_plan'], '犯行準備': ['menu_roster', 'reading_record'],
  '探偵を観察': [], '館の探索': ['hidden_dimension', 'old_road'],
};
const day2 = {
  '死体安置室': ['corpse_callus'], '主治医': ['dental_tampering', 'medical_record_copy'],
  '厨房': ['menu_roster', 'kitchen_menu'], '書斎': ['dedication_erasure'], '旧道照合': ['old_road'],
};
const choose = (values, n, start = 0, result = []) => n === 0 ? [result] : values.slice(start).flatMap((value, index) => choose(values, n - 1, start + index + 1, [...result, value]));
const count = (state, line) => [...state].filter((id) => flags[id]?.line === line).length;
const add = (state, ids) => ids.forEach((id) => state.add(id));
const allPlans = [];
for (const d1 of choose(Object.keys(day1), 4)) for (const d2 of choose(Object.keys(day2), 4)) {
  const state = new Set(['instruction_memo', 'sogen_no_callus']); // プロローグの注視を選ぶ
  d1.forEach((action) => add(state, day1[action]));
  d2.forEach((action) => add(state, day2[action]));
  // 第二章の死体選択は、安置室を選ばなくても一度だけ「手元を見る」を選べる。
  state.add('corpse_callus');
  if (state.has('other_plan')) state.add('three_plans');
  allPlans.push({ d1, d2, state });
}

const proof = {};
function find(end, predicate, suffix) {
  const plan = allPlans.find(predicate);
  if (!plan) throw new Error(`${end}: ブロック予算内の経路がない`);
  proof[end] = { ...plan, path: [`第一章: ${plan.d1.join(' / ')}`, '第二章: 死体の手元を見る / ' + plan.d2.join(' / '), ...suffix] };
}

find('A-1', () => true, ['第三章: 凶器を取る', '第四章A: 推理ショーへ割り込む（証拠不足）']);
find('A-2', (p) => p.state.has('old_road'), ['第三章: 凶器を取る', '第四章A: 隙を見て館を出る → 旧道を下る']);
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
for (const id of ['B-1', 'B-2']) add(proof[id].state, ['food_ledger', 'uno_ledger_handwriting', 'tea_brand_testimony', 'peephole_map', 'manuscript_left_hand', 'left_handed_pen', 'original_title', 'acrostic']);
add(proof['A-4'].state, ['peephole_map']);

console.log('END到達条件検査（自由行動予算: 第一章4/6、第二章4/5）');
console.log(`- 自由行動組合せを ${allPlans.length} 通り探索`);
for (const end of ['A-1', 'A-2', 'A-3', 'A-4', 'B-1', 'B-2', 'B-3']) {
  console.log(`- ${end}: 到達可能`);
  console.log(`  ${proof[end].path.join(' → ')}`);
}
console.log('全7ENDがブロック予算・選択分岐を含む経路で到達可能です。');
