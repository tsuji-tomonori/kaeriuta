import test from 'node:test';
import assert from 'node:assert/strict';
import { transitionCharacterPositions } from '../src/ui/character-state.js';
import { shouldShowAdvance } from '../src/ui/advance-visibility.js';

test('立ち絵は同じ位置でreplaceすると一人だけになる', () => {
  let positions = transitionCharacterPositions({}, { id: 'chara_goko', expr: 'normal', pos: 'left', action: 'fadeIn' });
  positions = transitionCharacterPositions(positions, { id: 'chara_saeki', expr: 'guarded', pos: 'left', action: 'replace' });
  assert.deepEqual(positions, { left: { id: 'chara_saeki', expr: 'guarded', action: 'replace' } });
});
test('立ち絵はfadeOutで位置を空にする', () => {
  const positions = transitionCharacterPositions({ center: { id: 'chara_uno', expr: 'kind' } }, { pos: 'center', action: 'fadeOut' });
  assert.deepEqual(positions, {});
});
test('立ち絵は3位置まで同時に保持できる', () => {
  let positions = {};
  for (const [pos, id] of [['left', 'a'], ['center', 'b'], ['right', 'c']]) positions = transitionCharacterPositions(positions, { id, expr: 'normal', pos, action: 'fadeIn' });
  assert.equal(Object.keys(positions).length, 3);
});
test('同じ人物を同じ位置に続けて表示しても要素状態は増えない', () => {
  let positions = transitionCharacterPositions({}, { id: 'chara_observer', expr: 'normal', pos: 'right', action: 'fadeIn' });
  positions = transitionCharacterPositions(positions, { id: 'chara_observer', expr: 'watch', pos: 'right', action: 'replace' });
  assert.equal(Object.keys(positions).length, 1);
});
test('次へは文章を送る場面だけに表示する', () => {
  assert.equal(shouldShowAdvance({ nodeType: 'say' }), true);
  assert.equal(shouldShowAdvance({ nodeType: 'mono' }), true);
  assert.equal(shouldShowAdvance({ nodeType: 'stage' }), true);
  assert.equal(shouldShowAdvance({ nodeType: 'choice', choicesActive: true }), false);
  assert.equal(shouldShowAdvance({ nodeType: 'say', partActive: true }), false);
  assert.equal(shouldShowAdvance({ nodeType: 'end', ending: true }), false);
});
