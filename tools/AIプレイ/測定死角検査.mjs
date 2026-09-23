import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runBruteForceResistance } from './総当たり耐性.mjs';

const personas = ['suiri', 'bannin', 'kanjou', 'sokkyou', 'ura', 'toubou', 'ayatsuri', 'gyakuten', 'mikiri', 'shoshinsha', 'danzai'];
const baselineEndings = {
  // 02Bの報酬分割: 旧道では壁の手掛かり、繊維では死者の手を同時取得しない。
  // banninは生存1件のまま耐えるためA-3。旧共通報酬2件だけを戻すと
  // 生存3件・確信100でA-1になることをai-play-node.test.jsで検証。
  // uraは見せる盤の栞2欄をcommitして疑惑+12・警戒+16を受けA-1。
  // 盤の判断だけ旧挙動へ戻すとA-3に戻る（ai-play-node.test.js）。
  suiri:'b3', bannin:'a3', kanjou:'b1', sokkyou:'a1', ura:'a1', toubou:'a2',
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
verify(() => runBruteForceResistance());
for (const persona of personas) {
  const result = summary[persona];
  verify(() => assert.equal(result?.status, 'ended', `${persona}: 最後まで完走していない`));
  verify(() => assert.deepEqual(result?.errors, [], `${persona}: 実ブラウザプレイでエラーが発生した`));
  verify(() => assert.deepEqual(result?.warnings, [], `${persona}: 実ブラウザプレイで操作上限警告が発生した`));
  verify(() => assert.equal(result?.final?.endingId, baselineEndings[persona], `${persona}: 到達ENDが基準線から変化した`));
}
verify(() => assert.deepEqual(
  [...new Set(personas.map(persona => summary[persona]?.final?.endingId))].sort(),
  ['a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'b3'], '11ペルソナで全7ENDを踏破していない',
));

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
for (const [persona, result] of Object.entries(summary)) {
  const { temari, logs } = result?.final || {};
  if (!temari) continue;
  if (temari.exit === 'open') {
    console.log(`${persona}: 盤を開いたままでゲームの log が未記録のため、temari_board_matches との照合を省略`);
    continue;
  }
  verify(() => {
    assert.ok(logs && Object.hasOwn(logs, 'temari_board_matches'), `${persona}: logs.temari_board_matches が未取得`);
    assert.equal(temari.truthAccuracy, logs.temari_board_matches, `${persona}: まことの盤の計算値とゲームの記録値が不一致`);
  });
}
const exits = { commit:[], done:[], other:[] };
for (const persona of personas) {
  const temari = summary[persona]?.final?.temari;
  const exit = temari?.exit;
  exits[exit === 'commit' || exit === 'done' ? exit : 'other'].push(`${persona}${exit !== 'commit' && exit !== 'done' ? `=${exit || '未取得'}` : ''}`);
  // 確定後の配置でスコア文は消える。最後の表示後に配置選択・スロット変化が
  // なかった場合だけ、保存した表示値を退席時の計算値と比較する。
  if (temari?.displayed && temari.displayedComparable === true) {
    for (const metric of metrics) verify(() => assert.equal(
      temari.displayed[metric.key], temari[metric.key], `${persona}: ${metric.name}の表示値と計算値が不一致`,
    ));
  } else if (temari?.displayed) {
    console.log(`${persona}: 最後の表示後に配置操作あり、または比較可否未取得のため表示値の比較を省略`);
  }
}
console.log(`退席方法: ${Object.entries(exits).map(([exit, values]) => `${exit === 'other' ? 'その他' : exit} ${values.length}件（${values.join(' ')}）`).join(' / ')}`);
const openedTruth = personas.filter(persona => summary[persona]?.final?.temari?.openedFaces?.includes('truth'));
const committedShiori = personas.filter(persona => {
  const temari = summary[persona]?.final?.temari;
  return temari?.exit === 'commit' && temari.shioriExposure > 0;
});
console.log(`まことの盤を開いた人数: ${openedTruth.length}体（${openedTruth.join(' ')}）`);
console.log(`栞を見せる盤に置いてcommitした人数: ${committedShiori.length}体（${committedShiori.join(' ')}）`);
verify(() => assert.ok(openedTruth.length >= 3, 'まことの盤を開いたペルソナが3体未満'));
verify(() => assert.ok(committedShiori.length >= 2, '見せる盤に栞を置いてcommitしたペルソナが2体未満'));
verify(() => assert.ok(exits.commit.length > personas.length / 2, 'commitで退席したペルソナが過半数に達していない'));
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
