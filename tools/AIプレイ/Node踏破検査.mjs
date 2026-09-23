import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { scenes } from '../../src/data/scenario/index.js';
import { createGameState } from '../../src/engine/state.js';
import { applyEffect, evaluateCondition } from '../../src/engine/script-runner.js';
import { currentNode, advanceExecution, enterBranch, gotoLabel, resetExecution } from '../../src/engine/execution.js';
import { flags } from '../../src/data/flags.js';
import { rebuttalRegistry } from '../../src/systems/rebuttal/index.js';
import { parts } from '../../src/systems/index.js';
import { personas } from './ペルソナ/index.js';
import { staticDocument } from './lib/静的DOM.mjs';
import { text, observedTemari, observedOption } from './lib/観測.js';
import { stepTemariBoard, createTemariProgress } from '../ブラウザ検証/進行基盤.js';

export async function playPersona(persona) {
  const previous = globalThis.document;
  globalThis.document = staticDocument();
  let state = createGameState(), chapter = '', steps = 0;
  const memory = {}, decisions = [], checkpoints = [], warnings = [];
  const params = (root) => ({ suspicion: state.params.suspicion,
    conviction: Number(text(root?.querySelector('.ku-gauges')).match(/悟郎の確信(\d+)/)?.[1] ?? state.params.conviction),
    overknow:null, awareness:null, conscience:null });
  const apply = effects => { for(const effect of effects || [])state = applyEffect(state, effect, flags); };
  const choose = (name, elements, root, prompt = '') => {
    const options = name ? elements.map(observedOption) : elements.map((e,index)=>({index,label:e.label}));
    assert.ok(options.length, `${persona.id}: 候補なし ${name}`);
    const observation = { chapter, sceneId:state.sceneId, kind:name?'part':'choice', text:name?text(root.querySelector('main, .ku-stage')):prompt, params:params(root),
      choices:name?[]:options, part:name?{name,text:text(root.querySelector('main, .ku-stage')),options,...(name==='temariBoard'?{temari:observedTemari(root)}:{})}:null };
    const decision = persona.decide(observation,memory);
    const selected = name?decision.part:decision.choice;
    assert.ok(elements[selected], `${persona.id}: 選択範囲外`);
    decisions.push({scene:state.sceneId,part:name||'choice',selected:options[selected].label,reason:decision.reason});
    return selected;
  };
  async function runPart(node) {
    if(node.part==='chapterSummary')return {}; // 帳簿は読み取りと終了のみ。ルート条件に効果なし。
    if (node.part === 'rebuttal') await rebuttalRegistry[node.args.id]();
    const boardState=createTemariProgress();
    let done=false, result, failure;
    parts[node.part].start({state,mount:document.body},node.args).then(r=>{done=true;result=r;},e=>{failure=e;done=true;});
    for(let i=0;i<1000&&!done;i++) {
      await new Promise(resolve=>setImmediate(resolve));
      if(done)break;
      const root=document.body.lastElementChild;
      if (!root) continue;
      const click = el => { assert.ok(el, `${persona.id}/${node.part}: 操作先なし`); el.click(); return true; };
      const select = (name,els) => choose(name,els,root);
      if(node.part==='freeAction') {
        const automatic=root.querySelector('#begin-exploration, #next');
        if(automatic)click(automatic);
        else {const els=root.querySelectorAll('[data-focus]').length?root.querySelectorAll('[data-focus]'):root.querySelectorAll('[data-id]');click(els[select(node.part,els)]);}
      } else if(node.part==='rebuttal') {
        const automatic=root.querySelector('[data-v], .rebut-confirm .ku-primary:not([disabled]), #done');
        if(automatic)click(automatic);else {const els=root.querySelectorAll('[data-r]:not([disabled])');click(els[select(node.part,els)]);}
      } else if(node.part==='temariBoard') {
        stepTemariBoard(root,{state:boardState,choosePart:select,click,warn:w=>warnings.push(w)});
      } else if(node.part==='jointReasoning') {
        const nodes=root.querySelectorAll('.node-grid [data-id]');
        const methods=root.querySelectorAll('#own:not([disabled]), #proxy, #relic:not([disabled]), #unfinished');
        const els=nodes.length?nodes:methods;
        if(els.length)click(els[select(node.part,els)]);
        else click(root.querySelectorAll('[data-e]').find(el=>text(el).includes('帰り唄'))||root.querySelector('[data-e], #done'));
      } else throw new Error(`未対応part: ${node.part}`);
    }
    if(failure)throw failure;
    assert.ok(done,`${persona.id}/${node.part}: 操作上限`);
    return result;
  }
  try {
    while(++steps<10000) {
      const scene=scenes[state.sceneId], node=currentNode(scene,state);
      assert.ok(node,`${persona.id}: ${state.sceneId}を読み尽くした`);
      if(node.t==='end')return {ending:node.endingId,params:state.params,flags:state.flags,steps,decisions,checkpoints,warnings};
      if(node.t==='chapterTitle')chapter=node.text;
      if(node.t==='jump'){state.sceneId=node.scene;state=resetExecution(state);checkpoints.push({scene:state.sceneId,params:state.params});continue;}
      if(node.t==='if'){state=enterBranch(state,scene,node,evaluateCondition(node.cond,state,flags)?'then':'else');continue;}
      if(node.t==='choice'){
        const options=node.options.filter(o=>evaluateCondition(o.cond,state,flags));
        const selected=options[choose(null,options,null,node.prompt)];apply(selected.effects);
        const target=gotoLabel(state,scene,selected.goto);state=target.found?target.state:advanceExecution(state,scene);continue;
      }
      if(node.t==='call') { const result=await runPart(node);apply(result.effects);
        if(result.endingId&&node.args?.routeEnding!==false&&scenes[`end_${result.endingId}`]){state.sceneId=`end_${result.endingId}`;state=resetExecution(state);continue;}
      }
      if(['flag','item','param','log'].includes(node.t))apply([node]);
      state=advanceExecution(state,scene);
    }
    throw new Error(`${persona.id}: シナリオ操作上限`);
  } finally {globalThis.document=previous;}
}
export async function runPersonas() {
  const results={};
  for(const persona of Object.values(personas)){
    results[persona.id]=await playPersona(persona);
    const r=results[persona.id];console.log(`${persona.id}: ${r.ending} 疑惑${r.params.suspicion} 確信${r.params.conviction} 動揺${r.params.agitation} (${r.decisions.length}判断)`);
    assert.deepEqual(r.warnings,[]);
  }
  return results;
}
export function predictionReport(results) {
  const lines = ['# 指示書03 AIプレイのNode予測', '', '生成: `node tools/AIプレイ/Node踏破検査.mjs --report`。実シナリオを進め、実パートのHTMLから表示文を読み、11ペルソナの採点器でクリックする。盤の操作・観測はブラウザと共通。CSS描画とブラウザの非同期動作は未検証。章末帳簿は効果がないため省略。', '', '| ペルソナ | END予測 | 疑惑 | 確信 | 動揺 | 判断数 |', '|---|---|---:|---:|---:|---:|'];
  for (const [id, r] of Object.entries(results)) lines.push(`| ${id} | ${r.ending} | ${r.params.suspicion} | ${r.params.conviction} | ${r.params.agitation} | ${r.decisions.length} |`);
  lines.push('', '以下は各採点器が実際に選んだ表示文。自由行動は行動と注目先を交互に記載。END用の状態・選択肢ID・正解表を採点器へ渡していない。', '');
  for (const [id, r] of Object.entries(results)) {
    lines.push(`## ${id}`, '');
    for (const d of r.decisions.filter(d => d.part !== 'temariBoard')) lines.push(`- ${d.scene}／${d.part}: ${d.selected}`);
    lines.push('', `盤の判断数: ${r.decisions.filter(d=>d.part==='temariBoard').length}。警告: ${r.warnings.length}件。`, '');
  }
  return lines.join('\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const results=await runPersonas();
  await writeFile('/tmp/kaeriuta03-node.json',JSON.stringify(results,null,2));
  if(process.argv.includes('--report')) await writeFile(new URL('../../docs/AIプレイ-03-Node予測.md', import.meta.url), predictionReport(results));
  if(!process.argv.includes('--diagnose'))assert.equal(new Set(Object.values(results).map(r=>r.ending)).size,7,'11ペルソナで全7END');
}
