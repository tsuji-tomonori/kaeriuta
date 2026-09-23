import { boardCards } from '../../../src/data/temariuta-board.js';
export const text = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
export function observedTemari(modal) {
  return {
    face: modal.querySelector('[data-face][aria-pressed="true"]')?.dataset.face || 'show',
    notice: text(modal.querySelector('.board-notice')) || null,
    cards: [...modal.querySelectorAll('[data-card]')].map(button => ({
      id: button.dataset.card, name: boardCards[button.dataset.card]?.name || text(button),
      kinds: boardCards[button.dataset.card]?.kinds || [], note: boardCards[button.dataset.card]?.note || '',
      selected: button.classList.contains('is-selected'),
    })),
    slots: [...modal.querySelectorAll('.board-slot')].map(button => ({
      number: Number(button.dataset.number), kind: button.dataset.kind, label: text(button),
      empty: !button.classList.contains('is-filled'), correct: button.classList.contains('is-correct'),
      cardId: Object.values(boardCards).find(card => text(button.querySelector('.board-slot-value')) === card.name)?.id || null,
    })),
  };
}
export function observedOption(element, index) {
  return { index, label: text(element), enabled: true, meta: {
    cardId: element.dataset.card || null, face: element.dataset.face || null,
    number: element.dataset.number ? Number(element.dataset.number) : null,
    kind: element.dataset.kind || null, correct: element.classList.contains('is-correct'), selected: element.classList.contains('is-selected'),
    action: element.classList.contains('confirm-hypothesis') ? 'confirm'
      : element.classList.contains('board-commit-close') ? 'commit'
      : element.id === 'done' ? 'done' : element.dataset.card ? 'card'
      : element.dataset.face ? 'face' : element.dataset.kind ? 'slot' : 'other',
  } };
}
// HUDは略字で表示される。見出し文字列でなく、表示要素のtitleから値を読む。
export function hudNumber(root, title) {
  const value = text(root.querySelector(`.hud-value[title="${title}"]`)?.lastElementChild);
  return /^\d+$/.test(value) ? Number(value) : null;
}
