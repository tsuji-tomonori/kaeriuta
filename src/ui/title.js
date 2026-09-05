import { availableChapters, CONTINUE_SLOTS } from '../data/chapters.js';
import { explorationHintsEnabled, isMemoirUnlocked, loadProgress, loadSettings, saveSettings } from '../engine/progress.js';
import { listSaves } from '../engine/save.js';
import { openSaveMenu } from './save-menu.js';
import { bindSettingsControls, settingsControls } from './settings.js';
import { showPlayGuide } from './play-guide.js';

export const EXPLORATION_HINTS_KEY = 'kaeriuta-exploration-hints';
export { explorationHintsEnabled } from '../engine/progress.js';
let reasonSequence = 0;

export function toggleExplorationHints(storage = globalThis.localStorage) {
  const enabled = !explorationHintsEnabled(storage);
  saveSettings({ explorationHints: enabled }, storage);
  storage?.setItem(EXPLORATION_HINTS_KEY, enabled ? 'on' : 'off');
  return enabled;
}

function endingEffects(progress) {
  const cleared = progress.endings ?? {};
  return {
    a1: Boolean(cleared.a1_arrest),
    a2: Boolean(cleared.a2_escape),
    a3: Boolean(cleared.a3_puppet),
    a4: Boolean(cleared.a4_reversal),
    b1: Boolean(cleared.b1_true),
    b3: Boolean(cleared.b3_silenced),
    count: Object.keys(cleared).length,
  };
}

function decorations(effects) {
  const feathers = effects.b3
    ? Array.from({ length: effects.count }, (_, index) => (
      `<svg class="kaeriuta-title__feather" style="--feather:${index};--feather-y:${13 + (index % 2) * 4}%" viewBox="0 0 36 70" aria-hidden="true"><path d="M29 3C11 12 4 31 8 62c12-16 21-36 21-59ZM8 62 30 8" /></svg>`
    )).join('')
    : '';
  return `
    <div class="kaeriuta-title__decor" aria-hidden="true">
      ${effects.a1 && !effects.b1 ? '<span class="kaeriuta-title__dark-window"></span>' : ''}
      ${effects.a2 ? '<span class="kaeriuta-title__distant-light"></span>' : ''}
      ${effects.a3 ? '<span class="kaeriuta-title__thread"></span>' : ''}
      ${effects.a4 && !effects.b1 ? '<span class="kaeriuta-title__hidden-room"></span>' : ''}
      ${feathers}
    </div>`;
}

function disabledReason(button, reason) {
  const reasonId = `kaeriuta-disabled-reason-${reasonSequence += 1}`;
  button.disabled = true;
  button.title = reason;
  button.setAttribute('aria-describedby', reasonId);
  const note = document.createElement('small');
  note.id = reasonId;
  note.className = 'kaeriuta-menu__disabled-reason';
  note.textContent = reason;
  button.after(note);
}

export function showTitle(root, {
  onStart,
  onContinue,
  onLoad,
  onChapter,
  onGallery,
} = {}) {
  const storage = globalThis.localStorage;
  const progress = loadProgress(storage);
  const settings = loadSettings(storage);
  settings.explorationHints = explorationHintsEnabled(storage);
  const effects = endingEffects(progress);
  const saves = listSaves(CONTINUE_SLOTS, storage);
  const latest = saves.filter((save) => save.exists).sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))[0];
  const chapterEntries = availableChapters(storage);
  const availableCount = chapterEntries.filter((chapter) => chapter.available).length;
  const backgroundClass = effects.b1 ? ' kaeriuta-title--hidden-room' : '';

  root.innerHTML = `
    <div class="letterbox kaeriuta-menu-frame">
      <section class="kaeriuta-title${backgroundClass}">
        ${decorations(effects)}
        <div class="kaeriuta-title__bookplate">
          <p class="kaeriuta-title__eyebrow">倒叙ミステリーアドベンチャー</p>
          <h1>帰り唄 <small>―手毬唄の館―</small></h1>
          <p class="kaeriuta-title__premise">あなたは殺人計画の共犯者。<br>隠し通すか、真実を話すか。</p>
          <nav class="kaeriuta-title__actions" aria-label="主メニュー">
            <button type="button" data-start>はじめから</button>
            <button type="button" data-play-guide>遊び方・目的</button>
            <button type="button" id="title-continue" data-continue>つづきから</button>
            <button type="button" data-load-menu>ロード</button>
            <button type="button" id="title-chapters" data-chapter-toggle>章選択</button>
            <div class="kaeriuta-title__chapters" data-chapter-list hidden></div>
            <button type="button" id="title-gallery" data-gallery>回想モード</button>
            ${isMemoirUnlocked(progress) ? '<button type="button" class="kaeriuta-title__memoir" data-memoir>律の手記</button>' : ''}
          </nav>
          <details class="kaeriuta-title__settings">
            <summary>プレイ設定</summary>
            ${settingsControls(settings)}
          </details>
        </div>
      </section>
    </div>`;

  root.querySelector('[data-start]').onclick = () => onStart?.();
  root.querySelector('[data-play-guide]').onclick = () => showPlayGuide({ mount: root.querySelector('.kaeriuta-menu-frame') });
  const continueButton = root.querySelector('[data-continue]');
  if (!latest) {
    disabledReason(continueButton, 'セーブデータがありません');
  } else {
    continueButton.onclick = () => {
      if (onContinue) onContinue();
      else onLoad?.(latest.slot);
    };
  }
  root.querySelector('[data-load-menu]').onclick = () => openSaveMenu({
    mount: root.querySelector('.kaeriuta-menu-frame') ?? root,
    mode: 'load',
    onLoad,
    onClose: () => {},
  });

  const chapterToggle = root.querySelector('[data-chapter-toggle]');
  const chapterList = root.querySelector('[data-chapter-list]');
  chapterEntries.forEach((chapter) => {
    const row = document.createElement('div');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = chapter.label;
    row.append(button);
    if (chapter.available) button.onclick = () => onChapter?.(chapter.key);
    else disabledReason(button, 'まだ到達していません');
    chapterList.append(row);
  });
  if (!availableCount) {
    disabledReason(chapterToggle, '章の頭まで進むと選べます');
  } else {
    chapterToggle.onclick = () => {
      chapterList.hidden = !chapterList.hidden;
      chapterToggle.setAttribute('aria-expanded', String(!chapterList.hidden));
    };
  }

  const galleryButton = root.querySelector('[data-gallery]');
  if (!effects.count) disabledReason(galleryButton, 'ENDを1つ以上迎えると開きます');
  else galleryButton.onclick = () => onGallery?.();
  root.querySelector('[data-memoir]')?.addEventListener('click', () => onGallery?.());

  bindSettingsControls(root, {
    storage,
    onChange: (next) => {
      storage?.setItem(EXPLORATION_HINTS_KEY, next.explorationHints ? 'on' : 'off');
    },
  });
}
