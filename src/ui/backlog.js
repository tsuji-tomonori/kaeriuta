const MAX_ENTRIES = 300;

export function createBacklog({ mount } = {}) {
  const host = mount || document.querySelector('#game-screen') || document.body;
  const entries = [];
  const element = document.createElement('section');
  element.className = 'backlog-overlay';
  element.setAttribute('aria-hidden', 'true');

  const panel = document.createElement('aside');
  panel.className = 'backlog-panel';
  panel.setAttribute('aria-label', 'バックログ');
  const header = document.createElement('header');
  const title = document.createElement('h2');
  title.textContent = 'バックログ';
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'backlog-close';
  closeButton.setAttribute('aria-label', 'バックログを閉じる');
  closeButton.textContent = '×';
  const list = document.createElement('div');
  list.className = 'backlog-list';
  header.append(title, closeButton);
  panel.append(header, list);
  element.append(panel);

  let opened = false;
  const render = () => {
    list.replaceChildren();
    entries.forEach((entry) => {
      const row = document.createElement('article');
      row.className = `backlog-entry${entry.mono ? ' monologue' : ''}`;
      if (entry.sceneId) row.dataset.sceneId = entry.sceneId;
      const who = document.createElement('div');
      who.className = 'speaker';
      who.textContent = entry.who || (entry.mono ? '栞・モノローグ' : '');
      const text = document.createElement('p');
      text.className = 'backlog-text';
      text.textContent = entry.text;
      row.append(who, text);
      list.append(row);
    });
  };
  const onKeydown = (event) => {
    event.stopImmediatePropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      api.close();
    }
  };
  const stopEvent = (event) => event.stopPropagation();

  const api = {
    element,
    push({ who = '', text = '', mono = false, sceneId = '' } = {}) {
      entries.push({ who, text: String(text), mono: Boolean(mono), sceneId });
      if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
      if (opened) render();
    },
    open() {
      if (opened) {
        list.scrollTop = list.scrollHeight;
        return;
      }
      render();
      opened = true;
      element.setAttribute('aria-hidden', 'false');
      host.append(element);
      document.addEventListener('keydown', onKeydown, true);
      list.scrollTop = list.scrollHeight;
      closeButton.focus();
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
    clear() {
      entries.length = 0;
      list.replaceChildren();
    },
  };

  closeButton.addEventListener('click', () => api.close());
  element.addEventListener('click', (event) => {
    event.stopPropagation();
    if (event.target === element) api.close();
  });
  element.addEventListener('pointerdown', stopEvent);
  return api;
}
