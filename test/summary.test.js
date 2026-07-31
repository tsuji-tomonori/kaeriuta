import test from 'node:test';
import assert from 'node:assert/strict';
import { buildChapterSummary, renderChapterSummary, unchosenActions, watchText } from '../src/systems/summary/index.js';
import { endingsMeta, buildEndingExplanation } from '../src/data/endings-meta.js';

test('章末帳簿は内部IDでなく表示名を出す', () => {
  const result = buildChapterSummary({ flags:{past:['dedication_erasure'],plan:[],alive:[]}, items:['serving_roster'], params:{}, logs:{} }, { chapter:1 });
  assert.ok(result.cards.length);
  assert.ok(result.cards.every((card) => !/^[a-z_]+$/.test(card.name)));
});

test('自由行動ログから未選択の頁を逆算する', () => {
  assert.deepEqual(unchosenActions('study,explore', [{id:'study',label:'書斎'},{id:'explore',label:'館'},{id:'kitchen',label:'厨房'}]), ['厨房']);
});

test('章末サマリは増減と実行済み行動の原因だけを表示する', () => {
  const result = buildChapterSummary({ flags:{past:[],plan:[],alive:[]}, items:[], params:{}, logs:{ free_action_day1:'study,explore', study_focus:'binding', explore_focus:'road' } }, {
    chapter:1, actionsLogKey:'free_action_day1', actions:[{id:'study',label:'書斎を調べる',risk:[{t:'param',key:'suspicion',delta:10}]},{id:'explore',label:'館を探索する'}], watch:['suspicion','overknow','trust'],
  });
  assert.equal(watchText(result.watch), '疑い +18（書斎を調べる、館を探索する） ／ 知りすぎ +1（書斎を調べる）');
  assert.doesNotMatch(watchText(result.watch), /信頼/);
});

test('未選択行動がなければ選ばなかった頁の節を出さない', () => {
  const html = renderChapterSummary(buildChapterSummary({ flags:{past:[],plan:[],alive:[]}, items:[], params:{}, logs:{ free_action_day1:'study' } }, { chapter:1, actionsLogKey:'free_action_day1', actions:[{id:'study',label:'書斎を調べる'}] }));
  assert.doesNotMatch(html, /選ばなかった頁/);
  assert.doesNotMatch(html, /書斎には、まだ読んでいない頁がある/);
});

test('動かなかった章末帳簿で句点を重複しない', () => {
  const html = renderChapterSummary(buildChapterSummary({ flags:{past:[],plan:[],alive:[]}, items:[], params:{}, logs:{} }, { chapter:1, actions:[], watch:[] }));
  assert.doesNotMatch(html, /。。/);
});

test('全ENDに理由と次の一手がある', () => {
  assert.equal(endingsMeta.length, 7);
  assert.ok(endingsMeta.every((ending) => ending.reason && ending.nextHint));
});

test('古いセーブ相当の欠損状態でもEND解説を組み立てられる', () => {
  assert.doesNotThrow(() => buildEndingExplanation('a1_arrest', {}));
  assert.ok(buildEndingExplanation('a1_arrest', {}).reason);
});

test('END解説は共同推理の内部IDを表示しない', () => {
  const detail = buildEndingExplanation('b2_unfinished', { logs:{ joint_reasoning:'b2_locked' } }).detail;
  assert.match(detail, /折句を欠き/);
  assert.doesNotMatch(detail, /b[123]_(true|unfinished|locked)/);
});

test('報告用: 各章の章末サマリ表示例を実出力する', () => {
  const first = renderChapterSummary(buildChapterSummary({ flags:{past:[],plan:[],alive:[]}, items:[], params:{}, logs:{free_action_day1:'study,explore',study_focus:'binding',explore_focus:'road'}}, { chapter:1, actionsLogKey:'free_action_day1', actions:[{id:'study',label:'書斎を調べる',risk:[{t:'param',key:'suspicion',delta:10}]},{id:'explore',label:'館を探索する'}], watch:['suspicion','overknow'] }));
  const second = renderChapterSummary(buildChapterSummary({ flags:{past:[],plan:[],alive:[]}, items:[], params:{}, logs:{free_action_day2:'morgue,doctor',morgue_focus:'hand',doctor_focus:'words'}}, { chapter:2, actionsLogKey:'free_action_day2', actions:[{id:'morgue',label:'死体安置室に忍び込む',risk:[{t:'param',key:'overknow',delta:1}]},{id:'doctor',label:'主治医を探る',risk:[{t:'param',key:'suspicion',delta:5}]}], watch:['suspicion','overknow'] }));
  const third = renderChapterSummary(buildChapterSummary({ flags:{past:[],plan:['other_plan'],alive:[]}, items:[], params:{}, logs:{route:'confession',chapter3_final:'song'}}, { chapter:3, kind:'route' }));
  for (const [chapter, html] of [['第一章', first], ['第二章', second], ['第三章', third]]) console.log(`${chapter}章末サマリ例: ${html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()}`);
});
