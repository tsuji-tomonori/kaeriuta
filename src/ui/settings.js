import { loadSettings, saveSettings } from '../engine/progress.js';

export const SETTINGS_FIELDS = Object.freeze([
  { key: 'textSpeed', label: 'テキスト速度', type: 'range', min: 0.5, max: 2, step: 0.25, unit: '倍' },
  { key: 'autoWait', label: 'オート待ち時間', type: 'range', min: 0.5, max: 3, step: 0.25, unit: '秒' },
  { key: 'skipRead', label: '既読のみスキップ', type: 'checkbox' },
  { key: 'skipAll', label: '未読もスキップ', type: 'checkbox' },
  { key: 'explorationHints', label: '自由探索の事前ヒントを表示', type: 'checkbox' },
  { key: 'bgmVolume', label: 'BGM音量', type: 'range', min: 0, max: 1, step: 0.05, unit: '' },
  { key: 'seVolume', label: 'SE音量', type: 'range', min: 0, max: 1, step: 0.05, unit: '' },
  { key: 'muteAudio', label: '音声をミュート', type: 'checkbox' },
]);

function outputText(field, value) {
  if (field.type !== 'range') return '';
  return field.unit ? `${Number(value).toFixed(2)}${field.unit}` : `${Math.round(Number(value) * 100)}%`;
}

export function settingsControls(settings) {
  return SETTINGS_FIELDS.map((field) => (field.type === 'checkbox'
    ? `<label><span class="settings-label">${field.label}</span><input type="checkbox" data-setting="${field.key}" ${settings[field.key] ? 'checked' : ''}></label>`
    : `<label>${field.label}<input type="range" min="${field.min}" max="${field.max}" step="${field.step}" value="${settings[field.key]}" data-setting="${field.key}"><output data-output="${field.key}">${outputText(field, settings[field.key])}</output></label>`
  )).join('');
}

export function bindSettingsControls(root, { storage = globalThis.localStorage, onChange = () => {} } = {}) {
  root.querySelectorAll('[data-setting]').forEach((input) => {
    input.addEventListener('input', () => {
      const key = input.dataset.setting;
      const value = input.type === 'checkbox' ? input.checked : Number(input.value);
      const settings = saveSettings({ [key]: value }, storage);
      const field = SETTINGS_FIELDS.find((entry) => entry.key === key);
      const output = root.querySelector(`[data-output="${key}"]`);
      if (output && field) output.textContent = outputText(field, settings[key]);
      onChange(settings);
    });
  });
}

export function openSettings({ mount, onChange = () => {}, storage = globalThis.localStorage } = {}) {
  let open = true;
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay kaeriuta-settings';
  overlay.innerHTML = `<section class="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <h2 id="settings-title" class="dialog-title">プレイ設定</h2>
    <div class="kaeriuta-settings__controls">${settingsControls(loadSettings(storage))}</div>
    <div class="dialog-actions"><button type="button" class="dialog-ok">閉じる</button></div>
  </section>`;
  mount.append(overlay);
  const close = () => {
    if (!open) return;
    open = false;
    overlay.remove();
  };
  overlay.querySelector('.dialog-ok').onclick = close;
  overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
  bindSettingsControls(overlay, { storage, onChange });
  overlay.querySelector('.dialog-ok').focus();
  return { close, isOpen: () => open };
}
