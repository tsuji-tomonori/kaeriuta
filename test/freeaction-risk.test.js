import test from 'node:test';
import assert from 'node:assert/strict';
import { chapter1 } from '../src/data/scenario/chapter1.js';
import { chapter2 } from '../src/data/scenario/chapter2.js';
import { flags } from '../src/data/flags.js';
import { items } from '../src/data/items.js';
import { FREE_ACTION_PHASE, actionDetails, costDescription, enrichFreeActions, selectFreeAction, focusFreeAction, continueFreeAction } from '../src/systems/freeaction/index.js';

function actionsOf(chapter) { return chapter.nodes.find((node) => node.t === 'call' && node.part === 'freeAction').args.actions; }
function model() { return { state:{ flags:{past:[],plan:[],alive:[]},items:[] }, remaining:2, used:[], effects:[], phase:FREE_ACTION_PHASE.SELECTING, currentAction:null, focusResult:null }; }

test('自由行動は選択、注目、読了、次の選択へ遷移する', () => {
  const [action, another] = enrichFreeActions(actionsOf(chapter1)).slice(0, 2);
  let current = selectFreeAction(model(), action);
  assert.equal(current.phase, FREE_ACTION_PHASE.FOCUSING);
  current = focusFreeAction(current, action.scenes.focus.options[0].id);
  assert.equal(current.phase, FREE_ACTION_PHASE.READING);
  current = continueFreeAction(current, [action, another]);
  assert.equal(current.phase, FREE_ACTION_PHASE.SELECTING);
});
test('scenes のない行動は従来どおり読了段階へ直行する', () => {
  const current = selectFreeAction(model(), { id:'plain', reward:[], risk:[] });
  assert.equal(current.phase, FREE_ACTION_PHASE.READING);
});
test('注目の効果は分岐し、主要報酬はどちらでも既に得ている', () => {
  const action = enrichFreeActions(actionsOf(chapter1)).find((item) => item.id === 'study');
  const first = focusFreeAction(selectFreeAction(model(), action), 'dedication');
  const second = focusFreeAction(selectFreeAction(model(), action), 'binding');
  assert.notDeepEqual(first.effects, second.effects);
  for (const current of [first, second]) assert.ok(current.state.flags.past.includes('dedication_erasure'));
});
test('全行動は見返り、正本の危険、焦点を持ち、参照先が存在する', () => {
  const actions = enrichFreeActions([...actionsOf(chapter1), ...actionsOf(chapter2)]);
  assert.equal(actions.length, 12);
  for (const action of actions) {
    assert.ok(action.gain && action.risk?.length, action.id);
    assert.equal('cost' in action, false, `${action.id}: 手書きの代償文を持たない`);
    assert.ok(action.scenes?.focus?.options?.length, action.id);
    for (const effect of [...action.reward, ...action.scenes.focus.options.flatMap((option) => option.effects || [])]) {
      if (effect.t === 'flag') assert.ok(flags[effect.id], `${action.id}:${effect.id}`);
      if (effect.t === 'item') assert.ok(items[effect.id], `${action.id}:${effect.id}`);
    }
  }
});
test('全行動の代償表示は、常時効果と焦点ごとの実効果を区別して列挙する', () => {
  const names = { suspicion:'疑惑', trust:'信頼', awareness:'警戒', overknow:'知りすぎ', conscience:'良心' };
  const actions = enrichFreeActions([...actionsOf(chapter1), ...actionsOf(chapter2)]);
  for (const action of actions) {
    const fixed = action.risk.filter((effect) => effect.t === 'param').map((effect) => `${names[effect.key]}が${Math.abs(effect.delta)}${effect.delta >= 0 ? '増す' : '下がる'}`);
    const conditional = action.scenes.focus.options.map((option) => {
      const effects = option.effects.filter((effect) => effect.t === 'param').map((effect) => `${names[effect.key]}が${Math.abs(effect.delta)}${effect.delta >= 0 ? '増す' : '下がる'}`);
      return effects.length ? `\n（「${option.label}」を選ぶと、さらに ${effects.join('、')}）` : '';
    }).join('');
    const expected = `${fixed.join('、')}${conditional}`;
    assert.equal(costDescription(action), expected, `${action.id}: ${costDescription(action)}`);
    for (const option of action.scenes.focus.options.filter((option) => option.effects.some((effect) => effect.t === 'param'))) {
      assert.match(costDescription(action), new RegExp(`「${option.label}」を選ぶと、さらに`), action.id);
    }
  }
});
test('全行動・全焦点で知りすぎを最大化しても第二章終了時に2を超えない', () => {
  const playEveryActionAtMostRiskyFocus = (chapter) => {
    const actions = enrichFreeActions(actionsOf(chapter));
    let current = { ...model(), remaining: actions.length };
    for (const action of actions) {
      current = selectFreeAction(current, action);
      const focus = [...action.scenes.focus.options].sort((a, b) => {
        const overknow = (option) => (option.effects || []).filter((effect) => effect.t === 'param' && effect.key === 'overknow').reduce((total, effect) => total + effect.delta, 0);
        return overknow(b) - overknow(a);
      })[0];
      current = focusFreeAction(current, focus.id);
      current = continueFreeAction(current, actions);
    }
    return current.effects.filter((effect) => effect.t === 'param' && effect.key === 'overknow').reduce((total, effect) => total + effect.delta, 0);
  };
  const chapter1Overknow = playEveryActionAtMostRiskyFocus(chapter1);
  const chapter2Overknow = playEveryActionAtMostRiskyFocus(chapter2);
  assert.equal(chapter1Overknow, 1);
  assert.equal(chapter2Overknow, 0);
  assert.ok(chapter1Overknow + chapter2Overknow <= 2);
});
test('危険の正本はシナリオ側だけで、詳細側には重複定義を置かない', () => {
  for (const [id, details] of Object.entries(actionDetails)) {
    assert.equal('risk' in details, false, `${id}: details.risk`);
    assert.equal('cost' in details, false, `${id}: details.cost`);
  }
  const actions = enrichFreeActions([...actionsOf(chapter1), ...actionsOf(chapter2)]);
  const paramsFor = (id) => actions.find((action) => action.id === id).risk.filter((effect) => effect.t === 'param').map(({ key, delta }) => [key, delta]);
  assert.deepEqual(paramsFor('accomplice_room'), [['suspicion', 6], ['trust', -1]]);
  assert.deepEqual(paramsFor('observe_detectives'), [['suspicion', 7], ['awareness', 1]]);
  assert.deepEqual(paramsFor('morgue'), [['suspicion', 9], ['overknow', 1]]);
});

test('以前は同じ効果だった4つの焦点二択は、片方だけ小さな代償を持つ', () => {
  const actions = enrichFreeActions([...actionsOf(chapter1), ...actionsOf(chapter2)]);
  for (const id of ['prepare', 'kitchen', 'morgue', 'old_road_song']) {
    const action = actions.find((item) => item.id === id);
    const paramCounts = action.scenes.focus.options.map((option) => option.effects.filter((effect) => effect.t === 'param').length);
    assert.deepEqual(paramCounts, [0, 1], id);
  }
});

test('偽アリバイ3〜7は焦点選択で取得でき、一周ですべてを取ることはできない', () => {
  const chapters = [chapter1, chapter2];
  const actions = enrichFreeActions(chapters.flatMap(actionsOf));
  const sources = new Map();
  for (const action of actions) {
    for (const option of action.scenes.focus.options) {
      for (const effect of option.effects.filter((entry) => entry.t === 'item' && /^alibi_[3-7]$/.test(entry.id))) {
        sources.set(effect.id, { action:action.id, focus:option.id });
      }
    }
  }
  assert.deepEqual([...sources.keys()].sort(), ['alibi_3', 'alibi_4', 'alibi_5', 'alibi_6', 'alibi_7']);
  assert.ok(new Set([...sources.values()].map(({ action }) => action)).size > 4, '4ブロックより多い行動へ分散する');
});

test('知らないふりの演じ直しは行動ブロックと良心を使い、知りすぎを下げる', () => {
  const action = enrichFreeActions(actionsOf(chapter2)).find((entry) => entry.id === 'cover_tracks');
  assert.ok(action);
  assert.deepEqual(action.risk, [{t:'param',key:'conscience',delta:-1}]);
  assert.ok(action.scenes.focus.options.every((option) => option.effects.some((effect) => effect.t === 'param' && effect.key === 'overknow' && effect.delta === -1)));
});

