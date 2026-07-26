import { resolveAsset } from '../engine/assets.js';
import { transitionCharacterPositions } from './character-state.js';
export function createCharacterLayer(container) {
  let positions = {};
  function render() {
    container.replaceChildren();
    for (const [pos, character] of Object.entries(positions)) {
      const img = document.createElement('img');
      img.dataset.position = pos;
      img.className = `character ${pos}`;
      img.src = resolveAsset(`${character.id}_${character.expr}`).src;
      img.alt = '';
      img.classList.toggle('fade-in', character.action === 'fadeIn');
      container.append(img);
    }
  }
  return {
    show(id, expr, pos, action) {
      positions = transitionCharacterPositions(positions, { id, expr, pos, action });
      render();
    },
    clear() { positions = {}; container.replaceChildren(); },
  };
}
