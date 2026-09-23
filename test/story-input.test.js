import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGameKeydown } from '../src/main.js';

function fixture(overrides = {}) {
  const calls = [];
  const session = {
    screen: { choice: { children: [] } },
    backlog: { isOpen: () => false },
    notebook: { isOpen: () => false, toggle: () => calls.push('notebook') },
    playback: { toggleAuto: () => calls.push('auto'), toggleSkip: () => calls.push('skip'), stop: () => calls.push('stop') },
    manualAdvance: () => calls.push('advance'),
    openSave: () => calls.push('save'), openLoad: () => calls.push('load'),
    ...overrides,
  };
  const press = (key, extra = {}) => handleGameKeydown({ key, target: { tagName: 'DIV' }, preventDefault: () => calls.push('preventDefault'), ...extra }, session);
  return { session, calls, press };
}

test('自由行動等の特殊パート中は本文送りとオート・スキップへ入力を渡さない', () => {
  const { press, calls } = fixture({ partActive: true });
  for (const key of [' ', 'Enter', 'a', 'A', 'Control']) press(key);
  assert.deepEqual(calls, []);
});

test('特殊パート終了後は本文操作が復帰し、特殊パート中の明示的セーブも残す', () => {
  const { session, press, calls } = fixture({ partActive: true });
  press('s');
  assert.deepEqual(calls, ['preventDefault', 'save']);
  calls.length = 0;
  session.partActive = false;
  press('a'); press('Control'); press('Enter');
  assert.deepEqual(calls, ['preventDefault', 'auto', 'preventDefault', 'skip', 'preventDefault', 'advance']);
});

test('選択中・END・パート側で処理済みの入力を本文送りへ重ねて使わない', () => {
  for (const overrides of [{ endingActive: true }, { screen: { choice: { children: [{}] } } }]) {
    const { press, calls } = fixture(overrides);
    press('Enter'); press('a');
    assert.deepEqual(calls, []);
  }
  const { press, calls } = fixture();
  press('Enter', { defaultPrevented: true });
  assert.deepEqual(calls, []);
});
