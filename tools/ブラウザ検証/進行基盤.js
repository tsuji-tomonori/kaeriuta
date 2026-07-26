export function startProgression(options = {}) {
const params = new URLSearchParams(location.search);
const route = options.route || params.get('route') || 'execution';
const mode = options.mode || params.get('mode') || 'play';
const startedAt = performance.now();
const safetyTimeoutMs = 600000;
const stalledLimit = 40;
const errors = [];
const events = [];
const visitedScenes = [];
const partsEntered = [];
let lastSignature = null;
let unchangedTicks = 0;
let finished = false;
let saved = sessionStorage.getItem('kaeriuta-browser-save-check') === 'saved';
let saveSnapshot = null;
let activeModal = null;
let activePart = null;

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
  return [...document.querySelectorAll('.message-window, .choices, .parts-panel, .node-grid, .board')]
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

function endingId() {
  const sceneId = document.querySelector('#app')?.dataset.sceneId || '';
  if (sceneId.startsWith('end_')) return sceneId.slice(4);
  return null;
}

function report(status, extra = {}) {
  const payload = {
    status, route, mode, elapsedMs: Math.round(performance.now() - startedAt), ending: endingId(),
    title: document.querySelector('.title-screen h1')?.textContent?.trim() || null,
    scene: document.querySelector('#chapter-title')?.textContent?.trim() || null,
    errors, overflow: overflowReport(), lastScreen: lastScreen(), visitedScenes, partsEntered,
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
    notebook: Boolean(document.querySelector('.notebook')),
  });
}

function shouldPause() {
  if (mode === 'title') return Boolean(document.querySelector('.title-screen'));
  if (mode === 'conversation') return Boolean(document.querySelector('.message-window:not([hidden])'));
  if (mode === 'choice') return Boolean(document.querySelector('.choices'));
  if (mode === 'rebuttal') return Boolean(document.querySelector('.parts-modal .rebut-head'));
  if (mode === 'inference') return Boolean(document.querySelector('.parts-modal .node-grid'));
  return false;
}

function actFreeAction(modal) {
  if (modal.querySelector('.freeaction-narrative #next')) return click(modal.querySelector('.freeaction-narrative #next'), 'freeaction:read-next');
  const actions = [...modal.querySelectorAll('.action-list [data-id]')];
  const action = options.choosePart ? actions[options.choosePart('freeAction', actions)] || actions[0] : actions[0];
  if (action) return click(action, `freeaction:action:${action.textContent.trim()}`);
  return click(modal.querySelector('#done'), 'freeaction:confirm');
}

function actRebuttal(modal) {
  const testimony = modal.querySelector('[data-v]');
  if (testimony) return click(testimony, `rebuttal:testimony:${testimony.textContent.trim()}`);
  const responses = [...modal.querySelectorAll('.parts-actions [data-r]')];
  const response = options.choosePart ? responses[options.choosePart('rebuttal', responses)] || responses[0]
    : responses.find((button) => button.textContent.includes('反証')) || responses[0];
  if (response) return click(response, `rebuttal:response:${response.textContent.trim()}`);
  const card = modal.querySelector('[data-card], [data-evidence], [data-item]');
  if (card) return click(card, 'rebuttal:card');
  return click(modal.querySelector('#done'), 'rebuttal:done');
}

function actTemariBoard(modal) {
  const selected = modal.querySelector('.cards .selected');
  if (!selected) return click(modal.querySelector('.cards [data-card]'), 'temari:select-card');
  const empty = [...modal.querySelectorAll('.board .slot')].find((button) => button.textContent.includes('—'));
  if (empty) return click(empty, 'temari:place-card');
  return click(modal.querySelector('#done'), 'temari:done');
}

function actInference(modal) {
  const nodes = [...modal.querySelectorAll('.node-grid [data-id]')];
  const node = options.choosePart ? nodes[options.choosePart('jointReasoning', nodes)] || nodes[0] : nodes[0];
  if (node) return click(node, `inference:node:${node.dataset.id}`);
  const own = modal.querySelector('#own:not([disabled])');
  if (own) return click(own, 'inference:own');
  if (modal.querySelector('#proxy')) return click(modal.querySelector('#proxy'), 'inference:proxy');
  if (modal.querySelector('#relic')) return click(modal.querySelector('#relic'), 'inference:relic');
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
  if (name === 'jointReasoning') return actInference(modal);
  return click(modal.querySelector('#done'), 'part:done');
}

function act() {
  if (finished) return;
  if (shouldPause()) return stop('paused_for_screenshot');
  const end = document.querySelector('.message-text')?.textContent || '';
  if (end.startsWith('END\n')) return stop('ended');
  if (document.querySelector('.notebook')) return click(document.querySelector('.notebook-close'), 'notebook:close');
  if (document.querySelector('.title-screen')) {
    if (mode === 'save-load' && saved) return click(document.querySelector('[data-load="1"]'), 'load:1');
    return click(document.querySelector('[data-start]'), 'title:start');
  }
  const modal = document.querySelector('.parts-modal');
  if (modal) return actPart(modal);
  if (document.querySelector('.choices')) return chooseScenario();
  if (document.querySelector('#stage-note.show')) return click(document.querySelector('#stage-note.show'), 'stage:advance');
  if (mode === 'save-load' && !saved && document.querySelector('#save')) {
    click(document.querySelector('#save'), 'save');
    saveSnapshot = localStorage.getItem('kaeriuta-alpha-1');
    saved = Boolean(saveSnapshot);
    if (saved) sessionStorage.setItem('kaeriuta-browser-save-check', 'saved');
    return click(document.querySelector('#title'), 'title');
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
  if (!finished && unchangedTicks >= stalledLimit) stop('stalled', { stalledTicks: unchangedTicks });
  if (!finished && performance.now() - startedAt > safetyTimeoutMs) stop('timeout');
}, 80);
return { stop, report, resultElement };
}
