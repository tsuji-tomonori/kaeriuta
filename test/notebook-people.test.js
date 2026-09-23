import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotebook, notebookPeople } from '../src/systems/notebook/index.js';
import { characters, detectiveNames } from '../src/data/characters.js';
import { prologue } from '../src/data/scenario/prologue.js';

const at = (index) => ({ sceneId: 'prologue', executionStack: [{ path: [], index }] });
const appearance = (id) => prologue.nodes.findIndex((node) => node.t === 'say' && node.who === id);

test('人物早見表は序章の11人だけで、後半のネタバレを含めない', () => {
  const people = notebookPeople({ sceneId: 'chapter1' });
  assert.deepEqual(people.map(({ id }) => id).sort(), ['goko', 'fujino', 'saeki', 'makabe', 'onda', 'uno', 'housekeeper', 'sogen', 'kogoro', 'ran', 'conan'].sort());
  for (const person of people) {
    assert.equal(person.name, characters[person.id].name);
    assert.ok(person.relation && person.note);
  }
  assert.doesNotMatch(JSON.stringify(people), /律|霧原|黒幕|真犯人|替え玉|入れ替わり|監禁|代筆|ゴーストライター|トヨ/);
});

test('人物は今回の登場位置で解禁し、前周の既読や未来の人物を出さない', () => {
  assert.deepEqual(notebookPeople(at(0)), []);
  for (const { id } of notebookPeople({ sceneId: 'chapter1' })) {
    const index = appearance(id);
    assert.ok(index >= 0);
    assert.ok(!notebookPeople({ ...at(index - 1), read: { prologue: { all: 1 } } }).some((p) => p.id === id));
    assert.ok(notebookPeople(at(index)).some((p) => p.id === id));
  }
  const branchIndex = prologue.nodes.findIndex((node) => node.t === 'if');
  assert.deepEqual(notebookPeople({ ...at(branchIndex), executionStack: [{ path: [], index: branchIndex }, { path: [branchIndex, 'then'], index: 0 }] }).map((p) => p.id), ['uno']);
});

test('表示名の差し替えは早見表にも反映する', (t) => {
  const original = { ...detectiveNames };
  t.after(() => Object.assign(detectiveNames, original));
  for (const id of Object.keys(detectiveNames)) detectiveNames[id] = `差替名-${id}`;
  for (const id of Object.keys(detectiveNames)) assert.equal(notebookPeople().find((p) => p.id === id).name, detectiveNames[id]);
});

// 手帳の実ハンドラを動かす最小DOM。ブラウザは起動しない。
function notebookDocument() {
  const listeners = new Map();
  const doc = {
    activeElement: null,
    querySelector() { return null; },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type) { listeners.delete(type); },
    key(key, target) { listeners.get('keydown')?.({ key, target, preventDefault() {}, stopImmediatePropagation() {} }); },
    createElement() {
      return {
        children: [], attributes: {}, listeners: new Map(), dataset: {}, selectors: new Map(),
        append(...children) { this.children.push(...children); },
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(type, listener) { this.listeners.set(type, listener); },
        querySelector(selector) { return this.selectors.get(selector) || null; },
        focus() { doc.activeElement = this; },
        remove() { this.removed = true; },
        set innerHTML(html) {
          this.html = html;
          this.selectors = new Map([['.notebook-close', doc.createElement()]]);
          for (const name of ['records', 'people']) {
            const button = doc.createElement();
            button.dataset.notebookTab = name;
            this.selectors.set(`[data-notebook-tab="${name}"]`, button);
            this.selectors.set(`[data-notebook-panel="${name}"]`, doc.createElement());
          }
        },
      };
    },
  };
  doc.head = doc.createElement();
  doc.body = doc.createElement();
  return doc;
}

test('記録と人物をクリック・矢印キーで切り替え、更新と再表示でも選択を保つ', (t) => {
  const previous = globalThis.document;
  const doc = notebookDocument();
  globalThis.document = doc;
  t.after(() => { globalThis.document = previous; });
  let state = at(0);
  const notebook = createNotebook({ mount: doc.body, getState: () => state });
  notebook.open();
  const panel = notebook.element.children[0];
  const tab = (name) => panel.querySelector(`[data-notebook-tab="${name}"]`);
  const content = (name) => panel.querySelector(`[data-notebook-panel="${name}"]`);
  assert.equal(content('records').hidden, false);
  assert.equal(content('people').hidden, true);
  assert.match(panel.html, /証言ログ/);
  assert.match(panel.html, /フラグ手帳/);
  assert.match(panel.html, /証拠カード/);
  assert.match(panel.html, /出会った人を/);
  tab('people').listeners.get('click')();
  assert.equal(content('people').hidden, false);
  assert.equal(content('records').hidden, true);
  assert.equal(tab('people').attributes['aria-selected'], 'true');
  doc.key('ArrowLeft', tab('people'));
  assert.equal(content('records').hidden, false);
  assert.equal(doc.activeElement, tab('records'));
  doc.key('End', tab('records'));
  assert.equal(content('people').hidden, false);
  state = { sceneId: 'chapter1' };
  notebook.refresh();
  assert.equal(content('people').hidden, false);
  assert.match(panel.html, /鬼灯 剛蔵/);
  notebook.close();
  notebook.open();
  assert.equal(content('people').hidden, false);
  doc.key('Escape', tab('people'));
  assert.equal(notebook.isOpen(), false);
});
