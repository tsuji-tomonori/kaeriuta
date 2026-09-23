import { ensurePartsCss, stateOf, displayText } from '../common.js';
import { flags } from '../../data/flags.js';
import { items } from '../../data/items.js';
import { characters } from '../../data/characters.js';
import { prologue } from '../../data/scenario/prologue.js';

const notebookByMount = new WeakMap();
const installationByMount = new WeakMap();
let notebookSequence = 0;

// 序章で栞が知っている関係だけを記す。後の章の情報では更新しない。
const people = [
  { id: 'goko', relation: '長兄', note: '空のグラスを手に、笑って客を迎える。' },
  { id: 'fujino', relation: '姉', note: '到着した私のコートを受け取ってくれた。' },
  { id: 'saeki', relation: '母の主治医', note: '母のことを、今も申し訳なく思っていると言う。' },
  { id: 'makabe', relation: '兄の担当編集者', note: '祝いの席で、皆の飲み物や椅子に気を配る。' },
  { id: 'onda', relation: '兄の祝いの招待客', note: '初版本を読み込み、兄の新作や唄の出どころをたずねる。' },
  { id: 'uno', relation: '実家の館を預かる人', note: '昔から私を「お嬢さま」と呼ぶ。' },
  { id: 'housekeeper', relation: '実家の家政婦', note: '祝いの席で、兄に頼まれて手毬唄を読む。' },
  { id: 'sogen', relation: '兄', note: '小説家。今夜はこの館で還暦を祝う。' },
  { id: 'kogoro', relation: '兄が招いた探偵', note: '大きな声で、自ら名探偵と名乗る。' },
  { id: 'ran', relation: '探偵の娘・招待客', note: '父の声をたしなめ、丁寧に挨拶する。' },
  { id: 'conan', relation: '探偵一行と来た少年', note: '初対面の私を「お姉さん」と呼ぶ。' },
];

export function notebookPeople(state = {}) {
  // 現在の周回の進行位置を使い、既読情報による先の人物の表示を避ける。
  const index = state.executionStack?.[0]?.index ?? -1;
  return people.filter(({ id }) => state.sceneId !== 'prologue'
    || prologue.nodes.findIndex((node) => node.t === 'say' && node.who === id) <= index)
    .map((person) => ({ ...person, name: characters[person.id].name }));
}

function escapePersonText(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

export function findContradictions(entries) {
  const seen = new Map();
  const bad = [];
  for (const entry of entries) {
    const key = `${entry.who || ''}:${entry.question || entry.key || ''}`;
    if (seen.has(key) && seen.get(key).answer !== entry.answer) {
      bad.push(entry.id || key, seen.get(key).id || key);
    } else {
      seen.set(key, entry);
    }
  }
  return [...new Set(bad)];
}

export function addTestimony(ctx, entry) {
  const state = stateOf(ctx);
  state.testimonyLog ??= [];
  state.testimonyLog.push({
    ...entry,
    id: entry.id || `${Date.now()}-${state.testimonyLog.length}`,
  });
  return state.testimonyLog.at(-1);
}

function defaultMount() {
  return document.querySelector('#game-screen') || document.body;
}

export function createNotebook({ mount, getState } = {}) {
  ensurePartsCss();
  const host = mount || defaultMount();
  const readState = getState || (() => stateOf({}));
  const element = document.createElement('section');
  element.className = 'notebook-overlay';
  element.setAttribute('aria-hidden', 'true');

  const panel = document.createElement('aside');
  panel.className = 'notebook notebook-panel';
  panel.setAttribute('aria-label', '手帳');
  element.append(panel);

  const id = `notebook-${++notebookSequence}`;
  let activeTab = 'records';
  const selectTab = (tab, focus = false) => {
    activeTab = tab;
    for (const name of ['records', 'people']) {
      const button = panel.querySelector(`[data-notebook-tab="${name}"]`);
      const content = panel.querySelector(`[data-notebook-panel="${name}"]`);
      button?.setAttribute('aria-selected', String(name === tab));
      button?.setAttribute('tabindex', name === tab ? '0' : '-1');
      if (content) content.hidden = name !== tab;
      if (focus && name === tab) button?.focus();
    }
  };
  let opened = false;
  const onKeydown = (event) => {
    event.stopImmediatePropagation();
    if (event.target?.dataset?.notebookTab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      selectTab(event.key === 'Home' ? 'records' : event.key === 'End' ? 'people' : activeTab === 'records' ? 'people' : 'records', true);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      api.close();
    }
  };

  const render = () => {
    const state = readState() || {};
    const log = [
      ...Object.entries(state.logs || {}).map(([key, answer]) => ({
        id: `saved-${key}`, key, answer, who: '栞', question: key,
      })),
      ...(state.testimonyLog || []),
    ];
    const contradictions = findContradictions(log);
    const line = (name) => Object.values(flags)
      .filter((flag) => flag.line === name)
      .map((flag) => `<li>${state.flags?.[name]?.includes(flag.id) ? displayText(flag.name, '?') : '?'}</li>`)
      .join('');
    const testimony = log.map((entry) => {
      const key = entry.id || `${entry.who || ''}:${entry.question || entry.key || ''}`;
      const className = contradictions.includes(key) ? 'notebook-testimony contradiction' : 'notebook-testimony';
      return `<p class="${className}"><strong>${displayText(entry.who, '栞')}</strong><span>${displayText(entry.question ?? entry.key)}</span><em>${displayText(entry.answer)}</em></p>`;
    }).join('') || '<p class="notebook-empty">記録なし</p>';
    const evidence = (state.items || []).map((id) => (
      `<li><strong>${displayText(items[id]?.name, id)}</strong><span>${displayText(items[id]?.desc, '入手経路は記録待ち')}</span></li>`
    )).join('') || '<li class="notebook-empty">記録なし</li>';
    const peopleCards = notebookPeople(state).map((person) => `
      <li><h3>${escapePersonText(person.name)}</h3><p class="notebook-person-relation">${escapePersonText(person.relation)}</p><p>${escapePersonText(person.note)}</p></li>
    `).join('') || '<li class="notebook-empty">出会った人を、ここに記していく。</li>';

    panel.innerHTML = `
      <header class="notebook-header">
        <h2>手帳</h2>
        <button type="button" class="notebook-close" aria-label="手帳を閉じる">×</button>
      </header>
      <div class="notebook-tabs" role="tablist" aria-label="手帳の項目">
        <button type="button" role="tab" id="${id}-records-tab" aria-controls="${id}-records" data-notebook-tab="records">記録</button>
        <button type="button" role="tab" id="${id}-people-tab" aria-controls="${id}-people" data-notebook-tab="people">人物</button>
      </div>
      <div class="notebook-content" role="tabpanel" id="${id}-records" aria-labelledby="${id}-records-tab" data-notebook-panel="records" tabindex="0">
        <section class="notebook-section">
          <h3>証言ログ</h3>
          <div class="notebook-testimonies">${testimony}</div>
        </section>
        <section class="notebook-section">
          <h3>フラグ手帳</h3>
          <div class="flag-lines notebook-flag-lines">
            <section><h4>🕯 過去</h4><ul>${line('past')}</ul></section>
            <section><h4>📜 計画</h4><ul>${line('plan')}</ul></section>
            <section><h4>👁 生存</h4><ul>${line('alive')}</ul></section>
          </div>
        </section>
        <section class="notebook-section">
          <h3>証拠カード</h3>
          <ul class="notebook-evidence">${evidence}</ul>
        </section>
      </div>
      <div class="notebook-content" role="tabpanel" id="${id}-people" aria-labelledby="${id}-people-tab" data-notebook-panel="people" tabindex="0" hidden>
        <h3>人物早見表</h3>
        <ul class="notebook-people">${peopleCards}</ul>
      </div>`;
    panel.querySelector('.notebook-close')?.addEventListener('click', () => api.close());
    for (const tab of ['records', 'people']) {
      panel.querySelector(`[data-notebook-tab="${tab}"]`)?.addEventListener('click', () => selectTab(tab));
    }
    selectTab(activeTab);
  };

  const api = {
    element,
    open() {
      render();
      if (opened) return;
      opened = true;
      element.setAttribute('aria-hidden', 'false');
      host.append(element);
      document.addEventListener('keydown', onKeydown, true);
      panel.querySelector('.notebook-close')?.focus();
    },
    close() {
      if (!opened) return;
      opened = false;
      document.removeEventListener('keydown', onKeydown, true);
      element.remove();
      element.setAttribute('aria-hidden', 'true');
    },
    toggle() {
      if (opened) api.close();
      else api.open();
    },
    isOpen() {
      return opened;
    },
    refresh() {
      render();
    },
  };

  element.addEventListener('click', (event) => {
    event.stopPropagation();
    if (event.target === element) api.close();
  });
  element.addEventListener('pointerdown', (event) => event.stopPropagation());
  return api;
}

export function openNotebook(ctx = {}) {
  const mount = ctx.mount || defaultMount();
  let entry = notebookByMount.get(mount);
  if (!entry) {
    entry = { ctx, controller: null };
    entry.controller = createNotebook({ mount, getState: () => stateOf(entry.ctx) });
    notebookByMount.set(mount, entry);
  } else {
    entry.ctx = ctx;
  }
  entry.controller.open();
  return entry.controller.element;
}

export const notebook = {
  async start(ctx) {
    return { effects: [], element: openNotebook(ctx) };
  },
};

export function installNotebook(ctx = {}) {
  ensurePartsCss();
  const mount = ctx.mount || defaultMount();
  const existing = installationByMount.get(mount);
  if (existing) {
    const notebookEntry = notebookByMount.get(mount);
    if (notebookEntry) notebookEntry.ctx = ctx;
    return existing;
  }
  let entry = notebookByMount.get(mount);
  if (!entry) {
    entry = { ctx, controller: null };
    entry.controller = createNotebook({ mount, getState: () => stateOf(entry.ctx) });
    notebookByMount.set(mount, entry);
  } else {
    entry.ctx = ctx;
  }
  const controller = entry.controller;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'notebook-launch';
  button.textContent = '手帳 [N]';
  const onClick = () => controller.toggle();
  const onKeydown = (event) => {
    if (event.key?.toLowerCase() === 'n' && !event.repeat) controller.toggle();
  };
  button.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeydown);
  mount.append(button);
  button.dispose = () => {
    document.removeEventListener('keydown', onKeydown);
    button.removeEventListener('click', onClick);
    controller.close();
    button.remove();
    installationByMount.delete(mount);
  };
  button.notebook = controller;
  installationByMount.set(mount, button);
  return button;
}
