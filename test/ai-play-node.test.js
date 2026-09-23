import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runPersonas } from '../tools/AIプレイ/Node踏破検査.mjs';
import { personas } from '../tools/AIプレイ/ペルソナ/index.js';
import { observedTemari, observedOption, hudNumber } from '../tools/AIプレイ/lib/観測.js';
import { Element } from '../tools/AIプレイ/lib/静的DOM.mjs';
import { temariBoard } from '../src/systems/temariuta-board/index.js';
import { staticDocument } from '../tools/AIプレイ/lib/静的DOM.mjs';
import { createGameState } from '../src/engine/state.js';
import { chapter2 } from '../src/data/scenario/chapter2.js';

import { chapter4a } from '../src/data/scenario/chapter4a.js';
import { evaluateCondition } from '../src/engine/script-runner.js';
import { flags } from '../src/data/flags.js';

test('実シナリオ・実画面・共通の盤操作・11採点器を通して7ENDへ到達する', async () => {
  const results=await runPersonas();
  assert.equal(Object.keys(results).length,11);
  assert.equal(new Set(Object.values(results).map(r=>r.ending)).size,7);
  for(const [id,end] of Object.entries({suiri:'b3_silenced',bannin:'a3_puppet',kanjou:'b1_true',sokkyou:'a1_arrest',ura:'a3_puppet',toubou:'a2_escape',ayatsuri:'a1_arrest',gyakuten:'a4_reversal',mikiri:'b3_silenced',shoshinsha:'b2_unfinished',danzai:'b2_unfinished'}))assert.equal(results[id].ending,end,id);
  assert.ok(results.toubou.params.suspicion<=69);
  assert.ok(results.kanjou.params.agitation>=97);
  // ペルソナを替えず、旧版の共通報酬だけを戻した場合の分岐差。
  const gate=chapter4a.nodes[chapter4a.nodes.findIndex(n=>n.t==='label'&&n.id==='endure')+1];
  assert.ok(evaluateCondition(gate.cond,results.bannin,flags),'現在は生存の根拠不足でA-3');
  const legacy=structuredClone(results.bannin);
  legacy.flags.alive.push('hidden_dimension','corpse_callus');
  assert.equal(evaluateCondition(gate.cond,legacy,flags),false,'旧共通報酬なら根拠不足を通過');
  assert.ok(evaluateCondition(gate.else[0].cond,legacy,flags),'同じ確信100からA-1');
  const reverse=results.gyakuten;
  assert.ok(reverse.flags.past.length>=2&&reverse.flags.plan.length>=4&&reverse.flags.alive.length>=3);
  assert.ok(reverse.flags.plan.includes('three_plans'));
  assert.ok(reverse.flags.alive.includes('corpse_callus')&&reverse.flags.alive.includes('peephole_map'));
  assert.ok(reverse.flags.plan.includes('other_scriptwriter_noticed'),'表示された矛盾を解いて6/6の効果を実取得');
  for(const r of Object.values(results))assert.ok(r.decisions.filter(d=>d.part==='freeAction').length===16,'両章4行動・8注目先を実選択');
});

test('再設計版の実HTMLから札・欄・選択状態を読み、盤面を空と誤認しない',async()=>{
  const previous=globalThis.document;globalThis.document=staticDocument();
  try {
    const done=temariBoard.start({state:createGameState()},chapter2.nodes.find(n=>n.part==='temariBoard').args);
    const root=document.body.lastElementChild;
    let obs=observedTemari(root);
    assert.equal(obs.cards.length,7);assert.equal(obs.slots.length,6);assert.equal(obs.slots.filter(s=>s.empty).length,2);
    assert.equal(obs.slots[0].cardId,'onda');
    root.querySelector('[data-card="goko"]').click();obs=observedTemari(root);
    assert.equal(obs.cards.find(c=>c.selected).id,'goko');
    assert.equal(observedOption(root.querySelector('[data-card="goko"]'),0).meta.selected,true);
    root.querySelector('#done').click();await done;
  } finally {globalThis.document=previous;}
});

test('略字のHUDをtitleから読み、疑惑をnullにしない',()=>{
  const el=new Element();el.innerHTML='<span class="hud-value" title="疑惑"><span>疑</span><span>57</span></span>';
  assert.equal(hudNumber(el,'疑惑'),57);assert.equal(hudNumber(el,'確信'),null);
});

test('新しい注目先の報酬と代償を読み、並び替えても同じ意味の候補を選ぶ',()=>{
  const choose=(persona,labels)=>{const options=labels.map((label,index)=>({label,index}));const d=persona.decide({kind:'part',text:'注目先を選ぶ',part:{name:'freeAction',options}},{});return options[d.part].label;};
  const discovery=['震える指先を見る手掛かり・反論札なし｜信頼が5増す','地下の音をたずねる手掛かり「地下の物音」｜警戒が1増す'];
  for(const labels of [discovery,[...discovery].reverse()])assert.ok(choose(personas.gyakuten,labels).startsWith('地下の音'));
  const route=['赤鉛筆の山道を辿る手掛かり「三里先の旧道」／反論札「猟師の目撃メモ」｜疑惑が1増す','唄の距離を数える手掛かり「三里先の旧道」｜疑惑が2下がる'];
  for(const labels of [route,[...route].reverse()])assert.ok(choose(personas.toubou,labels).startsWith('唄の距離'));
});

test('探索の優先語を反論札の入手元へ誤適用しない',()=>{
  const labels=['反証: 厨房の献立表第一章・厨房で得た札 ／ 効き目：逆効果','転嫁: 珈琲なら誰でも触れたはず効き目：手応えあり'];
  const decision=personas.gyakuten.decide({kind:'part',part:{name:'rebuttal',options:labels.map((label,index)=>({label,index}))}},{});
  assert.doesNotMatch(decision.reason,/目標A-4.*必要な分岐/);
});

test('ブラウザとNodeが同じ観測・盤操作を使い、採点器に正解表を渡さない',()=>{
  const browser=readFileSync(new URL('../tools/AIプレイ/自動プレイ.js',import.meta.url),'utf8');
  assert.match(browser,/part.temari = observedTemari\(modal\)/);assert.match(browser,/elements.map\(observedOption\)/);
  assert.doesNotMatch(browser,/\.cards \[data-card\]|\.board \.slot/);
  const policy=readFileSync(new URL('../tools/AIプレイ/ペルソナ/表示判断.js',import.meta.url),'utf8');
  assert.doesNotMatch(policy,/boardSolution|boardCover|option\.id|option\.index/);
});
