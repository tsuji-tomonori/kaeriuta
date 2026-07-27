import test from 'node:test';
import assert from 'node:assert/strict';
import { chapter1 } from '../src/data/scenario/chapter1.js';
import { chapter2 } from '../src/data/scenario/chapter2.js';
import { flags } from '../src/data/flags.js';
import { items } from '../src/data/items.js';
import { FREE_ACTION_PHASE, enrichFreeActions, selectFreeAction, focusFreeAction, continueFreeAction } from '../src/systems/freeaction/index.js';

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
test('全行動は見返り、代償、実際の危険を持ち、参照先が存在する', () => {
  const actions = enrichFreeActions([...actionsOf(chapter1), ...actionsOf(chapter2)]);
  assert.equal(actions.length, 11);
  for (const action of actions) {
    assert.ok(action.gain && action.cost && action.risk?.length, action.id);
    assert.ok(action.scenes?.focus?.options?.length, action.id);
    for (const effect of [...action.reward, ...action.scenes.focus.options.flatMap((option) => option.effects || [])]) {
      if (effect.t === 'flag') assert.ok(flags[effect.id], `${action.id}:${effect.id}`);
      if (effect.t === 'item') assert.ok(items[effect.id], `${action.id}:${effect.id}`);
    }
  }
});
test('代償文にあるパラメータは、連結後の risk と焦点の実効果に一致する', () => {
  const names = { suspicion:'疑い', trust:'信頼', awareness:'警戒', overknow:'知りすぎ', conscience:'良心' };
  const actions = enrichFreeActions([...actionsOf(chapter1), ...actionsOf(chapter2)]);
  for (const action of actions) {
    const actual = new Set([
      ...(action.risk || []),
      ...action.scenes.focus.options.flatMap((option) => option.effects || []),
    ].filter((effect) => effect.t === 'param').map((effect) => names[effect.key]));
    const mentioned = new Set(Object.values(names).filter((name) => action.cost.includes(name)));
    assert.deepEqual([...mentioned].sort(), [...actual].sort(), `${action.id}: ${action.cost}`);
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
  assert.equal(chapter2Overknow, 1);
  assert.ok(chapter1Overknow + chapter2Overknow <= 2);
});
test('シナリオ側の危険と追加の危険をどちらも保持する', () => {
  const actions = enrichFreeActions([...actionsOf(chapter1), ...actionsOf(chapter2)]);
  const paramsFor = (id) => actions.find((action) => action.id === id).risk.filter((effect) => effect.t === 'param').map(({ key, delta }) => [key, delta]);
  assert.deepEqual(paramsFor('accomplice_room'), [['suspicion', 6], ['trust', -1]]);
  assert.deepEqual(paramsFor('observe_detectives'), [['suspicion', 7], ['awareness', 1]]);
  assert.deepEqual(paramsFor('morgue'), [['suspicion', 9], ['overknow', 1]]);
});
