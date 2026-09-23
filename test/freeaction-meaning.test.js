import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chapter1 } from '../src/data/scenario/chapter1.js';
import { chapter2 } from '../src/data/scenario/chapter2.js';
import { scenes } from '../src/data/scenario/index.js';
import { flags } from '../src/data/flags.js';
import { createGameState } from '../src/engine/state.js';
import { applyEffect, evaluateCondition } from '../src/engine/script-runner.js';
import { enrichFreeActions, freeAction, effectNotices } from '../src/systems/freeaction/index.js';
import { observationHint, observedResponse } from '../src/systems/rebuttal/observation.js';
import { applyResponse, resultFor } from '../src/systems/rebuttal/index.js';
import { rebuttalCh2 } from '../src/data/parts/rebuttal-ch2.js';
import { rebuttalCh4a } from '../src/data/parts/rebuttal-ch4a.js';
import { powerWord } from '../src/systems/rebuttal/power.js';

const actionsFor = chapter => enrichFreeActions(chapter.nodes.find(n => n.part === 'freeAction').args.actions);
const actions = [chapter1, chapter2].flatMap(actionsFor);
function* walk(value) {
  if (!value || typeof value !== 'object') return;
  yield value;
  for (const child of Object.values(value)) yield* walk(child);
}
const apply = effects => effects.reduce((state, effect) => applyEffect(state, effect, flags), createGameState());
const echoNodes = [...walk(chapter2.nodes)].filter(n => n.t === 'if' && /_focus$/.test(n.cond?.log?.key));

test('12行動24注目先の実データが、その注目だけの後続本文を発火させる', () => {
  const sources = actions.flatMap(action => action.scenes.focus.options.map(focus => ({ action, focus, log: focus.effects.find(e => e.t === 'log') })));
  assert.equal(sources.length, 24);
  assert.equal(echoNodes.length, 24);
  for (const { action, focus, log } of sources) {
    const matches = echoNodes.filter(n => n.cond.log.key === log.key && n.cond.log.equals === log.value);
    assert.equal(matches.length, 1, `${action.id}/${focus.id}: 実データで発火する呼応が必要`);
    const echo = matches[0];
    assert.ok(evaluateCondition(echo.cond, apply([...action.reward, ...action.risk, ...focus.effects]), flags));
    assert.ok(!evaluateCondition(echo.cond, createGameState(), flags), '未選択の発見を語らない');
    const other = action.scenes.focus.options.find(o => o !== focus);
    assert.ok(!evaluateCondition(echo.cond, apply(other.effects), flags));
    assert.ok(echo.then.some(n => n.t === 'mono' && n.text.length > 35));
    const echoIndex = chapter2.nodes.findIndex(n => [...walk(n)].includes(echo));
    const ownDay = actionsFor(chapter1).some(a => a.id === action.id) ? 1 : 2;
    const targetIndex = chapter2.nodes.findIndex(n => n.part === (ownDay === 1 ? 'rebuttal' : 'temariBoard'));
    assert.ok(echoIndex < targetIndex);
    if (ownDay === 2) assert.ok(echoIndex > chapter2.nodes.findIndex(n => n.part === 'freeAction'));
  }
  for (const echo of echoNodes) assert.ok(sources.some(({log}) => log.key === echo.cond.log.key && log.value === echo.cond.log.equals), `未配布ログ: ${JSON.stringify(echo.cond)}`);
});

test('使いどころを予告した札・退路・照合には、取得後に実在する利用先がある', () => {
  const byId = Object.fromEntries(actions.map(a => [a.id, a]));
  const targets = {
    accomplice_room: ['other_plan'], prepare: ['serving_roster', 'alibi_1', 'alibi_2'],
    explore: ['hidden_dimension', 'old_road'], morgue: ['corpse_callus', 'alibi_3'],
    doctor: ['medical_record_copy', 'dental_tampering'], library: ['dedication_erasure', 'alibi_5'], old_road_song: ['old_road', 'alibi_6'],
  };
  const consumers = [...walk([rebuttalCh2, rebuttalCh4a, ...Object.values(scenes).filter(c => c.id !== 'chapter1' && c.id !== 'chapter2')])];
  for (const [id, cards] of Object.entries(targets)) {
    const effects = [...byId[id].reward, ...byId[id].scenes.focus.options.flatMap(o => o.effects)];
    for (const card of cards) {
      assert.ok(effects.some(e => ['item', 'flag'].includes(e.t) && e.id === card), `${id}: 予告の根拠を配布する`);
      assert.ok(consumers.some(n => n.card === card || n.flag === card || n.item === card || (Array.isArray(n) && n.includes(card))), `${id}/${card}: 利用先が必要`);
    }
  }
  for (const action of actions) assert.ok(action.use?.length > 15 && action.use.length <= 48);
});


test('第二章の尋問の札は、尋問より前の実データに入手経路がある', () => {
  const prefix = [scenes.prologue.nodes, chapter1.nodes, chapter2.nodes.slice(0,chapter2.nodes.findIndex(n => n.part === 'rebuttal'))];
  const granted = new Set([...walk(prefix)].filter(n => n.t === 'flag' || n.t === 'item').map(n => n.id));
  for (const response of rebuttalCh2.nodes.flatMap(n => n.responses)) if (response.card) assert.ok(granted.has(response.card), `尋問までに未配布: ${response.card}`);
});

test('配膳と読書の札は排他的で、準備一回で両方を得られない', () => {
  const action = actions.find(a => a.id === 'prepare');
  const [roster, record] = action.scenes.focus.options.map(o => apply([...action.reward, ...o.effects]));
  assert.ok(roster.items.includes('serving_roster') && roster.items.includes('alibi_1'));
  assert.ok(!roster.flags.plan.includes('reading_record') && !roster.items.includes('alibi_2'));
  assert.ok(record.flags.plan.includes('reading_record') && record.items.includes('alibi_2'));
  assert.ok(!record.items.includes('serving_roster') && !record.items.includes('alibi_1'));
  assert.equal(action.reward.length, 0);
});

test('観察ログが条件表示と固有の効果を発火させ、未観察の採点と既存の完封を保つ', () => {
  const action = actions.find(a => a.id === 'observe_detectives');
  const goro = apply([...action.reward, ...action.scenes.focus.options[0].effects]);
  const conan = apply([...action.reward, ...action.scenes.focus.options[1].effects]);
  const silence = rebuttalCh2.nodes[2].responses.find(r => r.kind === 'silence');
  assert.match(observationHint(goro, rebuttalCh2.id, silence, ['n2']), /観察で知った悟郎.*増さない/);
  assert.match(observationHint(goro, rebuttalCh2.id, silence, []), /観察で知った悟郎.*増す/);
  assert.equal(observationHint(conan, rebuttalCh2.id, silence), '');
  const risky = rebuttalCh2.nodes[0].responses.find(r => r.result.overknow);
  assert.match(observationHint(conan, rebuttalCh2.id, risky), /観察で知ったコウ君.*知りすぎ/);
  assert.equal(observationHint(goro, rebuttalCh2.id, risky), '');
  assert.equal(observationHint(createGameState(), rebuttalCh2.id, risky), '');
  assert.equal(observationHint(conan, 'day3_show', risky), '');
  const careful = observedResponse(conan, rebuttalCh2.id, 'n1', risky);
  const delta = (r, key) => r.result.effects.filter(e => e.t === 'param' && e.key === key).reduce((sum, e) => sum + e.delta, 0);
  assert.equal(delta(careful, 'suspicion'), delta(risky, 'suspicion') - 3);
  assert.equal(delta(careful, 'overknow'), delta(risky, 'overknow'), '知りすぎは消さない');
  assert.equal(delta(careful, 'conviction'), delta(risky, 'conviction'));
  assert.equal(observedResponse(createGameState(), rebuttalCh2.id, 'n1', risky), risky);
  assert.equal(observedResponse(conan, 'day3_show', 'n1', risky), risky);
  assert.equal(risky.result.effects.find(e => e.key === 'suspicion').delta, 15, '元データを変更しない');
  for (const state of [createGameState(), goro, conan]) {
    let model = { conviction: 52, overknow: 0, broken: [] };
    const responses = [rebuttalCh2.nodes[0].responses.find(r => r.kind === 'redirect'), rebuttalCh2.nodes[1].responses.find(r => r.card === 'serving_roster'), silence];
    responses.forEach((r, index) => {
      const before = structuredClone(r);
      observationHint(state, rebuttalCh2.id, r, model.broken);
      assert.deepEqual(r, before);
      model = applyResponse({ ...model, node: rebuttalCh2.nodes[index] }, observedResponse(state, rebuttalCh2.id, rebuttalCh2.nodes[index].id, r), model.broken);
    });
    assert.equal(model.conviction, state === goro ? 29 : 32);
    // 既存の完封経路（片付け札）もそのまま成立する。
    model = applyResponse({ ...model, node: rebuttalCh2.nodes[2] }, rebuttalCh2.nodes[2].responses[0], model.broken);
    assert.equal(resultFor(model.conviction, model.overknow), 'perfect');
  }
});

test('本文は215字以内で端に改行がなく、自由行動は段落に分けた選択別の正本を読む', () => {
  for (const node of walk([chapter1.nodes, chapter2.nodes])) if (['say', 'mono', 'stage'].includes(node.t)) {
    assert.ok(node.text.length <= 215, `${node.text.length}字: ${node.text}`);
    assert.equal(node.text, node.text.trim());
  }
  for (const action of actions) {
    assert.equal(action.scenes.intro, action.narrative.intro);
    assert.equal(action.scenes.reaction, action.narrative.reaction);
    for (const focus of action.scenes.focus.options) {
      assert.equal(focus.text, action.narrative.discoveries[focus.id]);
      assert.ok(focus.text.length >= 150, `${action.id}/${focus.id}: 発見の場面`);
      assert.ok(focus.text.includes('\n\n') || focus.text.length <= 200);
      for (const paragraph of [action.scenes.intro, focus.text, action.scenes.reaction].flatMap(s => s.split('\n\n'))) assert.ok(paragraph.length <= 215, `${action.id}: ${paragraph.length}字の段落`);
    }
  }
  assert.match(actions[0].scenes.intro, /恩田さんが死んだとき膝にあった『手毬唄殺し』の初版本/);
});

// 実際の start/render とクリックを動かす、ブラウザを起動しない最小DOM。
class Element {
  constructor(tag = 'section') { this.tagName = tag.toUpperCase(); this.dataset = {}; this.children = []; this.classList = {add() {}}; }
  set innerHTML(html) {
    this.html = html; this.controls = [];
    if (html === '<div class="ku-stage"></div>') this.stage = new Element('div');
    for (const m of html.matchAll(/<(button|g)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
      const el = new Element(m[1]); el.html = m[3]; el.attributes = m[2];
      el.id = m[2].match(/\bid="([^"]+)"/)?.[1];
      el.disabled = /\bdisabled\b/.test(m[2]);
      for (const attr of m[2].matchAll(/data-([a-z-]+)="([^"]*)"/g)) el.dataset[attr[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = attr[2];
      this.controls.push(el);
    }
  }
  get innerHTML() { return this.html; }
  get textContent() { return (this.html || '').replace(/<[^>]+>/g, ''); }
  querySelector(selector) { return selector === '.ku-stage' ? this.stage : this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    if (selector.startsWith('#')) return (this.controls || []).filter(e => e.id === selector.slice(1));
    if (selector.startsWith('.')) return (this.controls || []).filter(e => e.attributes.includes(selector.slice(1)));
    const attr = selector.match(/^\[([^\]]+)\]$/)?.[1];
    return attr ? (this.controls || []).filter(e => e.attributes.includes(attr)) : [];
  }
  append(el) { this.children.push(el); }
  addEventListener() {}
  focus() {}
  remove() { this.removed = true; }
}

test('全12行動24焦点の全画面に内部値を出さず、導入→選択→注目→結果→終端を操作できる', async () => {
  const previous = globalThis.document;
  const body = new Element();
  globalThis.document = { body, createElement: tag => new Element(tag), querySelector: () => ({}) };
  let clicks = 0;
  try {
    for (const action of actions) for (const focus of action.scenes.focus.options) {
      const run = freeAction.start({ state: createGameState(), mount: body }, { actions: [action], blocks: 1 });
      const root = body.children.at(-1); const stage = root.stage;
      const checkText = () => assert.doesNotMatch(stage.textContent, /undefined|null|NaN|weak|medium|strong|[a-z]+_[a-z0-9_]+|\[object Object\]/);
      const click = selector => { checkText(); const button = stage.querySelector(selector); assert.ok(button, selector); assert.equal(button.tagName, 'BUTTON'); assert.ok(!button.disabled); button.onclick(); clicks++; };
      click('#begin-exploration');
      assert.match(stage.textContent, /数値の意味・操作/);
      assert.ok(stage.textContent.includes(action.use));
      for (const room of stage.querySelectorAll('[data-room]')) { assert.equal(room.tagName, 'G'); assert.match(room.attributes, /role="button"/); }
      click('[data-id]');
      assert.ok(stage.textContent.includes(action.narrative.intro.replaceAll('\n\n', '')));
      const focusButton = stage.querySelectorAll('[data-focus]').find(e => e.dataset.focus === focus.id);
      assert.ok(focusButton && !focusButton.disabled); checkText(); focusButton.onclick(); clicks++;
      assert.ok(stage.textContent.includes(focus.text.replaceAll('\n\n', '')));
      const other = action.scenes.focus.options.find(o => o !== focus);
      assert.ok(!stage.textContent.includes(other.text.replaceAll('\n\n', '')));
      click('#next');
      const result = await run;
      assert.equal(result.remaining, 0); assert.ok(root.removed);
      assert.ok(result.effects.some(e => e.t === 'log' && e.value === focus.id));
    }
    assert.equal(clicks, 96);
  } finally { globalThis.document = previous; }
});

test('札の性質は章末と同じ日本語で、未知の札IDも通知へ漏らさない', () => {
  const notices = effectNotices([{t:'item',id:'serving_roster'},{t:'item',id:'reading_record'},{t:'item',id:'medical_record_copy'},{t:'item',id:'unknown_internal_id'}]).join('');
  for (const value of Object.values(powerWord)) assert.ok(notices.includes(value));
  assert.doesNotMatch(notices, /strong|weak|medium|unknown_internal_id/);
});

test('一覧の密度と横長画面の固定操作領域を維持するCSS契約', () => {
  const css = fs.readFileSync(new URL('../src/styles/追加-freeaction.css', import.meta.url), 'utf8');
  assert.match(css, /\.fa-screen \.fa-row \{[^}]*padding: 8px 12px/);
  assert.match(css, /\.fa-screen \.fa-row \.ku-card-name \{[^}]*white-space: nowrap/);
  assert.match(css, /\.fa-screen \.ku-hand \{ flex-wrap: nowrap/);
  assert.match(css, /\.fa-screen\[data-phase="focusing"\] \.fa-narrative \{ bottom: 118px/);
  // 1280×720: 本文524pxに、目的40+説明24+フィルタ38+所持24+カード84×4+間隔18=480px。
  assert.ok(40 + 24 + 38 + 24 + 84 * 4 + 18 <= 720 - 96 - 100);
  assert.ok(actions.every(a => [...a.label].length * 17 < 700));
});
