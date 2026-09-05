import test from 'node:test';
import assert from 'node:assert/strict';
import { showConfirm, showNotice, isDialogOpen } from '../src/ui/dialog.js';

// Minimal DOM adapter: exercise the real dialog handlers without a browser.
function dialogDocument() {
  const nodes = [];
  const listeners = new Map();
  const doc = {
    activeElement: null,
    createElement() {
      const node = {
        children: [], listeners: new Map(), attributes: {},
        append(...children) { this.children.push(...children); },
        setAttribute(key, value) { this.attributes[key] = value; },
        addEventListener(key, handler) { this.listeners.set(key, handler); },
        focus() { doc.activeElement = this; },
        remove() { this.removed = true; },
      };
      nodes.push(node);
      return node;
    },
    addEventListener(key, handler) { listeners.set(key, handler); },
    removeEventListener(key) { listeners.delete(key); },
    key(key, shiftKey = false) {
      listeners.get('keydown')?.({ key, shiftKey, preventDefault() {}, stopImmediatePropagation() {} });
    },
    find(className) { return nodes.find((node) => node.className === className); },
  };
  doc.body = doc.createElement();
  return doc;
}

test('探索の終了確認でキャンセルにTab移動してEnterを押しても終了しない', async (t) => {
  const doc = dialogDocument();
  const previous = globalThis.document;
  globalThis.document = doc;
  t.after(() => { globalThis.document = previous; });
  const result = showConfirm({ mount: doc.body, title: '自由行動を切り上げますか？' });
  assert.equal(isDialogOpen(), true);
  doc.key('Tab', true);
  assert.equal(doc.activeElement, doc.find('dialog-cancel'));
  doc.key('Enter');
  assert.equal(await result, false);
  assert.equal(isDialogOpen(), false);
});

test('遊び方の長文へTab移動でき、説明を閉じると元の操作へフォーカスが戻る', async (t) => {
  const doc = dialogDocument();
  const previous = globalThis.document;
  globalThis.document = doc;
  t.after(() => { globalThis.document = previous; });
  const help = doc.createElement();
  help.focus();
  const result = showNotice({ mount: doc.body, title: '遊び方・目的', body: '基本操作' });
  doc.key('Tab');
  assert.equal(doc.activeElement, doc.find('dialog-body'));
  assert.equal(doc.activeElement.tabIndex, 0);
  doc.key('Tab');
  assert.equal(doc.activeElement, doc.find('dialog-ok'));
  doc.key('Escape');
  await result;
  assert.equal(doc.activeElement, help);
  assert.equal(isDialogOpen(), false);
});
