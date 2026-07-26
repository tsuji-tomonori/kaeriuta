export function createScreen(root) {
  root.innerHTML = `<div class="letterbox"><div id="game-screen" class="game-screen"><div id="background"></div><div id="cg-layer"></div><div id="character-layer"></div><div id="chapter-title"></div><div id="stage-note"></div><div id="hud"></div><div id="choice-layer"></div><div id="message-layer"></div></div></div>`;
  return {
    background: root.querySelector('#background'), cg: root.querySelector('#cg-layer'), chara: root.querySelector('#character-layer'),
    chapter: root.querySelector('#chapter-title'), stage: root.querySelector('#stage-note'), hud: root.querySelector('#hud'),
    choice: root.querySelector('#choice-layer'), message: root.querySelector('#message-layer'),
  };
}
export function setBackground(el, src) { el.style.backgroundImage = `url("${src}")`; }
