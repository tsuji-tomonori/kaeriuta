import { AUTO_SLOT, SAVE_SLOTS, clearSave, listSaves, saveGame } from '../engine/save.js';

const ALL_SLOTS = [...SAVE_SLOTS, AUTO_SLOT];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function formatDate(epoch) {
  if (!epoch) return '日時不明（旧形式）';
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(epoch));
}

function slotLabel(slot) {
  return slot === AUTO_SLOT ? 'オートセーブ' : `スロット ${slot}`;
}

export function openSaveMenu({
  mount,
  mode,
  state,
  saveMeta,
  onLoad,
  onClose,
}) {
  const storage = globalThis.localStorage;
  const previous = mount.querySelector?.('.kaeriuta-save-overlay');
  previous?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'kaeriuta-save-overlay';
  overlay.innerHTML = `
    <section class="kaeriuta-save-menu" role="dialog" aria-modal="true" aria-labelledby="save-menu-title">
      <header>
        <p class="kaeriuta-menu__eyebrow">記録帖</p>
        <h2 id="save-menu-title">${mode === 'save' ? 'セーブ' : 'ロード'}</h2>
        <button type="button" class="kaeriuta-menu__close" data-close aria-label="閉じる">×</button>
      </header>
      <div class="kaeriuta-save-menu__slots" data-slots></div>
      <div class="kaeriuta-confirm" data-confirm hidden></div>
    </section>`;
  mount.append(overlay);

  const close = () => {
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
    onClose?.();
  };
  const onKeydown = (event) => { if (event.key === 'Escape') close(); };
  document.addEventListener('keydown', onKeydown);
  overlay.querySelector('[data-close]').onclick = close;
  overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });

  const ask = (message, action) => {
    const box = overlay.querySelector('[data-confirm]');
    box.hidden = false;
    box.innerHTML = `
      <div role="alertdialog" aria-modal="true">
        <p>${escapeHtml(message)}</p>
        <div>
          <button type="button" data-confirm-yes>はい</button>
          <button type="button" data-confirm-no>いいえ</button>
        </div>
      </div>`;
    box.querySelector('[data-confirm-no]').onclick = () => { box.hidden = true; };
    box.querySelector('[data-confirm-yes]').onclick = () => {
      box.hidden = true;
      action();
    };
    box.querySelector('[data-confirm-no]').focus();
  };

  const render = () => {
    const saves = listSaves(ALL_SLOTS, storage);
    const list = overlay.querySelector('[data-slots]');
    list.innerHTML = '';
    saves.forEach((save) => {
      const row = document.createElement('article');
      row.className = `kaeriuta-save-slot${save.exists ? '' : ' is-empty'}`;
      const meta = save.meta;
      row.innerHTML = `
        <div class="kaeriuta-save-slot__heading">
          <h3>${slotLabel(save.slot)}</h3>
          <time>${save.exists ? escapeHtml(formatDate(save.savedAt)) : '空きスロット'}</time>
        </div>
        ${save.exists ? `
          <p><strong>${escapeHtml(meta.chapter)}</strong> ／ ${escapeHtml(meta.sceneId)}</p>
          <p>疑惑 ${escapeHtml(meta.suspicion)}　確信 ${escapeHtml(meta.conviction)}</p>
          <p>🕯 ${escapeHtml(meta.past)}　📜 ${escapeHtml(meta.plan)}　👁 ${escapeHtml(meta.alive)}</p>
          ${meta.resume === 'part-start' ? `<p class="kaeriuta-save-slot__resume">特殊パートの直前（${escapeHtml(meta.partName ?? '特殊パート')}）</p>` : ''}
        ` : '<p class="kaeriuta-save-slot__empty">まだ記録はありません</p>'}
        <div class="kaeriuta-save-slot__actions"></div>`;
      const actions = row.querySelector('.kaeriuta-save-slot__actions');
      const primary = document.createElement('button');
      primary.type = 'button';
      primary.textContent = mode === 'save' ? 'ここに保存' : 'ロード';
      if (mode === 'save') {
        if (save.slot === AUTO_SLOT) {
          primary.disabled = true;
          primary.title = 'オートセーブへは手動保存できません';
        } else {
          primary.onclick = () => {
            const write = () => { saveGame(save.slot, state, storage, saveMeta); render(); };
            if (save.exists) ask(`${slotLabel(save.slot)}を上書きしますか？`, write);
            else write();
          };
        }
      } else if (!save.exists) {
        primary.disabled = true;
        primary.title = '空きスロットはロードできません';
      } else {
        primary.onclick = () => { onLoad?.(save.slot); close(); };
      }
      actions.append(primary);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'kaeriuta-save-slot__delete';
      remove.textContent = '削除';
      remove.disabled = !save.exists;
      if (!save.exists) {
        remove.title = '削除する記録がありません';
        remove.setAttribute('aria-label', '削除（削除する記録がありません）');
      }
      else remove.onclick = () => ask(`${slotLabel(save.slot)}の記録を削除しますか？`, () => {
        clearSave(save.slot, storage);
        render();
      });
      actions.append(remove);
      list.append(row);
    });
  };

  render();
  overlay.querySelector('[data-close]').focus();
  return { close };
}
