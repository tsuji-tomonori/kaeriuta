import test from 'node:test';
import assert from 'node:assert/strict';
import { FREE_ACTION_PHASE, closeRoomPanel, openRoomPanel, selectFreeAction } from '../src/systems/freeaction/index.js';

function model() {
  return { state:{ flags:{ past:[], plan:[], alive:[] }, items:[] }, remaining:2, used:[], effects:[], phase:FREE_ACTION_PHASE.SELECTING, currentAction:null, focusResult:null, selectedRoom:'study', openRoomId:null };
}

test('存在しない部屋は子モーダルを開かず、モデルを変えない', () => {
  const current = model();
  assert.equal(openRoomPanel(current, '存在しない部屋'), current);
});

test('部屋の子モーダルからの行動選択はパネルを閉じ、ブロックを消費する', () => {
  const action = { id:'study', reward:[], risk:[], scenes:{ focus:{ options:[{ id:'page' }] } } };
  const current = selectFreeAction(openRoomPanel(model(), 'study'), action);
  assert.equal(current.openRoomId, null);
  assert.equal(current.remaining, 1);
  assert.deepEqual(current.used, ['study']);
});

test('部屋の子モーダルを閉じても自由行動を終了しない', () => {
  const current = closeRoomPanel(openRoomPanel(model(), 'study'));
  assert.equal(current.openRoomId, null);
  assert.notEqual(current.phase, FREE_ACTION_PHASE.FINISHED);
  assert.equal(current.phase, FREE_ACTION_PHASE.SELECTING);
});
