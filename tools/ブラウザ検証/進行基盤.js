import { boardCards } from '../../src/data/temariuta-board.js';

export function hasUntriedBoardPlacement(face, cardId, slots, placedKeys = []) {
  // 正誤の色は盤面に出さない。面・札・欄ごとの既試行だけで候補を管理する。
  return slots.some((slot) => !placedKeys.includes(`${face}:${slot.number}:${slot.kind}:${cardId}`));
}

export function temariSelectedCandidates(selected, candidateSlots, deselectedCards = []) {
  return [
    ...(!deselectedCards.includes(selected.dataset.card) ? [selected] : []),
    ...candidateSlots,
  ];
}

export function startProgression(options = {}) {
const params = new URLSearchParams(location.search);
const route = options.route || params.get('route') || 'execution';
const mode = options.mode || params.get('mode') || 'play';
const startedAt = performance.now();
const safetyTimeoutMs = 600000;
const stalledLimit = 40;
const errors = [];
const warnings = [];
const events = [];
const visitedScenes = [];
const partsEntered = [];
let lastSignature = null;
let unchangedTicks = 0;
let finished = false;
let activeModal = null;
let activePart = null;
const saveLoad = {
  phase: mode === 'save-load' ? 'need-save' : null,
  slot: '1',
  format: null,
  savedScene: null,
  savedText: null,
  loadedScene: null,
  loadedText: null,
  verified: false,
  failure: null,
};

const record = (type, value) => errors.push({ type, text: String(value?.stack || value?.message || value) });
options.onStart?.({ route, mode });
window.addEventListener('error', (event) => record('error', event.error || event.message));
window.addEventListener('unhandledrejection', (event) => record('unhandledrejection', event.reason));
const originalError = console.error.bind(console);
console.error = (...args) => { record('console.error', args.join(' ')); originalError(...args); };

function resultElement() {
  let el = document.querySelector('#browser-verification-result');
  if (!el) {
    el = document.createElement('pre');
    el.id = 'browser-verification-result';
    el.setAttribute('aria-live', 'polite');
    el.style.cssText = 'position:fixed;z-index:99999;left:0;bottom:0;max-width:100%;max-height:35vh;overflow:auto;margin:0;padding:6px;background:#000c;color:#9f9;font:12px/1.35 monospace;white-space:pre-wrap';
    document.body.append(el);
  }
  return el;
}

function overflowReport() {
  return [...document.querySelectorAll('.message-window, .message-text, .choices, .parts-panel, .node-grid, .board')]
    .filter((el) => el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2)
    .map((el) => `${el.className || el.id}: ${el.scrollWidth}x${el.scrollHeight}/${el.clientWidth}x${el.clientHeight}`);
}

function visibleButtons(root = document) {
  return [...root.querySelectorAll('button')]
    .filter((button) => !button.disabled && button.offsetParent !== null)
    .map((button) => button.textContent.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function partName(modal = document.querySelector('.parts-modal')) {
  if (!modal) return null;
  if (modal.querySelector('.freeaction-narrative, .action-list')) return 'freeAction';
  if (modal.querySelector('.rebut-head, .chain')) return 'rebuttal';
  if (modal.querySelector('.node-grid, .agitation')) return 'jointReasoning';
  if (modal.querySelector('.board')) return 'temariBoard';
  if (modal.querySelector('.chapter-summary')) return 'chapterSummary';
  return modal.querySelector('header span')?.textContent.trim() || 'unknownPart';
}

function lastScreen() {
  const modal = document.querySelector('.parts-modal');
  return {
    text: (modal?.querySelector('main')?.textContent || document.querySelector('.message-text')?.textContent || '').trim().slice(0, 200),
    buttons: visibleButtons(),
    part: partName(modal),
  };
}

function titleRoot() {
  return document.querySelector('.kaeriuta-title, .title-screen');
}

function screenState() {
  const message = document.querySelector('.message-window:not([hidden])');
  const saveMenu = document.querySelector('.kaeriuta-save-menu');
  const dialog = document.querySelector('.dialog-overlay');
  return {
    title: Boolean(titleRoot()),
    conversation: Boolean(message),
    revealing: Boolean(message && !message.classList.contains('reveal-complete')),
    choice: Boolean(document.querySelector('.choices')),
    part: partName(),
    overlays: {
      saveMenu: Boolean(saveMenu),
      saveConfirm: Boolean(saveMenu?.querySelector('[data-confirm]:not([hidden])')),
      dialog: Boolean(dialog),
      dialogTitle: dialog?.querySelector('.dialog-title')?.textContent?.trim() || null,
      notebook: Boolean(document.querySelector('.notebook-overlay')),
      backlog: Boolean(document.querySelector('.backlog-overlay')),
      gallery: Boolean(document.querySelector('.kaeriuta-gallery')),
    },
  };
}

function stallReason(screen) {
  if (screen.overlays.dialog) return `確認ダイアログで停止: ${screen.overlays.dialogTitle || '題名なし'}`;
  if (screen.overlays.saveConfirm) return 'セーブメニューの確認ダイアログで停止';
  const overlay = Object.entries(screen.overlays).find(([, open]) => Boolean(open));
  if (overlay) return `オーバーレイで停止: ${overlay[0]}`;
  if (screen.title) return 'タイトル画面で操作対象を見つけられない';
  if (screen.part) return `特殊パートで停止: ${screen.part}`;
  if (screen.choice) return '選択肢画面で停止';
  if (screen.conversation) return screen.revealing ? '会話の文字表示中に停止' : '会話画面で停止';
  return '操作可能な既知の画面を検出できない';
}

function endingId() {
  const sceneId = document.querySelector('#app')?.dataset.sceneId || '';
  if (sceneId.startsWith('end_')) return sceneId.slice(4);
  return null;
}

function report(status, extra = {}) {
  const payload = {
    status, route, mode, elapsedMs: Math.round(performance.now() - startedAt), ending: endingId(),
    title: titleRoot()?.querySelector('h1')?.textContent?.trim() || null,
    scene: document.querySelector('#chapter-title')?.textContent?.trim() || null,
    screen: screenState(), errors, warnings, overflow: overflowReport(), lastScreen: lastScreen(), visitedScenes, partsEntered,
    saveLoad: mode === 'save-load' ? { ...saveLoad } : null,
    events: events.slice(-100), ...extra,
  };
  if (options.onReport) {
    options.onReport(payload);
    return;
  }
  resultElement().textContent = JSON.stringify(payload, null, 2);
}

function stop(status, extra = {}) { if (!finished) { finished = true; report(status, extra); } }
function click(el, note) { if (!el || el.disabled) return false; events.push(note); el.click(); return true; }
function chooseByText(preferred = []) {
  const choices = [...document.querySelectorAll('.choices button')].filter((button) => !button.disabled);
  const found = preferred.map((text) => choices.find((button) => button.textContent.includes(text))).find(Boolean);
  return click(found || choices[0], `choice:${(found || choices[0])?.textContent.trim()}`);
}

function chooseScenario() {
  const prompt = document.querySelector('.choices p')?.textContent || '';
  const choices = [...document.querySelectorAll('.choices button')].filter((button) => !button.disabled);
  if (options.chooseChoice) {
    const decision = options.chooseChoice({ prompt, choices: choices.map((button, index) => ({ index, label: button.textContent.trim() })) });
    const target = choices[decision?.choice] || choices[0];
    events.push(`choice:${target?.textContent.trim()} (${decision?.reason || 'default'})`);
    return click(target, `choice:${target?.textContent.trim()}`);
  }
  // This is deliberately label-first: the route decision must not depend on
  // wording changes to the surrounding prompt.
  if (route === 'execution' && document.querySelector('.choices button')?.parentElement?.textContent.includes('凶器を取る')) return chooseByText(['凶器を取る']);
  if (route === 'confession' && document.querySelector('.choices button')?.parentElement?.textContent.includes('少年の部屋の扉を叩く')) return chooseByText(['少年の部屋の扉を叩く']);
  if (route === 'confession' && prompt.includes('どう接触')) return chooseByText(['このまま扉を叩く']);
  if (route === 'confession' && prompt.includes('最終応答')) return chooseByText(['明日の私は']);
  if (route === 'confession' && prompt.includes('六番の唄')) return chooseByText(['帰り唄']);
  if (route === 'execution' && prompt.includes('佐伯の問い')) return chooseByText(['あなたこそ、歯型']);
  if (route === 'execution' && prompt.includes('正午の決断')) return chooseByText(['自首', '名乗']);
  if (prompt.includes('死体のどこ')) return chooseByText(['手元']);
  if (prompt.includes('宗玄の乾杯')) return chooseByText(['指先']);
  if (prompt.includes('散会後')) return chooseByText(['片付け']);
  return chooseByText();
}

function observeProgress() {
  const sceneId = document.querySelector('#app')?.dataset.sceneId;
  if (sceneId && visitedScenes.at(-1) !== sceneId) visitedScenes.push(sceneId);
  const modal = document.querySelector('.parts-modal');
  if (activeModal && activeModal !== modal && activePart) activePart.closed = true;
  if (modal && modal !== activeModal) {
    activePart = { name: partName(modal), closed: false };
    partsEntered.push(activePart);
  }
  activeModal = modal;
}

function signature() {
  const modal = document.querySelector('.parts-modal');
  return JSON.stringify({
    scene: document.querySelector('#app')?.dataset.sceneId || null,
    message: document.querySelector('.message-text')?.textContent?.trim() || '',
    choices: visibleButtons(document.querySelector('.choices') || document.createElement('div')),
    stage: document.querySelector('#stage-note.show')?.textContent?.trim() || '',
    part: partName(modal),
    partText: modal?.querySelector('main')?.textContent?.replace(/\s+/g, ' ').trim() || '',
    partButtons: modal ? visibleButtons(modal) : [],
    messageRevealing: Boolean(document.querySelector('.message-window:not([hidden]):not(.reveal-complete)')),
    overlays: screenState().overlays,
  });
}

function shouldPause() {
  if (mode === 'title') return Boolean(titleRoot());
  if (mode === 'conversation') return Boolean(document.querySelector('.message-window:not([hidden])'));
  if (mode === 'choice') return Boolean(document.querySelector('.choices'));
  if (mode === 'rebuttal') return Boolean(document.querySelector('.parts-modal .rebut-head'));
  if (mode === 'inference') return Boolean(document.querySelector('.parts-modal .node-grid'));
  return false;
}

function actFreeAction(modal) {
  const focuses = [...modal.querySelectorAll('.freeaction-narrative [data-focus]')];
  if (focuses.length) {
    const focus = options.choosePart ? focuses[options.choosePart('freeAction', focuses)] || focuses[0] : focuses[0];
    return click(focus, `freeaction:focus:${focus.textContent.trim()}`);
  }
  if (modal.querySelector('.freeaction-narrative #next')) return click(modal.querySelector('.freeaction-narrative #next'), 'freeaction:read-next');
  const actions = [...modal.querySelectorAll('.action-list [data-id]')];
  const action = options.choosePart ? actions[options.choosePart('freeAction', actions)] || actions[0] : actions[0];
  if (action) return click(action, `freeaction:action:${action.textContent.trim()}`);
  return click(modal.querySelector('#done'), 'freeaction:confirm');
}

function actRebuttal(modal) {
  const testimony = modal.querySelector('[data-v]');
  if (testimony) return click(testimony, `rebuttal:testimony:${testimony.textContent.trim()}`);
  const responses = [...modal.querySelectorAll('.parts-actions [data-r]:not([disabled])')];
  const response = options.choosePart ? responses[options.choosePart('rebuttal', responses)] || responses[0]
    : responses.find((button) => button.textContent.includes('反証')) || responses[0];
  if (response) return click(response, `rebuttal:response:${response.textContent.trim()}`);
  const card = modal.querySelector('[data-card], [data-evidence], [data-item]');
  if (card) return click(card, 'rebuttal:card');
  return click(modal.querySelector('#done'), 'rebuttal:done');
}

function actTemariBoard(modal) {
  // 札と欄の読み、および二面のどちらを仕上げるかはペルソナへ委ねる。
  // boardSolution は参照しない。これは正解を作る処理ではなく、画面で見える
  // 札・欄・矛盾文を材料にプレイヤーの仮説を操作する処理である。
  // 確定結果の実装がまだ close ボタンを出さない版でも、盤面が消えたら
  // #done へ落として終端させる。
  if (!modal.querySelector('.board') && !modal.querySelector('.confirm-hypothesis')) {
    return click(modal.querySelector('#done'), 'temari:result-done-fallback');
  }
  const state = activePart
    ? (activePart.temari ||= { lastAction:null, warned:null, operations:0, placedKeys:[], deselectedCards:[], operationLimitReached:false })
    : { lastAction:null, warned:null, operations:0, placedKeys:[], deselectedCards:[], operationLimitReached:false };
  const operationLimit = 200;
  const boardClick = (element, note) => {
    if (!element || element.disabled) return false;
    state.operations++;
    return click(element, note);
  };
  if (state.operations >= operationLimit) {
    if (!state.operationLimitReached) {
      state.operationLimitReached = true;
      const warning = `手毬唄ボードが操作上限${operationLimit}回へ到達したため、盤を伏せて終了します`;
      warnings.push(warning);
      events.push(`warning:temari-operation-limit:${operationLimit}`);
    }
    return click(modal.querySelector('#done'), 'temari:done-operation-limit');
  }
  const choose = (elements) => {
    if (!elements.length) return null;
    const index = options.choosePart ? options.choosePart('temariBoard', elements) : 0;
    return elements[index] || elements[0];
  };
  const currentFace = modal.querySelector('[data-face][aria-pressed="true"]')?.dataset.face || 'show';
  const selected = modal.querySelector('.cards .selected');
  const slots = [...modal.querySelectorAll('.board .slot')];
  const placementKey = (cardId, slot) => `${currentFace}:${slot.dataset.number}:${slot.dataset.kind}:${cardId}`;
  const availableSlots = (cardId) => slots.filter((slot) => !state.placedKeys.includes(placementKey(cardId, slot)));

  // 不適合な札は最初の警告を見てから、同じ欄をもう一度押して初めて仮説になる。
  // 警告クリックを選んだこと自体はペルソナの判断であり、再クリックだけを機械的に行う。
  if (selected && state.warned) {
    const retry = availableSlots(selected.dataset.card)
      .find((slot) => slot.dataset.number === state.warned.number && slot.dataset.kind === state.warned.kind);
    if (retry) {
      state.warned = null;
      state.lastAction = 'slot';
      state.placedKeys.push(placementKey(selected.dataset.card, retry));
      state.deselectedCards = [];
      return boardClick(retry, `temari:place-hypothesis:${retry.dataset.number}:${retry.dataset.kind}`);
    }
    state.warned = null;
  }

  if (selected) {
    const candidateSlots = availableSlots(selected.dataset.card);
    // 配置を挟まず同じ札を二度解除する候補は出さない。採点方針が解除を
    // 配置より高くしても、解除→再選択→解除の往復を構造的に有限化する。
    const action = choose(temariSelectedCandidates(selected, candidateSlots, state.deselectedCards));
    if (action === selected) {
      state.deselectedCards.push(selected.dataset.card);
      state.lastAction = 'card';
      return boardClick(selected, `temari:deselect-card:${selected.dataset.card}`);
    }
    const slot = action;
    if (!slot) return boardClick(modal.querySelector('#done'), 'temari:done-no-placement');
    const card = boardCards[selected.dataset.card];
    if (!card?.kinds?.includes(slot.dataset.kind)) {
      state.warned = { number:slot.dataset.number, kind:slot.dataset.kind };
    } else {
      state.placedKeys.push(placementKey(selected.dataset.card, slot));
      state.deselectedCards = [];
    }
    state.lastAction = 'slot';
    return boardClick(slot, `temari:place:${selected.dataset.card}:${slot.dataset.number}:${slot.dataset.kind}`);
  }

  const otherFace = modal.querySelector(`[data-face="${currentFace === 'truth' ? 'show' : 'truth'}"]`);
  // 非表示側の配置履歴は DOM に無いため、タブを選んだ後に改めて候補を絞る。
  const otherFaceAvailable = Boolean(otherFace);
  const cards = [...modal.querySelectorAll('.cards [data-card]')]
    .filter((card) => hasUntriedBoardPlacement(
      currentFace,
      card.dataset.card,
      slots.map((slot) => ({ number:slot.dataset.number, kind:slot.dataset.kind })),
      state.placedKeys,
    ));
  const currentFilled = slots.some((button) => !button.textContent.includes('—'));
  const confirm = modal.querySelector('.confirm-hypothesis');
  const allCurrentFilled = slots.every((button) => !button.textContent.includes('—'));
  // A tab is offered as an ordinary action, but never twice in succession:
  // a persona that switches faces must next take a card or leave the board.
  const candidates = [
    ...cards,
    ...(state.lastAction !== 'face' && otherFaceAvailable ? [otherFace] : []),
    ...(currentFilled ? [modal.querySelector('#done')] : []),
    ...(allCurrentFilled ? [confirm] : []),
    modal.querySelector('.board-commit-close'),
  ].filter(Boolean);
  const action = choose(candidates);
  if (!action) return click(modal.querySelector('#done'), 'temari:done');
  if (action.dataset.face) {
    state.lastAction = 'face';
    return boardClick(action, `temari:face:${action.dataset.face}`);
  }
  if (action.dataset.card) {
    state.lastAction = 'card';
    return boardClick(action, `temari:select-card:${action.dataset.card}`);
  }
  if (action.classList.contains('confirm-hypothesis')) {
    state.lastAction = 'confirm';
    return boardClick(action, 'temari:confirm-hypothesis');
  }
  if (action.classList.contains('board-commit-close')) {
    state.lastAction = 'commit';
    return boardClick(action, 'temari:commit-close');
  }
  state.lastAction = 'done';
  return boardClick(action, 'temari:done');
}

function actInference(modal) {
  const nodes = [...modal.querySelectorAll('.node-grid [data-id]')];
  const node = options.choosePart ? nodes[options.choosePart('jointReasoning', nodes)] || nodes[0] : nodes[0];
  if (node) return click(node, `inference:node:${node.dataset.id}`);
  const own = modal.querySelector('#own:not([disabled])');
  if (own) return click(own, 'inference:own');
  if (modal.querySelector('#proxy')) return click(modal.querySelector('#proxy'), 'inference:proxy');
  if (modal.querySelector('#relic')) return click(modal.querySelector('#relic'), 'inference:relic');
  if (modal.querySelector('#unfinished')) return click(modal.querySelector('#unfinished'), 'inference:unfinished');
  const ending = [...modal.querySelectorAll('[data-e]')].find((button) => button.textContent.includes('帰り唄')) || modal.querySelector('[data-e]');
  if (ending) return click(ending, `inference:ending:${ending.textContent.trim()}`);
  if (modal.querySelector('#back')) {
    events.push('inference:skipped-unbreakable-node');
    if (activePart) activePart.skipped = 'unbreakable node; closed as B-2';
    return click(modal.querySelector('.parts-close'), 'inference:close-unbreakable');
  }
  return click(modal.querySelector('#done'), 'inference:done');
}

function actPart(modal) {
  // Result screens replace a part's main content, so retain the type observed
  // when the modal opened (for example, inference's final-choice screen).
  const name = activeModal === modal && activePart?.name || partName(modal);
  if (name === 'freeAction') return actFreeAction(modal);
  if (name === 'rebuttal') return actRebuttal(modal);
  if (name === 'temariBoard') return actTemariBoard(modal);
  if (name === 'chapterSummary') return click(modal.querySelector('#done'), 'chapterSummary:done');
  if (name === 'jointReasoning') return actInference(modal);
  return click(modal.querySelector('#done'), 'part:done');
}

function saveSlotButton(menu, slot) {
  return [...menu.querySelectorAll('.kaeriuta-save-slot')].find((row) => (
    row.querySelector('h3')?.textContent?.trim() === `スロット ${slot}`
  ))?.querySelector('.kaeriuta-save-slot__actions button:not(.kaeriuta-save-slot__delete)') || null;
}

function readSaveRecord(slot) {
  const raw = localStorage.getItem(`kaeriuta-alpha-${slot}`);
  if (!raw) return null;
  try {
    const record = JSON.parse(raw);
    return record?.format === 3 && record.state?.version === 2 ? record : null;
  } catch {
    return null;
  }
}

function actSaveLoadMenu(menu) {
  const confirm = menu.querySelector('[data-confirm]:not([hidden])');
  if (confirm) return click(confirm.querySelector('[data-confirm-yes]'), 'save-load:overwrite-confirm');

  const heading = menu.querySelector('#save-menu-title')?.textContent?.trim();
  if (saveLoad.phase === 'saving') {
    const record = readSaveRecord(saveLoad.slot);
    if (!record) return false;
    saveLoad.format = record.format;
    saveLoad.savedScene = record.state.sceneId || null;
    saveLoad.savedText = document.querySelector('.message-text')?.textContent || null;
    saveLoad.phase = 'returning-title';
    events.push(`save-load:saved:${saveLoad.slot}:format-${record.format}`);
    return click(menu.querySelector('[data-close]'), 'save-load:close-save-menu');
  }
  if (saveLoad.phase === 'need-save' && heading === 'セーブ') {
    saveLoad.phase = 'saving';
    return click(saveSlotButton(menu, saveLoad.slot), `save-load:save:${saveLoad.slot}`);
  }
  if (saveLoad.phase === 'opening-load' && heading === 'ロード') {
    saveLoad.phase = 'loading';
    return click(saveSlotButton(menu, saveLoad.slot), `save-load:load:${saveLoad.slot}`);
  }
  saveLoad.failure = `想定外のセーブメニュー状態: ${saveLoad.phase}/${heading || '見出しなし'}`;
  return click(menu.querySelector('[data-close]'), 'save-load:close-unexpected-menu');
}

function verifyLoadedSave() {
  if (mode !== 'save-load' || saveLoad.phase !== 'loading' || titleRoot()) return false;
  const sceneId = document.querySelector('#app')?.dataset.sceneId || null;
  if (!sceneId) return true;
  const message = document.querySelector('.message-window:not([hidden])');
  if (message && !message.classList.contains('reveal-complete')) {
    click(message, 'save-load:complete-loaded-message');
    return true;
  }
  saveLoad.loadedScene = sceneId;
  saveLoad.loadedText = message?.querySelector('.message-text')?.textContent || null;
  saveLoad.verified = saveLoad.format === 3
    && sceneId === saveLoad.savedScene
    && saveLoad.loadedText === saveLoad.savedText;
  saveLoad.failure = saveLoad.verified
    ? null
    : `ロード後の表示不一致: saved=${saveLoad.savedScene}/${saveLoad.savedText}, loaded=${sceneId}/${saveLoad.loadedText}, format=${saveLoad.format}`;
  saveLoad.phase = saveLoad.verified ? 'verified' : 'failed';
  events.push(`save-load:${saveLoad.verified ? 'verified' : 'failed'}:${sceneId}`);
  return true;
}

function act() {
  if (finished) return;
  if (shouldPause()) return stop('paused_for_screenshot');
  const end = document.querySelector('.message-text')?.textContent || '';
  if (end.startsWith('END\n')) return stop('ended');
  const saveMenu = document.querySelector('.kaeriuta-save-menu');
  if (saveMenu) {
    if (mode === 'save-load') return actSaveLoadMenu(saveMenu);
    return click(saveMenu.querySelector('[data-close]'), 'save-menu:close');
  }
  const dialog = document.querySelector('.dialog-overlay');
  if (dialog) {
    const confirmTitle = dialog.querySelector('.dialog-title')?.textContent?.trim() || '';
    if (mode === 'save-load' && saveLoad.phase === 'returning-title' && confirmTitle === 'タイトルへ戻りますか？') {
      saveLoad.phase = 'opening-load';
      return click(dialog.querySelector('.dialog-ok'), 'save-load:title-confirm');
    }
    return click(dialog.querySelector('.dialog-cancel, .dialog-ok'), 'dialog:close');
  }
  if (document.querySelector('.notebook-overlay')) return click(document.querySelector('.notebook-close'), 'notebook:close');
  if (document.querySelector('.backlog-overlay')) return click(document.querySelector('.backlog-close'), 'backlog:close');
  if (titleRoot()) {
    if (mode === 'save-load' && saveLoad.phase === 'opening-load') {
      return click(document.querySelector('[data-load-menu]'), 'save-load:open-load-menu');
    }
    return click(document.querySelector('[data-start]'), 'title:start');
  }
  if (verifyLoadedSave()) return;
  const modal = document.querySelector('.parts-modal');
  if (modal) return actPart(modal);
  if (document.querySelector('.choices')) return chooseScenario();
  if (document.querySelector('#stage-note.show')) return click(document.querySelector('#stage-note.show'), 'stage:advance');
  if (mode === 'save-load' && saveLoad.phase === 'need-save') {
    const message = document.querySelector('.message-window:not([hidden])');
    if (message && !message.classList.contains('reveal-complete')) {
      return click(message, 'save-load:complete-before-save');
    }
    return click(document.querySelector('.hud-save'), 'save-load:open-save-menu');
  }
  if (mode === 'save-load' && saveLoad.phase === 'returning-title') {
    return click(document.querySelector('.hud-title'), 'save-load:request-title');
  }
  if (mode === 'save-load' && saveLoad.phase === 'failed') {
    return stop('save_load_failed', { saveLoad: { ...saveLoad } });
  }
  return click(document.querySelector('.message-window:not([hidden])'), 'advance');
}

const timer = setInterval(() => {
  observeProgress();
  options.onTick?.();
  const currentSignature = signature();
  unchangedTicks = currentSignature === lastSignature ? unchangedTicks + 1 : 0;
  lastSignature = currentSignature;
  act();
  if (!finished && unchangedTicks >= stalledLimit) {
    const stalledScreen = screenState();
    stop('stalled', {
      stalledTicks: unchangedTicks,
      stalledScreen,
      stallReason: stallReason(stalledScreen),
    });
  }
  if (!finished && performance.now() - startedAt > safetyTimeoutMs) stop('timeout');
}, 80);
return { stop, report, resultElement };
}
