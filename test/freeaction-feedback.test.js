import test from 'node:test';
import assert from 'node:assert/strict';
import { freeActionParamPreview } from '../src/systems/freeaction/index.js';
import { createParams } from '../src/engine/params.js';

test('自由行動の数値予告は選択済み効果だけを表示し、本編の状態を変更しない', () => {
  const state = { params: { ...createParams(), suspicion: 18 } };
  const effects = [
    { t: 'param', key: 'suspicion', delta: 6 },
    { t: 'param', key: 'awareness', delta: 1 },
    { t: 'item', id: 'alibi_4' },
  ];
  const before = structuredClone({ state, effects });
  assert.deepEqual(freeActionParamPreview(state, effects), ['疑惑 18 → 24', '警戒 0 → 1']);
  assert.deepEqual({ state, effects }, before);
});

test('数値予告は本編と同じ順序で上限・下限を適用する', () => {
  const state = { params: { ...createParams(), suspicion: 98, overknow: 0 } };
  assert.deepEqual(freeActionParamPreview(state, [
    { t: 'param', key: 'suspicion', delta: 6 },
    { t: 'param', key: 'suspicion', delta: -5 },
    { t: 'param', key: 'overknow', delta: -1 },
  ]), ['疑惑 98 → 95']);
  assert.deepEqual(freeActionParamPreview(state, []), []);
});
