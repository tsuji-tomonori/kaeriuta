import test from 'node:test';
import assert from 'node:assert/strict';
import { createPacingObserver, estimatedReadingSeconds, visibleNarrativeText } from '../tools/AIプレイ/lib/テンポ計測.js';
import { measurePacing, pacingReport } from '../tools/AIプレイ/テンポ計測.mjs';
import { playPersona } from '../tools/AIプレイ/Node踏破検査.mjs';
import { personas } from '../tools/AIプレイ/ペルソナ/index.js';

const range = {id:'sample',issue:0,name:'検査区間',start:{scene:'sample',prompt:'開始'},end:{scene:'sample',prompt:'終了'},passSeconds:160,failAboveSeconds:240};
const state = {sceneId:'sample',executionStack:[{path:[],index:0}]};
const event = node => ({node,state});
const start = observer => observer.observe(event({t:'choice',prompt:'開始'}));
const finish = observer => {observer.observe(event({t:'choice',prompt:'終了'}));return observer.result()[0];};

test('653字は60秒、低速300字/分では130.6秒となる',()=>{
  assert.equal(estimatedReadingSeconds(653),60);
  assert.equal(estimatedReadingSeconds(653,2),62);
  assert.equal(estimatedReadingSeconds(653,0,300),130.6);
  for(const args of [[-1],[1.5],[1,-1],[1,0,0],[1,NaN],[1,0,Infinity]])assert.throws(()=>estimatedReadingSeconds(...args));
});
test('演出文の括弧は実表示に合わせ、一度だけ数える',()=>{
  assert.equal(visibleNarrativeText({t:'stage',text:'雷'}),'【雷】');
  assert.equal(visibleNarrativeText({t:'stage',text:'【雷】'}),'【雷】');
  assert.equal(visibleNarrativeText({t:'choice',prompt:'選ぶ'}),null);
  const observer=createPacingObserver([range]);start(observer);
  observer.observe(event({t:'say',who:'shiori',text:'あ😀'}));
  observer.observe(event({t:'stage',text:'雷'}));
  observer.observe(event({t:'param',key:'suspicion',delta:10}));
  observer.observe(event({t:'chapterTitle',text:'第一章'}));
  const result=finish(observer);
  assert.equal(result.characters,5);
  assert.equal(result.nodes.length,2);
  assert.equal(result.fixedWaitSeconds,0);
  assert.equal(result.boundaryCandidates.length,1);
  assert.equal(result.boundaryCandidates[0].afterCharacters,5);
});
test('背景や章題が変わってもMAGはリセットせず、端数を丸めて合否判定しない',()=>{
  const observer=createPacingObserver([range]);start(observer);
  observer.observe(event({t:'mono',text:'あ'.repeat(870)}));
  observer.observe(event({t:'bg',id:'next-room'}));
  observer.observe(event({t:'mono',text:'あ'.repeat(872)}));
  const result=finish(observer);
  assert.equal(result.characters,1742);
  assert.equal(result.timeGate,'warning');
  assert.ok(result.estimatedSeconds>160);
});
test('未確認の途中選択・特殊パート・待機を時間ゲート合格として飲み込まない',()=>{
  for(const node of [{t:'choice',prompt:'新しい選択'},{t:'call',part:'chapterSummary'},{t:'wait',ms:1000},{t:'end'}]){
    const observer=createPacingObserver([range]);start(observer);
    assert.throws(()=>observer.observe(event(node)),/未評価/);
  }
});
test('開始や終点が欠ける区間、重複開始を黙って省略しない',()=>{
  const missing=createPacingObserver([range]);assert.throws(()=>missing.result(),/未観測/);
  start(missing);assert.throws(()=>missing.result(),/未観測/);
  assert.throws(()=>start(missing),/重複/);
});
test('11経路の本文を実行分岐どおり計測し、全7ENDと基準線を保つ',async()=>{
  const report=await measurePacing();
  const results=Object.values(report.results);
  assert.equal(results.length,11);
  assert.equal(new Set(results.map(r=>r.ending)).size,7);
  const prologue=results.map(r=>r.ranges[0]), fork=results.map(r=>r.ranges[1]);
  assert.deepEqual([...new Set(prologue.map(r=>r.characters))].sort((a,b)=>a-b),[3212,3296]);
  assert.equal(Math.min(...fork.map(r=>r.characters)),1489);
  assert.equal(Math.max(...fork.map(r=>r.characters)),1778);
  for(const result of results){
    assert.deepEqual(result.warnings,[]);
    assert.equal(result.ranges[0].timeGate,'fail');
    assert.equal(result.ranges[1].timeGate,'pass');
    assert.equal(result.ranges[0].end.scene,'chapter1');
  }
  const markdown=pacingReport(report);
  assert.match(markdown,/全ての到達可能状態の最短・最長ではない/);
  assert.match(markdown,/Issue #15 \/ #16 の完了を主張しない/);
});
test('観測コールバックに渡した値の書き換えが実行状態や正本に漏れない',async()=>{
  const baseline=await playPersona(personas.sokkyou);
  const observed=await playPersona(personas.sokkyou,{onNode:({node,state})=>{
    node.t='end';node.text='書き換え';state.sceneId='missing';state.params.suspicion=100;
    state.executionStack.length=0;
  }});
  assert.deepEqual(observed,baseline);
});
