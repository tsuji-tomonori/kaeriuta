import test from 'node:test'; import assert from 'node:assert/strict';
import { applyResponse, resultFor } from '../src/systems/rebuttal/index.js'; import { canBreak, triggersBravado, isB1Open, isB2Locked } from '../src/systems/inference/index.js'; import { consumeBlock, selectFreeAction, continueFreeAction, closeFreeAction, acquiredLineLabels, previewLineLabels, FREE_ACTION_PHASE } from '../src/systems/freeaction/index.js'; import { displayText } from '../src/systems/common.js'; import { rebuttalCh2 } from '../src/data/parts/rebuttal-ch2.js'; import { rebuttalCh4a } from '../src/data/parts/rebuttal-ch4a.js';
import { createNotebook, installNotebook } from '../src/systems/notebook/index.js';
test('反論: 確信度と知りすぎ判定',()=>{const r=applyResponse({conviction:50,overknow:1,node:{id:'n1'}},{result:{effects:[{t:'param',key:'conviction',delta:20},{t:'param',key:'overknow',delta:1}]}},[]);assert.equal(r.conviction,70);assert.equal(resultFor(r.conviction,r.overknow),'conan_marked');});
test('共同推理: 開き直りは動揺50で発動し、要求が増える',()=>{assert.equal(triggersBravado(49),false);assert.equal(triggersBravado(50),true);const n={id:'n7',requirements:[['a'],['b']]};assert.equal(canBreak(n,['a','b'],false,false),true);assert.equal(canBreak(n,['a','b'],true,false),false);});
test('共同推理: 真相ENDの門は動揺97で開く',()=>{assert.equal(isB1Open(96),false);assert.equal(isB1Open(97),true);});
test('B-2は折句未所持N10で確定',()=>assert.equal(isB2Locked({id:'n10'},[]),true));
test('自由行動は一回につき一ブロックを消費',()=>{const r=consumeBlock({state:{params:{}},remaining:3,used:[],effects:[],dispatches:[]},{id:'study',reward:[],risk:[]});assert.equal(r.remaining,2);assert.equal(r.used[0],'study');});
test('自由行動の報酬は選択後の状態へ即時に反映する',()=>{const r=consumeBlock({state:{params:{},flags:{past:[],plan:[],alive:[]},items:[]},remaining:2,used:[],effects:[]},{id:'study',reward:[{t:'flag',id:'dedication_erasure'}],risk:[]});assert.deepEqual(r.state.flags.past,['dedication_erasure']);});
test('自由行動の系統は通常は選択前に伏せ、取得後またはヒント有効時だけ示す',()=>{const action={reward:[{t:'flag',id:'dedication_erasure'}]};assert.deepEqual(previewLineLabels(action),[]);assert.deepEqual(previewLineLabels(action,true),['🕯 過去']);assert.deepEqual(acquiredLineLabels(action),['🕯 過去']);});
test('自由行動はブロックを使い切ると終了状態になる',()=>{const actions=[{id:'a',reward:[],risk:[]},{id:'b',reward:[],risk:[]}];let model={state:{params:{}},remaining:2,used:[],effects:[],phase:FREE_ACTION_PHASE.SELECTING,currentAction:null};model=selectFreeAction(model,actions[0]);assert.equal(model.phase,FREE_ACTION_PHASE.READING);model=continueFreeAction(model,actions);assert.equal(model.phase,FREE_ACTION_PHASE.SELECTING);model=selectFreeAction(model,actions[1]);model=continueFreeAction(model,actions);assert.equal(model.phase,FREE_ACTION_PHASE.FINISHED);assert.equal(model.remaining,0);});
test('自由行動は途中で閉じても必ず終了状態になる',()=>{const model=closeFreeAction({state:{params:{}},remaining:2,used:['a'],effects:[],phase:FREE_ACTION_PHASE.READING,currentAction:{id:'a'}});assert.equal(model.phase,FREE_ACTION_PHASE.FINISHED);assert.equal(model.currentAction,null);});
test('反論データには見出しと役割ラベルがある',()=>{assert.equal(rebuttalCh2.title,'二日目昼の尋問');assert.deepEqual(rebuttalCh2.nodes.map((node)=>node.kind),['前提','論理','物証']);assert.equal(rebuttalCh4a.title,'眠りの悟郎・推理ショー');assert.ok(rebuttalCh4a.nodes.every((node)=>node.kind));});
test('パネル表示値は未定義・null・NaNを空文字へフォールバックする',()=>{assert.equal(displayText(undefined),'');assert.equal(displayText(null),'');assert.equal(displayText(Number.NaN),'');assert.equal(displayText('表示'),'表示');});

class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.listeners = new Map();
    this.attributes = new Map();
    this._innerHTML = '';
    this.closeButton = null;
  }
  append(...children) {
    children.forEach((child) => {
      if (child.parentNode) child.remove();
      child.parentNode = this;
      this.children.push(child);
    });
  }
  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  querySelector(selector) {
    if (selector === '.notebook-close') {
      this.closeButton ||= new FakeElement('button');
      return this.closeButton;
    }
    return null;
  }
  focus() {}
  set innerHTML(value) { this._innerHTML = value; }
  get innerHTML() { return this._innerHTML; }
}

function fakeDocument() {
  const listeners = new Map();
  const document = {
    body: new FakeElement('body'),
    head: new FakeElement('head'),
    createElement: (tagName) => new FakeElement(tagName),
    querySelector: () => null,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    listenerCount(type) { return listeners.get(type)?.size ?? 0; },
  };
  return document;
}

test('手帳は open を二回呼んでも単一インスタンスを維持する', () => {
  const previousDocument = globalThis.document;
  const document = fakeDocument();
  globalThis.document = document;
  try {
    const mount = new FakeElement('main');
    const controller = createNotebook({
      mount,
      getState: () => ({ params: {}, flags: { past: [], plan: [], alive: [] }, items: [], logs: {} }),
    });
    controller.open();
    controller.open();
    assert.equal(mount.children.filter((child) => child === controller.element).length, 1);
    assert.equal(controller.isOpen(), true);
    controller.close();
  } finally {
    globalThis.document = previousDocument;
  }
});

test('installNotebook の dispose は N キーリスナを解除する', () => {
  const previousDocument = globalThis.document;
  const document = fakeDocument();
  globalThis.document = document;
  try {
    const mount = new FakeElement('main');
    const options = {
      mount,
      state: { params: {}, flags: { past: [], plan: [], alive: [] }, items: [], logs: {} },
    };
    const installed = installNotebook(options);
    const repeated = installNotebook(options);
    assert.equal(repeated, installed);
    assert.equal(document.listenerCount('keydown'), 1);
    installed.dispose();
    assert.equal(document.listenerCount('keydown'), 0);
    assert.equal(mount.children.includes(installed), false);
  } finally {
    globalThis.document = previousDocument;
  }
});
