import test from 'node:test';
import assert from 'node:assert/strict';
import { effectivenessFor, applyResponse } from '../src/systems/rebuttal/index.js';

test('確信を上げる反論を逆効果、変えない反論を変化なしと伝える', () => {
  assert.equal(effectivenessFor({ result: { effects: [{ t: 'param', key: 'conviction', delta: 5 }] } }), '逆効果（悟郎の確信が上がる）');
  assert.equal(effectivenessFor({ result: { effects: [] } }), '悟郎の確信は変わらない');
});

test('先に崩した主張で効果が変わる反論は、実際の適用結果と同じ効き目を表示する', () => {
  const response = { result: { effects: [{ t: 'param', key: 'conviction', delta: 5 }], conditional: { ifBroken: 'previous', effects: [{ t: 'param', key: 'conviction', delta: -15 }] } } };
  const state = { conviction: 50, overknow: 0, node: { id: 'current' } };
  assert.equal(effectivenessFor(response, []), '逆効果（悟郎の確信が上がる）');
  assert.equal(applyResponse(state, response, []).conviction, 55);
  assert.equal(effectivenessFor(response, ['previous']), '強力');
  assert.equal(applyResponse(state, response, ['previous']).conviction, 35);
});
