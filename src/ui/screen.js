import { chapters } from '../data/chapters.js';
import { endingsMeta } from '../data/endings-meta.js';

const GRADE_CLASSES = [
  ...chapters.map(({ key }) => `is-grade-${key}`),
  'is-grade-rescue-end',
  'is-grade-ruin-end',
];

const gradeBySceneId = new Map([
  ...chapters.map(({ sceneId, key }) => [sceneId, `is-grade-${key}`]),
  ...endingsMeta.map(({ sceneId, id }) => [sceneId, id === 'b1_true' ? 'is-grade-rescue-end' : 'is-grade-ruin-end']),
]);

// デバッグ専用: URLに ?grade=ch3 のように指定した章グレードを固定する。
// 指定なし、または許可していない値なら通常の sceneId 判定を使う。
function debugGradeFromQuery() {
  const value = new URLSearchParams(globalThis.location?.search || '').get('grade');
  const grade = value ? `is-grade-${value}` : null;
  return GRADE_CLASSES.includes(grade) ? grade : null;
}

function gameScreenFor(element) {
  return element?.closest?.('#game-screen')
    ?? globalThis.document?.querySelector?.('#game-screen')
    ?? null;
}

function applySceneGrade(element) {
  const gameScreen = gameScreenFor(element);
  if (!gameScreen) return;
  const sceneId = globalThis.document?.querySelector?.('#app')?.dataset.sceneId;
  gameScreen.classList.remove(...GRADE_CLASSES);
  const grade = debugGradeFromQuery() ?? gradeBySceneId.get(sceneId);
  if (grade) gameScreen.classList.add(grade);
}

function setCinematicVisible(element, visible) {
  const characterLayer = gameScreenFor(element)?.querySelector?.('#character-layer');
  characterLayer?.__characterLayer?.setCinematicVisible(visible);
}

function clearCgLayer(element) {
  const cgLayer = gameScreenFor(element)?.querySelector?.('#cg-layer');
  if (!cgLayer || !cgLayer.dataset.currentSrc) return;
  cgLayer.replaceChildren();
  delete cgLayer.dataset.currentSrc;
  setCinematicVisible(element, false);
}

export function createScreen(root) {
  root.innerHTML = `<div class="letterbox"><div id="game-screen" class="game-screen"><div id="background"></div><div id="cg-layer"></div><div id="character-layer"></div><div id="chapter-title"></div><div id="stage-note"></div><div id="hud"></div><div id="choice-layer"></div><div id="message-layer"></div></div></div>`;
  const chara = root.querySelector('#character-layer');
  // 立ち絵APIから、明示的な次の立ち絵表示時にCGを閉じられるようにする。
  // 背景切替による従来の解除は setBackground 内に残している。
  chara.__screenControls = { clearCgForCharacter: () => clearCgLayer(chara) };
  return {
    background: root.querySelector('#background'), cg: root.querySelector('#cg-layer'), chara,
    chapter: root.querySelector('#chapter-title'), stage: root.querySelector('#stage-note'), hud: root.querySelector('#hud'),
    choice: root.querySelector('#choice-layer'), message: root.querySelector('#message-layer'),
  };
}

const nextFrame = globalThis.requestAnimationFrame
  ? (callback) => globalThis.requestAnimationFrame(callback)
  : (callback) => setTimeout(callback, 0);

/**
 * 背景・CGを二枚の表示面で入れ替える。従来どおり第2引数まででも使え、
 * 同じ画像の再指定ではDOMにもアニメーションにも触れない。
 */
export function setBackground(el, src, options = {}) {
  if (!el || !src) return;

  const isCg = el.id === 'cg-layer';
  if (isCg) setCinematicVisible(el, true);
  else {
    applySceneGrade(el);
    clearCgLayer(el);
  }
  if (el.dataset.currentSrc === src) return;

  const transition = options.transition === 'dissolve' ? 'dissolve' : 'fade';
  const duration = isCg ? 1000 : transition === 'dissolve' ? 850 : 720;
  const oldLayers = [...el.querySelectorAll('.visual-layer')];
  const layer = document.createElement('div');
  layer.className = `visual-layer visual-${transition}`;
  layer.style.backgroundImage = `url("${String(src).replaceAll('"', '\\"')}")`;
  layer.style.setProperty('--visual-duration', `${duration}ms`);
  layer.dataset.src = src;

  const driftIndex = Number(el.dataset.driftIndex || 0) + 1;
  el.dataset.driftIndex = String(driftIndex);
  layer.classList.add(driftIndex % 2 ? 'drift-a' : 'drift-b');
  el.append(layer);
  el.dataset.currentSrc = src;

  if (options.instant || oldLayers.length === 0) {
    layer.classList.add('is-visible');
    oldLayers.forEach((old) => old.remove());
    return;
  }

  oldLayers.forEach((old) => old.classList.add('is-leaving'));
  nextFrame(() => layer.classList.add('is-visible'));
  setTimeout(() => {
    oldLayers.forEach((old) => old.remove());
  }, duration + 80);
}
