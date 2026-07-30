import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const personas = ['suiri', 'bannin', 'kanjou', 'sokkyou', 'ura', 'toubou', 'ayatsuri', 'gyakuten', 'mikiri', 'shoshinsha', 'danzai'];
const baselineEndings = {
  suiri:'b3', bannin:'a1', kanjou:'b1', sokkyou:'a1', ura:'a3', toubou:'a2',
  ayatsuri:'a1', gyakuten:'a4', mikiri:'b3', shoshinsha:'b1', danzai:'b2',
};
const metrics = [
  { name:'見せる盤の説得力', key:'showCredibility' },
  { name:'まことの盤の正確さ', key:'truthAccuracy' },
];
const summary = JSON.parse(await readFile(new URL('./ログ/サマリ.json', import.meta.url), 'utf8'));

for (const persona of personas) {
  const result = summary[persona];
  assert.equal(result?.status, 'ended', `${persona}: 最後まで完走していない`);
  assert.deepEqual(result?.errors, [], `${persona}: 実ブラウザプレイでエラーが発生した`);
  assert.deepEqual(result?.warnings, [], `${persona}: 実ブラウザプレイで操作上限警告が発生した`);
  assert.equal(result?.final?.endingId, baselineEndings[persona], `${persona}: 到達ENDが基準線から変化した`);
}

for (const metric of metrics) {
  const values = personas.map((persona) => {
    const value = summary[persona]?.final?.temari?.[metric.key];
    assert.ok(Number.isInteger(value), `${persona}: ${metric.name}を観測できない`);
    return [persona, value];
  });
  const distinct = new Set(values.map(([, value]) => value));
  assert.ok(distinct.size >= 2, `${metric.name}が全ペルソナで${values[0][1]}のまま不変`);
  console.log(`${metric.name}: ${distinct.size}種類（${values.map(([persona, value]) => `${persona}=${value}`).join(' ')}）`);
}

const completedTruth = personas.filter((persona) => summary[persona].final.temari.truthAccuracy >= 6);
assert.ok(completedTruth.length > 0, 'まことの盤を6/6まで完成したペルソナがいない');
for (const persona of completedTruth) {
  assert.ok(
    summary[persona].final.flags?.plan?.includes('other_scriptwriter_noticed'),
    `${persona}: 6/6到達後に other_scriptwriter_noticed を実取得できていない`,
  );
}
console.log(`まことの盤6/6・脚本家フラグ取得: ${completedTruth.join(' ')}`);
