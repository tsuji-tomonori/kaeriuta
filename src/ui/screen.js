export function createScreen(root) {
  root.innerHTML = `<div class="letterbox"><div id="game-screen" class="game-screen"><div id="background"></div><div id="cg-layer"></div><div id="character-layer"></div><div id="chapter-title"></div><div id="stage-note"></div><div id="hud"></div><div id="choice-layer"></div><div id="message-layer"></div></div></div>`;
  return {
    background: root.querySelector('#background'), cg: root.querySelector('#cg-layer'), chara: root.querySelector('#character-layer'),
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
  if (!el || !src || el.dataset.currentSrc === src) return;

  const transition = options.transition === 'dissolve' ? 'dissolve' : 'fade';
  const isCg = el.id === 'cg-layer';
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
