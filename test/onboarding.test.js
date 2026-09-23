import test from 'node:test';
import assert from 'node:assert/strict';
import { freeActionGoal, selectFreeAction, FREE_ACTION_PHASE } from '../src/systems/freeaction/index.js';
import { chapter1 } from '../src/data/scenario/chapter1.js';
import { chapter2 } from '../src/data/scenario/chapter2.js';

const actionsFor = (chapter) => chapter.nodes.find((node) => node.part === 'freeAction').args.actions;

test('最初の一手は実際に選べる行動を案内し、案内の参照では回数を消費しない', () => {
  const actions = actionsFor(chapter1);
  const model = { state: { flags: {}, items: [] }, remaining: 4, used: [], effects: [], phase: FREE_ACTION_PHASE.SELECTING };
  const before = structuredClone(model);
  const goal = freeActionGoal(1, actions, model.used);
  assert.ok(actions.includes(goal.suggested));
  assert.deepEqual(model, before);
  const selected = selectFreeAction(model, goal.suggested);
  assert.equal(selected.remaining, 3);
  assert.deepEqual(selected.used, [goal.suggested.id]);
});

test('行動を終えたら、実行済みの行動を最初の一手として勧め続けない', () => {
  const actions = actionsFor(chapter1);
  const initial = freeActionGoal(1, actions);
  const after = freeActionGoal(1, actions, [initial.suggested.id]);
  assert.equal(after.suggested, undefined);
  assert.ok(!after.next.includes(initial.suggested.label));
  assert.equal(freeActionGoal(1, []).suggested, undefined);
});

test('第二章はその章の実在する行動を案内し、直後のボード整理へつなぐ', () => {
  const actions = actionsFor(chapter2);
  const goal = freeActionGoal(2, actions);
  assert.ok(actions.includes(goal.suggested));
  assert.notEqual(goal.suggested.id, freeActionGoal(1, actionsFor(chapter1)).suggested.id);
  const freeIndex = chapter2.nodes.findIndex((node) => node.part === 'freeAction');
  const nextPart = chapter2.nodes.slice(freeIndex + 1).find((node) => node.t === 'call');
  assert.equal(nextPart.part, 'temariBoard');
  assert.match(goal.title, /手毬唄ボード/);
});
