import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const personas = ['suiri', 'bannin', 'kanjou', 'sokkyou', 'ura', 'toubou', 'ayatsuri', 'gyakuten', 'mikiri', 'shoshinsha', 'danzai'];
const baselineEndings = {
  suiri:'b3', bannin:'a1', kanjou:'b1', sokkyou:'a1', ura:'a3', toubou:'a2',
  ayatsuri:'a1', gyakuten:'a4', mikiri:'b3',
  // 8/11 をコウナン任せにすると動揺66で止まる。任せきりでは真相に届かない設計どおりの B-2。
  shoshinsha:'b2', danzai:'b2',
};
const metrics = [
  { name:'表の読みへの一致', key:'showCredibility' },
  { name:'まことの盤の正確さ', key:'truthAccuracy' },
  { name:'見せる盤の栞の名指し', key:'shioriExposure' },
];
const summary = JSON.parse(await readFile(new URL('./ログ/サマリ.json', import.meta.url), 'utf8'));

const failures = [];
const verify = (callback) => { try { callback(); } catch (error) { failures.push(error.message); } };
for (const persona of personas) {
  const result = summary[persona];
  verify(() => assert.equal(result?.status, 'ended', `${persona}: 最後まで完走していない`));
  verify(() => assert.deepEqual(result?.errors, [], `${persona}: 実ブラウザプレイでエラーが発生した`));
  verify(() => assert.deepEqual(result?.warnings, [], `${persona}: 実ブラウザプレイで操作上限警告が発生した`));
  verify(() => assert.equal(result?.final?.endingId, baselineEndings[persona], `${persona}: 到達ENDが基準線から変化した`));
}

for (const metric of metrics) {
  const values = personas.map((persona) => {
    const value = summary[persona]?.final?.temari?.[metric.key];
    verify(() => assert.ok(Number.isInteger(value), `${persona}: ${metric.name}を観測できない`));
    return [persona, value];
  });
  const distinct = new Set(values.map(([, value]) => value));
  verify(() => assert.ok(distinct.size >= 2, `${metric.name}が全ペルソナで${values[0][1]}のまま不変`));
  console.log(`${metric.name}: ${distinct.size}種類（${values.map(([persona, value]) => `${persona}=${value}`).join(' ')}）`);
}

const completedTruth = personas.filter((persona) => (summary[persona]?.final?.temari?.truthAccuracy ?? 0) >= 6);
verify(() => assert.ok(completedTruth.length > 0, 'まことの盤を6/6まで完成したペルソナがいない'));
for (const persona of completedTruth) {
  verify(() => assert.ok(
    summary[persona].final.flags?.plan?.includes('other_scriptwriter_noticed'),
    `${persona}: 6/6到達後に other_scriptwriter_noticed を実取得できていない`,
  ));
}
console.log(`まことの盤6/6・脚本家フラグ取得: ${completedTruth.join(' ')}`);
if (failures.length) {
  console.error(`測定死角検査: 不整合 ${failures.length}件`);
  failures.forEach((message) => console.error(`- ${message}`));
  process.exitCode = 1;
}
