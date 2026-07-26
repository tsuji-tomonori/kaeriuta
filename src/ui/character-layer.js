import { resolveAsset } from '../engine/assets.js';
export function createCharacterLayer(container) {
  return {
    show(id, expr, pos, action) {
      const key = `${id}-${pos}`; let img = container.querySelector(`[data-key="${key}"]`);
      if (action === 'fadeOut') { img?.remove(); return; }
      if (!img) { img = document.createElement('img'); img.dataset.key = key; img.className = `character ${pos}`; container.append(img); }
      img.src = resolveAsset(`${id}_${expr}`).src; img.alt = ''; img.classList.toggle('fade-in', action === 'fadeIn');
    },
    clear() { container.innerHTML = ''; },
  };
}
