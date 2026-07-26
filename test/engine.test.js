import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameState } from '../src/engine/state.js';
import { evaluateCondition, applyEffect } from '../src/engine/script-runner.js';
import { flags } from '../src/data/flags.js';
import { changeParam } from '../src/engine/params.js';
import { deserializeState, loadGame, saveKey, serializeState } from '../src/engine/save.js';
import { advanceExecution, createExecutionStack, currentNode, enterBranch } from '../src/engine/execution.js';

test('条件評価はフラグ、数値、論理結合を扱う', () => {
  let state = createGameState(); state = applyEffect(state, { t: 'flag', id: 'cleanup' }, flags); state = applyEffect(state, { t: 'param', key: 'conscience', delta: 2 }, flags);
  assert.equal(evaluateCondition({ and: [{ flag: 'cleanup' }, { param: 'conscience', gte: 2 }] }, state, flags), true);
  assert.equal(evaluateCondition({ countFlags: 'plan', gte: 2 }, state, flags), false);
});
test('パラメータは上限と下限を越えない', () => { const s = createGameState(); assert.equal(changeParam(s.params, 'suspicion', 500).suspicion, 100); assert.equal(changeParam(s.params, 'conscience', -100).conscience, -10); });
test('セーブ用シリアライズはゲーム状態を往復できる', () => { const state = createGameState(); assert.deepEqual(deserializeState(serializeState(state)), state); assert.equal(deserializeState('{bad'), null); });
test('version 2の旧形式セーブを後方互換でロードできる', () => {
  const state = createGameState();
  state.sceneId = 'chapter2';
  const values = new Map([[saveKey('2'), JSON.stringify(state)]]);
  const storage = { getItem: (key) => values.get(key) ?? null };
  assert.deepEqual(loadGame('2', storage), state);
});

test('ifの内部でも実行スタックをセーブ・ロードでき、シナリオ定義を変更しない', () => {
  const scene = { nodes: [
    { t: 'if', cond: { flag: 'cleanup' }, then: [{ t: 'say', text: 'then' }], else: [{ t: 'say', text: 'else' }] },
    { t: 'say', text: 'after' },
  ] };
  const definitionBefore = structuredClone(scene);
  let state = createGameState();
  state.executionStack = createExecutionStack();
  state = applyEffect(state, { t: 'flag', id: 'cleanup' }, flags);
  state = applyEffect(state, { t: 'item', id: 'cleanup_card' }, flags);
  state = applyEffect(state, { t: 'param', key: 'conscience', delta: 2 }, flags);
  state = applyEffect(state, { t: 'log', key: 'seat', value: 'near' }, flags);
  state = enterBranch(state, scene, currentNode(scene, state), 'then');
  assert.equal(currentNode(scene, state).text, 'then');
  const loaded = deserializeState(serializeState(state));
  assert.deepEqual(loaded.executionStack, state.executionStack);
  assert.deepEqual(loaded.flags, state.flags);
  assert.deepEqual(loaded.items, state.items);
  assert.deepEqual(loaded.params, state.params);
  assert.deepEqual(loaded.logs, state.logs);
  assert.equal(currentNode(scene, loaded).text, 'then');
  const afterBranch = advanceExecution(loaded, scene);
  assert.equal(currentNode(scene, afterBranch).text, 'after');
  assert.deepEqual(scene, definitionBefore);
});
