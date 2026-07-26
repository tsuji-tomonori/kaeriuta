let openDialogs = 0;

export function isDialogOpen() {
  return openDialogs > 0;
}

function showDialog({ mount, title, body, okLabel, cancelLabel, danger, notice }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('section');
    overlay.className = 'dialog-overlay';
    overlay.setAttribute('role', 'presentation');

    const panel = document.createElement('div');
    panel.className = 'dialog-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');

    const heading = document.createElement('h2');
    heading.className = 'dialog-title';
    heading.textContent = title || (notice ? 'お知らせ' : '確認');
    const message = document.createElement('p');
    message.className = 'dialog-body';
    message.textContent = body || '';
    const actions = document.createElement('div');
    actions.className = 'dialog-actions';
    const ok = document.createElement('button');
    ok.type = 'button';
    ok.className = `dialog-ok${danger ? ' is-danger' : ''}`;
    ok.textContent = okLabel || 'OK';
    let cancel = null;
    if (!notice) {
      cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'dialog-cancel';
      cancel.textContent = cancelLabel || 'キャンセル';
      actions.append(cancel);
    }
    actions.append(ok);
    panel.append(heading, message, actions);
    overlay.append(panel);

    const previousFocus = document.activeElement;
    let settled = false;
    const finish = (accepted) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeydown, true);
      overlay.remove();
      openDialogs = Math.max(0, openDialogs - 1);
      previousFocus?.focus?.();
      resolve(notice ? undefined : accepted);
    };
    const onKeydown = (event) => {
      event.stopImmediatePropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        finish(true);
      }
    };

    ok.addEventListener('click', () => finish(true));
    cancel?.addEventListener('click', () => finish(false));
    overlay.addEventListener('click', (event) => {
      event.stopPropagation();
      if (event.target === overlay) finish(false);
    });
    overlay.addEventListener('pointerdown', (event) => event.stopPropagation());
    document.addEventListener('keydown', onKeydown, true);
    (mount || document.querySelector('#game-screen') || document.body).append(overlay);
    openDialogs += 1;
    ok.focus();
  });
}

export function showConfirm(options) {
  return showDialog({ ...options, notice: false });
}

export function showNotice(options) {
  return showDialog({ ...options, notice: true });
}
