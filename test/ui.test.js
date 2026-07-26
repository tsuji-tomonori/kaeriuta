import test from 'node:test';
import assert from 'node:assert/strict';
import { transitionCharacterPositions } from '../src/ui/character-state.js';
import { shouldShowAdvance } from '../src/ui/advance-visibility.js';
import { explorationHintsEnabled, toggleExplorationHints } from '../src/ui/title.js';
import { setBackground } from '../src/ui/screen.js';
import { createChoice } from '../src/ui/choice.js';
import { createMessageWindow } from '../src/ui/message-window.js';
import { createCharacterLayer } from '../src/ui/character-layer.js';

class TestClassList {
  constructor(element) { this.element = element; this.values = new Set(); }
  set(value) { this.values = new Set(String(value).split(/\s+/).filter(Boolean)); }
  add(...values) { values.forEach((value) => this.values.add(value)); }
  remove(...values) { values.forEach((value) => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) {
    const enabled = force === undefined ? !this.contains(value) : force;
    if (enabled) this.add(value); else this.remove(value);
    return enabled;
  }
  toString() { return [...this.values].join(' '); }
}

function matchesSelector(element, selector) {
  const match = selector.match(/^\.([\w-]+)(?:\[data-([\w-]+)="([^"]+)"\])?$/);
  if (!match || !element.classList.contains(match[1])) return false;
  if (!match[2]) return true;
  const dataKey = match[2].replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  return element.dataset[dataKey] === match[3];
}

class TestElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.dataset = {};
    this.style = { setProperty(name, value) { this[name] = String(value); } };
    this.classList = new TestClassList(this);
    this.hidden = false;
    this.id = '';
    this.textContent = '';
  }
  set className(value) { this.classList.set(value); }
  get className() { return this.classList.toString(); }
  set innerHTML(value) {
    this.replaceChildren();
    if (!value.includes('message-window')) return;
    const box = new TestElement('section');
    box.className = 'message-window';
    box.hidden = true;
    for (const className of ['speaker', 'message-text', 'advance']) {
      const child = new TestElement(className === 'advance' ? 'button' : 'div');
      child.className = className;
      box.append(child);
    }
    this.append(box);
  }
  get firstElementChild() { return this.children[0] || null; }
  append(...elements) {
    for (const element of elements) {
      element.parentElement = this;
      this.children.push(element);
    }
  }
  replaceChildren(...elements) {
    this.children.forEach((child) => { child.parentElement = null; });
    this.children = [];
    this.append(...elements);
  }
  remove() {
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    this.parentElement = null;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const found = [];
    const visit = (element) => {
      for (const child of element.children) {
        if (matchesSelector(child, selector)) found.push(child);
        visit(child);
      }
    };
    visit(this);
    return found;
  }
  addEventListener() {}
  focus() { globalThis.document.activeElement = this; }
  getContext() {
    return {
      createLinearGradient: () => ({ addColorStop() {} }),
      fillRect() {}, strokeRect() {}, fillText() {},
    };
  }
  toDataURL() { return 'data:image/png;base64,test'; }
}

globalThis.document = {
  activeElement: null,
  createElement: (tagName) => new TestElement(tagName),
};

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
test('自由探索の事前ヒントは初期OFFで任意に切り替えられる', () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.equal(explorationHintsEnabled(storage), false);
  assert.equal(toggleExplorationHints(storage), true);
  assert.equal(explorationHintsEnabled(storage), true);
  assert.equal(toggleExplorationHints(storage), false);
});

test('同じ背景srcの再指定では表示レイヤーが増えない', () => {
  const background = new TestElement();
  background.id = 'background';
  setBackground(background, 'assets/bg/test.png');
  setBackground(background, 'assets/bg/test.png', { transition: 'dissolve' });
  assert.equal(background.querySelectorAll('.visual-layer').length, 1);
});

test('選択肢clear後はレイヤー直下の子が0になる', () => {
  const container = new TestElement();
  const choices = createChoice(container);
  choices.show('どちらを選ぶ？', [{ label: '左' }, { label: '右' }], () => {});
  assert.equal(container.children.length, 1);
  choices.clear();
  assert.equal(container.children.length, 0);
});

test('文字送りはcompleteRevealで全文表示へ遷移する', () => {
  const container = new TestElement();
  const message = createMessageWindow(container, () => {});
  message.show('鬼灯 栞', '雨音が続いている。');
  assert.equal(message.isRevealing(), true);
  message.completeReveal();
  assert.equal(message.isRevealing(), false);
  assert.equal(container.querySelector('.message-text').textContent, '雨音が続いている。');
});

test('立ち絵レイヤーはsetSpeakerで話者と非話者を分ける', () => {
  const container = new TestElement();
  const layer = createCharacterLayer(container);
  assert.equal(typeof layer.setSpeaker, 'function');
  layer.show('chara_sogen', 'smile', 'left', 'fadeIn');
  layer.show('chara_uno', 'normal', 'right', 'fadeIn');
  layer.setSpeaker('sogen');
  const sogen = container.querySelector('.character-slot[data-position="left"]');
  const uno = container.querySelector('.character-slot[data-position="right"]');
  assert.equal(sogen.classList.contains('is-speaker'), true);
  assert.equal(sogen.classList.contains('is-muted'), false);
  assert.equal(uno.classList.contains('is-muted'), true);
});
