const BUTTONS = [
  ['save', 'セーブ', 'onSave'],
  ['load', 'ロード', 'onLoad'],
  ['notebook', '手帳', 'onNotebook'],
  ['backlog', 'ログ', 'onBacklog'],
  ['skip', 'スキップ', 'onSkip'],
  ['auto', 'オート', 'onAuto'],
  ['config', '設定', 'onConfig'],
  ['help', '遊び方', 'onHelp'],
  ['title', 'タイトルへ', 'onTitle'],
];

function number(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

export function createHud(container, handlers = {}) {
  const element = document.createElement('section');
  element.className = 'hud-root';
  element.setAttribute('aria-label', 'ゲーム操作');

  const status = document.createElement('div');
  status.className = 'hud-status';
  const values = {};
  [
    ['suspicion', '疑惑', '疑'],
    ['conviction', '確信', '確'],
    ['past', '過去の手掛かり', '🕯'],
    ['plan', '計画の手掛かり', '📜'],
    ['alive', '生存の手掛かり', '👁'],
  ].forEach(([key, label, icon]) => {
    const item = document.createElement('span');
    item.className = 'hud-value';
    item.title = label;
    const mark = document.createElement('span');
    mark.className = 'hud-value-mark';
    mark.textContent = icon;
    const value = document.createElement('span');
    value.textContent = '0';
    item.append(mark, value);
    status.append(item);
    values[key] = value;
  });

  const actions = document.createElement('div');
  actions.className = 'hud-actions';
  const buttons = {};
  BUTTONS.forEach(([key, label, handler]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `hud-button hud-${key}`;
    button.textContent = label;
    button.addEventListener('click', () => handlers[handler]?.());
    if (key === 'skip' || key === 'auto') button.setAttribute('aria-pressed', 'false');
    actions.append(button);
    buttons[key] = button;
  });

  element.append(status, actions);
  container.replaceChildren(element);

  return {
    element,
    render(state = {}) {
      values.suspicion.textContent = String(number(state.params?.suspicion));
      values.conviction.textContent = String(number(state.params?.conviction));
      values.past.textContent = String(state.flags?.past?.length ?? 0);
      values.plan.textContent = String(state.flags?.plan?.length ?? 0);
      values.alive.textContent = String(state.flags?.alive?.length ?? 0);
    },
    setModes({ skip = false, auto = false } = {}) {
      buttons.skip.classList.toggle('is-active', Boolean(skip));
      buttons.auto.classList.toggle('is-active', Boolean(auto));
      buttons.skip.setAttribute('aria-pressed', String(Boolean(skip)));
      buttons.auto.setAttribute('aria-pressed', String(Boolean(auto)));
    },
    setEnabled({ save = true, notebook = true, backlog = true, skip = true, auto = true } = {}) {
      const enabled = { save, notebook, backlog, skip, auto };
      Object.entries(enabled).forEach(([key, value]) => {
        buttons[key].disabled = !value;
        if (!value) {
          buttons[key].title = key === 'save'
            ? '特殊パート中は途中状態を保存できません'
            : '現在はこの操作を利用できません';
        } else {
          buttons[key].removeAttribute('title');
        }
      });
    },
  };
}
