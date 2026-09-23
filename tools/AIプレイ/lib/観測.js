import { boardCards } from '../../../src/data/temariuta-board.js';
import { assessBoardHypothesis } from '../../../src/systems/temariuta-board/index.js';

const temariActionLabels = {
  'この仮説で確定':'confirm', '盤を置いて席を立つ':'commit', '盤を伏せて席を立つ':'done',
};
function temariDecisionAction(entry, decision) {
  const option = entry.part.options?.find(option => option.label === decision.selected);
  return option?.meta?.action || temariActionLabels[decision.selected]
    || (entry.part.temari?.slots.some(slot => slot.label === decision.selected) ? 'slot' : 'other');
}

// 各面は最後の観測で丸ごと置き換え、未観測面は区間の最初の配置で補う。
// 戻り値の直下は最後の盤の測定値、boards は全区間の測定値（観測順）。盤がなければ null。
export function temariMeasurement(transcript, decisions = []) {
  const decisionsByStep = new Map();
  for (const decision of decisions) {
    if (decision.action !== 'part:temariBoard') continue;
    if (!decisionsByStep.has(decision.step)) decisionsByStep.set(decision.step, []);
    decisionsByStep.get(decision.step).push(decision);
  }
  const boards = [];
  let current = null;
  const close = (ended) => {
    if (!current) return;
    const { faces, initialFace, observedFaces, numbers, measurement } = current;
    for (const face of ['truth', 'show']) {
      if (!observedFaces.has(face)) faces[face] = structuredClone(initialFace || {});
    }
    const { showShiori, ...score } = assessBoardHypothesis(faces.truth, faces.show, [...numbers].map(number => ({ number })));
    boards.push({ ...score, shioriExposure:showShiori, ...measurement,
      exit:measurement.exit || (ended ? 'unknown' : 'open') });
    current = null;
  };
  for (const entry of transcript) {
    // onTick は操作前の画面を保存する。別パート・会話等を挟むと、次は新しい盤となる。
    if (entry.part?.name !== 'temariBoard') { close(true); continue; }
    current ||= {
      faces:{ truth:{}, show:{} }, initialFace:null, numbers:new Set(), observedFaces:new Set(),
      measurement:{ startStep:entry.step, endStep:entry.step, committed:false, confirmed:false,
        exit:null, displayed:null, displayedStep:null, displayedComparable:false },
    };
    const { faces, numbers, observedFaces, measurement } = current;
    measurement.endStep = entry.step;
    const temari = entry.part.temari;
    if (temari && (temari.face === 'truth' || temari.face === 'show')) {
      const face = {};
      for (const { number, kind, cardId } of temari.slots) {
        numbers.add(number);
        (face[number] ||= {})[kind] = cardId;
      }
      // 両面は同じ初期配置から始まる（src/systems/temariuta-board/index.js:81 の faces 初期化）。
      current.initialFace ??= structuredClone(face);
      if (observedFaces.has(temari.face) && measurement.displayed) {
        const previous = faces[temari.face];
        const positions = new Set([...Object.keys(previous), ...Object.keys(face)]);
        if ([...positions].some(number => ['dead', 'actor', 'meaning'].some(kind =>
          (previous[number]?.[kind] ?? null) !== (face[number]?.[kind] ?? null)))) {
          measurement.displayedComparable = false;
        }
      }
      faces[temari.face] = face;
      observedFaces.add(temari.face);
    }
    const match = (entry.part.text || entry.text || '').match(/表の読みへの一致：(\d+)\/(\d+).*まことの盤の正確さ：(\d+)\/(\d+).*見せる盤の栞の名指し：(\d+)/);
    if (match) {
      measurement.displayed = { showCredibility:Number(match[1]), truthAccuracy:Number(match[3]), shioriExposure:Number(match[5]) };
      measurement.displayedStep = entry.step;
      measurement.displayedComparable = true;
      measurement.confirmed = true;
    }
    for (const decision of decisionsByStep.get(entry.step) || []) {
      const action = temariDecisionAction(entry, decision);
      if (action === 'confirm') measurement.confirmed = true;
      if (action === 'commit' || action === 'done') {
        measurement.exit = action;
        measurement.committed = action === 'commit';
      }
      // 同じ step の選択も観測後の操作。配置の自動再試行は上のスロット差分で補足する。
      if (action === 'slot') measurement.displayedComparable = false;
    }
  }
  // 操作上限による強制退席は decisions に残らないため、根拠なしに done と推定しない。
  close(false);
  return boards.length ? { ...boards.at(-1), boards } : null;
}

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
