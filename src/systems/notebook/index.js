import { ensurePartsCss, stateOf, displayText } from '../common.js';
import { flags } from '../../data/flags.js';
import { items } from '../../data/items.js';

const notebookByMount = new WeakMap();
const installationByMount = new WeakMap();

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

  let opened = false;
  const onKeydown = (event) => {
    event.stopImmediatePropagation();
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

    panel.innerHTML = `
      <header class="notebook-header">
        <h2>手帳</h2>
        <button type="button" class="notebook-close" aria-label="手帳を閉じる">×</button>
      </header>
      <div class="notebook-content">
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
      </div>`;
    panel.querySelector('.notebook-close')?.addEventListener('click', () => api.close());
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
