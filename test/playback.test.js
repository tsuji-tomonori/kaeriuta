import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayback } from '../src/engine/playback.js';

function fakeTimers() {
  let nextId = 1;
  const pending = new Map();
  return {
    setTimeout(fn, delay) {
      const id = nextId++;
      pending.set(id, { fn, delay });
      return id;
    },
    clearTimeout(id) {
      pending.delete(id);
    },
    delays() {
      return [...pending.values()].map(({ delay }) => delay);
    },
    runNext() {
      const [id, task] = pending.entries().next().value || [];
      if (!task) return false;
      pending.delete(id);
      task.fn();
      return true;
    },
  };
}

function setup(settings = {}) {
  const timers = fakeTimers();
  let advances = 0;
  const playback = createPlayback({
    advance: () => { advances += 1; },
    getSettings: () => settings,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
  });
  return { timers, playback, advances: () => advances };
}

test('オートの待ち時間は文字数に比例する', () => {
  const { timers, playback } = setup({ autoWait: 1 });
  playback.notify({ nodeType: 'say', textLength: 10, read: true });
  playback.toggleAuto();
  assert.deepEqual(timers.delays(), [1050]);
  playback.notify({ nodeType: 'say', textLength: 20, read: true });
  assert.deepEqual(timers.delays(), [1500]);
});

test('文字送り演出中はオート送りのタイマーを開始しない', () => {
  const { timers, playback, advances } = setup();
  playback.notify({ nodeType: 'say', textLength: 8, revealing: true, read: true });
  playback.toggleAuto();
  assert.deepEqual(timers.delays(), []);
  playback.notify({ revealing: false });
  assert.deepEqual(timers.delays(), [960]);
  timers.runNext();
  assert.equal(advances(), 1);
});

test('選択肢が出現するとオートとスキップを解除する', () => {
  const { playback } = setup({ skipAll: true });
  playback.notify({ nodeType: 'say', textLength: 1, read: true });
  playback.toggleAuto();
  playback.notify({ nodeType: 'choice', choicesActive: true });
  assert.deepEqual(playback.modes, { skip: false, auto: false });

  playback.notify({ nodeType: 'say', choicesActive: false, read: true });
  playback.toggleSkip();
  playback.notify({ nodeType: 'choice', choicesActive: true });
  assert.deepEqual(playback.modes, { skip: false, auto: false });
});

test('call ノードの開始で再生モードを解除する', () => {
  const { playback } = setup({ skipAll: true });
  playback.notify({ nodeType: 'say', textLength: 1, read: true });
  playback.toggleAuto();
  playback.notify({ nodeType: 'call' });
  assert.deepEqual(playback.modes, { skip: false, auto: false });
});

test('skipAll:false では未読ノードに到達するとスキップを止める', () => {
  const { timers, playback } = setup({ skipAll: false });
  playback.notify({ nodeType: 'say', nodeKey: 'read-1', read: true });
  playback.toggleSkip();
  assert.deepEqual(timers.delays(), [24]);
  playback.notify({ nodeType: 'say', nodeKey: 'unread-1', read: false });
  assert.equal(playback.modes.skip, false);
  assert.deepEqual(timers.delays(), []);
});

test('既読判定は注入された isReadNode を利用できる', () => {
  const timers = fakeTimers();
  const checked = [];
  const playback = createPlayback({
    advance: () => {},
    isReadNode: (nodeKey) => {
      checked.push(nodeKey);
      return nodeKey === 'known';
    },
    getSettings: () => ({ skipAll: false }),
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
  });
  playback.toggleSkip();
  playback.notify({ nodeType: 'say', nodeKey: 'known' });
  assert.equal(playback.modes.skip, true);
  assert.deepEqual(checked, ['known']);
  playback.notify({ nodeType: 'say', nodeKey: 'unknown' });
  assert.equal(playback.modes.skip, false);
});

test('END 到達でオートとスキップを止める', () => {
  const { playback } = setup({ skipAll: true });
  playback.notify({ nodeType: 'say', textLength: 1, read: true });
  playback.toggleAuto();
  playback.notify({ nodeType: 'end' });
  assert.deepEqual(playback.modes, { skip: false, auto: false });

  playback.notify({ nodeType: 'say', read: true });
  playback.toggleSkip();
  playback.notify({ nodeType: 'END' });
  assert.deepEqual(playback.modes, { skip: false, auto: false });
});
