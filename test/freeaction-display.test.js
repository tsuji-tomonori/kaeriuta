import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chapter1 } from '../src/data/scenario/chapter1.js';
import { chapter2 } from '../src/data/scenario/chapter2.js';
import { createGameState } from '../src/engine/state.js';
import { freeAction, enrichFreeActions, rewardNames, focusPreview, actionPreview, compactRewards } from '../src/systems/freeaction/index.js';
import { staticDocument } from '../tools/AIプレイ/lib/静的DOM.mjs';
const actions=[chapter1,chapter2].flatMap(c=>enrichFreeActions(c.nodes.find(n=>n.part==='freeAction').args.actions));

test('24注目先のボタンに報酬と追加数値を表示し、獲得物を本文スクロールの外へ置く',async()=>{
  const previous=globalThis.document;globalThis.document=staticDocument();
  try {
    for(const action of actions)for(const focus of action.scenes.focus.options){
      const pending=freeAction.start({state:createGameState()},{actions:[action],blocks:1});
      const root=document.body.lastElementChild;
      root.querySelector('#begin-exploration').click();
      const actionButton=root.querySelector('[data-id]');
      assert.ok(actionButton.textContent.startsWith(action.label));assert.equal(actionButton.tagName,'BUTTON');assert.equal(actionButton.disabled,false);
      actionButton.click();
      const button=root.querySelectorAll('[data-focus]').find(b=>b.dataset.focus===focus.id);
      assert.ok(button.textContent.startsWith(focus.label));assert.ok(button.textContent.includes(focusPreview(action,focus)));
      for(const name of rewardNames([...action.reward,...focus.effects]))assert.ok(button.textContent.includes(name));
      if(!rewardNames([...action.reward,...focus.effects]).length)assert.match(button.textContent,/手掛かり・反論札なし/);
      assert.match(button.textContent,/増す|下がる|追加の数値変化なし/);
      button.click();
      const narrative=root.querySelector('.fa-narrative'),takeaway=root.querySelector('.fa-takeaway'),summary=root.querySelector('.fa-result-summary');
      assert.ok(takeaway&&summary);assert.equal(narrative.querySelector('.fa-acquired'),null);
      assert.match(takeaway.textContent,/持ち帰ったもの/);assert.match(summary.textContent,/反映予定/);
      const compact=compactRewards([...action.reward,...focus.effects]);assert.ok(summary.textContent.includes(compact));
      assert.ok(compact.length<=65,'844幅で獲得名を一行に収める分量');
      root.querySelector('#next').click();await pending;
    }
  } finally {globalThis.document=previous;}
});

test('一覧は固定代償と追加変化の有無だけを説明する',()=>{
  for(const action of actions){const html=actionPreview(action);assert.doesNotMatch(html,/注目先：|変化なし ／|信頼\+|知りすぎ\+/);for(const focus of action.scenes.focus.options)assert.ok(!html.includes(focus.label));}
});

test('本文一覧は全24通りの正本と一致し、選ばなかった会話を余韻へ持ち込まない',()=>{
  const doc=readFileSync(new URL('../docs/自由行動-本文一覧.md',import.meta.url),'utf8');
  assert.equal((doc.match(/^## \d+\./gm)||[]).length,24);
  for(const a of actions)for(const f of a.scenes.focus.options)for(const text of [a.scenes.intro,f.text,a.scenes.reaction]){assert.ok(doc.includes(text),`${a.id}/${f.id}: 一覧を再生成する`);assert.equal(text,text.trim());for(const p of text.split('\n\n'))assert.ok(p.length<=215);}
  const byId=Object.fromEntries(actions.map(a=>[a.id,a]));
  for(const [id,forbidden] of Object.entries({study:/図書館の人|痛んだ本/,housekeeper:/音を説明|その言い方/,observe_detectives:/靴を見るの/,doctor:/その声|言い切られなかった/,cover_tracks:/善意/}))assert.doesNotMatch(byId[id].scenes.reaction,forbidden);
});

test('横長スマホの3行動と固定要約に必要な領域を確保する',()=>{
  const css=readFileSync(new URL('../src/styles/追加-freeaction.css',import.meta.url),'utf8');
  assert.match(css,/\.fa-screen \.fa-body \{ top: 64px; bottom: 66px;/);
  assert.match(css,/grid-template-columns: 1fr auto/);assert.match(css,/min-height: 48px/);
  // 844×390: 本文領域260px。目的26+フィルタ38+所持24+行動48×3+隙間8=240px。
  assert.ok(26+38+24+48*3+8<=390-64-66);
  assert.match(css,/\.fa-result-summary \{ display: grid/);
});
