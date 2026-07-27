import test from 'node:test';
import assert from 'node:assert/strict';
import { flags } from '../src/data/flags.js';
import { chapter1 } from '../src/data/scenario/chapter1.js';
import { chapter2 } from '../src/data/scenario/chapter2.js';
import { mansionRooms, isRoomRevealed, roomActionIndex, roomRect, roomStatus } from '../src/data/mansion-map.js';
import { selectRoom } from '../src/systems/freeaction/index.js';

const freeActions = (chapter) => chapter.nodes.find((node) => node.t === 'call' && node.part === 'freeAction').args.actions;

test('館の部屋IDは一意で、同一フロアの矩形は重ならない', () => {
  assert.equal(new Set(mansionRooms.map((room) => room.id)).size, mansionRooms.length);
  for (const floor of ['1f', '2f', 'under']) {
    const rooms = mansionRooms.filter((room) => room.floor === floor);
    for (let left = 0; left < rooms.length; left += 1) for (let right = left + 1; right < rooms.length; right += 1) {
      const a = roomRect(rooms[left]); const b = roomRect(rooms[right]);
      assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, `${rooms[left].id} / ${rooms[right].id}`);
    }
  }
});

test('地図の開示フラグと章の自由行動の部屋IDはデータ定義に存在する', () => {
  const roomIds = new Set(mansionRooms.map((room) => room.id));
  assert.ok(mansionRooms.every((room) => room.revealedBy === null || flags[room.revealedBy]));
  assert.ok([...freeActions(chapter1), ...freeActions(chapter2)].every((action) => roomIds.has(action.room)));
});

test('地図の表示・行動集計・部屋選択は状態を正しく扱う', () => {
  const basement = mansionRooms.find((room) => room.id === 'basement');
  assert.equal(isRoomRevealed(basement, { flags:{ past:[] } }), false);
  assert.equal(isRoomRevealed(basement, { flags:{ past:['basement_sound'] } }), true);
  const actions = [{ id:'a', room:'study' }, { id:'b', room:'study' }, { id:'c' }];
  assert.deepEqual(roomActionIndex(actions).study.map((action) => action.id), ['a', 'b']);
  assert.deepEqual(roomActionIndex(actions).__unassigned.map((action) => action.id), ['c']);
  assert.deepEqual(roomStatus(mansionRooms.find((room) => room.id === 'study'), actions, ['a', 'b'], { flags:{} }), { revealed:true, total:2, remaining:0, done:true });
  assert.equal(selectRoom({ selectedRoom:'study' }, 'kitchen').selectedRoom, 'kitchen');
  assert.equal(selectRoom({ selectedRoom:'study' }, 'missing').selectedRoom, 'study');
});
