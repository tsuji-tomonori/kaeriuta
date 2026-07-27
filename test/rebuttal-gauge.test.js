import test from 'node:test';
import assert from 'node:assert/strict';
import { gazeValue, resultFor, applyResponse, responseOptions } from '../src/systems/rebuttal/index.js';
import { items } from '../src/data/items.js';

test('注視値はクランプされ、知りすぎ二回で危険域へ入る', () => {
 assert.equal(gazeValue(), 0);
 assert.equal(gazeValue({ overknow: 2, suspicion: 0 }), 90);
 assert.equal(gazeValue({ overknow: 2, suspicion: 100 }), 100);
 assert.equal(gazeValue({ overknow: 99, suspicion: 99 }), 100);
 for (let overknow = 0; overknow < 10; overknow++) assert.ok(gazeValue({ overknow: overknow + 1, suspicion: 55 }) >= gazeValue({ overknow, suspicion: 55 }));
 for (let suspicion = 0; suspicion < 100; suspicion++) assert.ok(gazeValue({ overknow: 1, suspicion: suspicion + 1 }) >= gazeValue({ overknow: 1, suspicion }));
});

test('結果の四分岐は既存の優先順を維持する', () => {
 assert.equal(resultFor(0, 0), 'perfect');
 assert.equal(resultFor(50, 0), 'pending');
 assert.equal(resultFor(70, 0), 'watched');
 assert.equal(resultFor(0, 2), 'conan_marked');
});

test('応答の適用結果は既存仕様と同じ', () => {
 const response = { result: { effects: [{ t: 'param', key: 'conviction', delta: -20 }, { t: 'param', key: 'overknow', delta: 1 }], break: true } };
 const result = applyResponse({ conviction: 50, overknow: 1, node: { id: 'n1' } }, response, []);
 assert.deepEqual(result, { conviction: 30, overknow: 2, node: { id: 'n1' }, broken: ['n1'], effects: response.result.effects });
});

test('全ての札は表示メタデータのキーを持つ', () => {
 for (const item of Object.values(items)) for (const key of ['source', 'power', 'exposure']) assert.ok(Object.hasOwn(item, key), `${item.id}: ${key}`);
});

test('未所持札を混ぜても data-r は元の応答へ対応する', () => {
 const responses = [{ kind: 'silence', result: { effects: [] } }, { kind: 'rebut', card: 'missing_card', result: { effects: [] } }, { kind: 'rebut', card: 'held_card', result: { effects: [] } }];
 const options = responseOptions(responses, { hasCard: card => card === 'held_card' });
 assert.deepEqual(options.map(option => [option.key, option.disabled]), [['0', false], ['1', true], ['2', false]]);
 assert.equal(responses[Number(options[2].key)], responses[2]);
});
