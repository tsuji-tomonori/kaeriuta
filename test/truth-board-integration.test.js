import test from 'node:test';
import assert from 'node:assert/strict';
import { chapter2 } from '../src/data/scenario/chapter2.js';
import { flags } from '../src/data/flags.js';
import { createGameState } from '../src/engine/state.js';
import { applyEffect, evaluateCondition } from '../src/engine/script-runner.js';
import { advanceExecution, currentNode, enterBranch } from '../src/engine/execution.js';
import { boardCompletionEffects, temariBoard } from '../src/systems/temariuta-board/index.js';
import { createNotebook } from '../src/systems/notebook/index.js';
import { staticDocument } from '../tools/AIプレイ/lib/静的DOM.mjs';

const boardIndex = chapter2.nodes.findIndex(node => node.t === 'call' && node.part === 'temariBoard');
const call = chapter2.nodes[boardIndex];
const response = chapter2.nodes[boardIndex + 1];

function afterBoard(state) {
  state = { ...structuredClone(state), executionStack: [{ path: [], index: boardIndex + 1 }] };
  const text = [];
  for (let steps = 0; steps < 10; steps++) {
    if (state.executionStack.length === 1 && state.executionStack[0].index === boardIndex + 2) return text;
    const node = currentNode(chapter2, state);
    if (node.t === 'if') {
      state = enterBranch(state, chapter2, node, evaluateCondition(node.cond, state, flags) ? 'then' : 'else');
    } else {
      assert.equal(node.t, 'mono', '呼応は本文のみで、フラグやパラメータを変更しない');
      text.push(node.text);
      state = advanceExecution(state, chapter2);
    }
  }
  assert.fail('盤の呼応から既存本文へ戻らなかった');
}

function completedState(matches, committed) {
  return boardCompletionEffects({ truthAccuracy: matches, showCredibility: 0, showShiori: 0 }, 6, committed)
    .reduce((state, effect) => applyEffect(state, effect, flags), createGameState());
}

test('盤の終了効果を受け、0〜6の両終了方法で適切な心内語を一度だけ読む', () => {
  assert.equal(response.t, 'if');
  const full = response.then[0].text;
  const partial = response.else[0].then[0].text;
  assert.notEqual(full, partial);
  assert.deepEqual(afterBoard(createGameState()), [], '旧セーブ等でログがない場合');
  for (const committed of [false, true]) for (let matches = 0; matches <= 6; matches++) {
    const expected = committed && matches === 6 ? [full] : matches >= 3 && matches <= 5 ? [partial] : [];
    assert.deepEqual(afterBoard(completedState(matches, committed)), expected, `${matches}/6・効果適用=${committed}`);
  }
  const noticed = completedState(6, true);
  noticed.logs.temari_board_matches = 3;
  assert.deepEqual(afterBoard(noticed), [full], 'フラグ取得時は中程度の呼応より優先する');
});

function walk(nodes) {
  return nodes.flatMap(node => [node, ...walk(node.then || []), ...walk(node.else || [])]);
}

test('第二章の盤の前後は分岐内も1ノード215字以内で、端に改行を置かない', () => {
  const start = chapter2.nodes.findIndex(node => node.text?.startsWith('札の端に、私の名があった。'));
  assert.ok(start >= 0 && start < boardIndex);
  const prose = walk(chapter2.nodes.slice(start, boardIndex + 3)).filter(node => node.t === 'mono');
  assert.ok(prose.includes(response.then[0]));
  assert.ok(prose.includes(response.else[0].then[0]));
  for (const node of prose) {
    assert.ok([...node.text].length <= 215, `${[...node.text].length}字: ${node.text}`);
    assert.doesNotMatch(node.text, /^[\r\n]|[\r\n]$/);
    for (const paragraph of node.text.split('\n\n')) assert.ok([...paragraph].length <= 215);
  }
});

test('両面に役割の注記を表示し、既存の見出しと効果適用文を維持して確定前の正誤を伏せる', async () => {
  const previous = globalThis.document;
  globalThis.document = staticDocument();
  try {
    const run = temariBoard.start({ state: createGameState(), mount: document.body }, call.args);
    const root = document.body.lastElementChild;
    const note = root.querySelector('.board-leave-note').textContent;
    assert.match(note, /「まことの盤」は悟郎たちには見えない栞の手元の写しで、計画と実際の事件のずれを確かめられます。/);
    assert.ok(note.endsWith('「盤を置いて席を立つ」で効果が適用されます。'));
    assert.equal(root.querySelector('[data-face="show"]').getAttribute('aria-pressed'), 'true');
    const check = () => {
      assert.equal(root.querySelector('.board-leave-note').textContent, note);
      assert.equal(root.querySelectorAll('.is-correct').length, 0);
      assert.match(root.querySelector('.ku-meta').textContent, /誤り —/);
      assert.match(root.querySelector('.board-axis').textContent, /^正確さと確信への効果は「この仮説で確定」の後に表示します。/);
      assert.doesNotMatch(root.textContent, /まことの盤の正確さ：\d|表の読みへの一致：\d|第\d番の.*矛盾/);
    };
    for (const [face, label, title] of [
      ['show', '見せる盤', '悟郎たちへ差し出す盤。表の読みに寄せるほど確信は下がる。栞の名を置けば、その場で疑いを呼ぶ。'],
      ['truth', 'まことの盤', '栞だけが綴じる盤。正しく読むほど、知りすぎの余白が増える。'],
    ]) {
      const tab = root.querySelector(`[data-face="${face}"]`);
      assert.equal(tab.textContent, label);
      tab.click();
      assert.equal(root.querySelector('.ku-title').textContent, title);
      check();
      // 同じ欄に正しい札と誤った札を置いても、確定前に正誤を表示しない。
      for (const card of ['goko', 'shiori']) {
        root.querySelector(`[data-card="${card}"]`).click();
        root.querySelector('[data-number="1"][data-kind="actor"]').click();
        check();
      }
    }
    root.querySelector('#done').click();
    await run;
  } finally { globalThis.document = previous; }
});

test('完全照合を確定して得た気づきは既存の手帳の計画欄へ表示される', () => {
  const previous = globalThis.document;
  globalThis.document = staticDocument();
  try {
    let state = createGameState();
    const notebook = createNotebook({ mount: document.body, getState: () => state });
    const planText = () => notebook.element.querySelectorAll('.notebook-flag-lines section')[1].textContent;
    notebook.refresh();
    assert.doesNotMatch(planText(), /脚本家が別にいる/);
    state = completedState(6, true);
    notebook.refresh();
    assert.match(planText(), /📜 計画.*脚本家が別にいる/);
  } finally { globalThis.document = previous; }
});
