import { resolveAsset } from '../engine/assets.js';
import { characters } from '../data/characters.js';
import { transitionCharacterPositions } from './character-state.js';

const CHARACTER_PROFILES = {
  chara_shiori: { scale: 0.98, shift: -1, warmth: 0.01, hue: -2 },
  chara_sogen: { scale: 1.03, shift: 1, warmth: 0.04, hue: 2 },
  chara_goko: { scale: 1.02, shift: -2, warmth: 0.03, hue: 1 },
  chara_fujino: { scale: 0.99, shift: 2, warmth: 0.02, hue: -1 },
  chara_saeki: { scale: 1.01, shift: -1, warmth: 0.01, hue: -2 },
  chara_makabe: { scale: 1.00, shift: 1, warmth: 0.00, hue: 0 },
  chara_onda: { scale: 1.01, shift: 2, warmth: 0.02, hue: 1 },
  chara_uno: { scale: 1.03, shift: -2, warmth: 0.04, hue: 2 },
  chara_housekeeper: { scale: 0.98, shift: 1, warmth: 0.03, hue: 1 },
  chara_toyo: { scale: 0.97, shift: -1, warmth: 0.02, hue: -1 },
  chara_detective: { scale: 1.02, shift: 2, warmth: 0.01, hue: 0 },
  chara_companion: { scale: 0.99, shift: -2, warmth: 0.01, hue: -1 },
  chara_observer: { scale: 0.97, shift: 1, warmth: 0.00, hue: -2 },
};

function spriteId(value) {
  if (!value) return null;
  return characters[value]?.sprite || (value.startsWith('chara_') ? value : `chara_${value}`);
}

function applyProfile(slot, id) {
  const profile = CHARACTER_PROFILES[id] || { scale: 1, shift: 0, warmth: 0, hue: 0 };
  slot.style.setProperty('--character-scale', profile.scale);
  slot.style.setProperty('--character-shift', `${profile.shift}%`);
  slot.style.setProperty('--character-warmth', profile.warmth);
  slot.style.setProperty('--character-hue', `${profile.hue}deg`);
  const phase = [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 4;
  slot.style.setProperty('--breath-delay', `${phase * -1.1}s`);
  slot.style.setProperty('--breath-duration', `${4.8 + phase * 0.55}s`);
}

export function createCharacterLayer(container) {
  let positions = {};
  let speaker = null;
  let instant = false;
  const removalTimers = new Set();

  function applySpeaker() {
    for (const slot of container.querySelectorAll('.character-slot')) {
      const speaking = speaker && slot.dataset.character === speaker;
      slot.classList.toggle('is-speaker', Boolean(speaking));
      slot.classList.toggle('is-muted', Boolean(speaker && !speaking));
      for (const image of slot.querySelectorAll('.character')) {
        image.classList.toggle('is-speaker', Boolean(speaking));
        image.classList.toggle('is-muted', Boolean(speaker && !speaking));
      }
    }
  }

  function schedule(callback, delay) {
    if (instant) {
      callback();
      return;
    }
    const timer = setTimeout(() => {
      removalTimers.delete(timer);
      callback();
    }, delay);
    removalTimers.add(timer);
  }

  function createImage(character, className = '') {
    const img = document.createElement('img');
    img.className = `character ${className}`.trim();
    img.src = resolveAsset(`${character.id}_${character.expr}`).src;
    img.alt = '';
    img.dataset.character = character.id;
    img.dataset.expression = character.expr;
    return img;
  }

  function createSlot(pos, character) {
    const slot = document.createElement('div');
    slot.className = `character-slot ${pos}`;
    slot.dataset.position = pos;
    slot.dataset.character = character.id;
    applyProfile(slot, character.id);
    const figure = document.createElement('div');
    figure.className = 'character-figure';
    figure.append(createImage(character));
    slot.append(figure);
    return slot;
  }

  function renderCommand(pos, previous, character, action) {
    const oldSlot = container.querySelector(`.character-slot[data-position="${pos}"]`);
    if (action === 'fadeOut') {
      if (!oldSlot) return;
      oldSlot.classList.add('character-exit');
      schedule(() => oldSlot.remove(), 360);
      return;
    }

    if (oldSlot && previous?.id === character.id) {
      oldSlot.dataset.character = character.id;
      const figure = oldSlot.querySelector('.character-figure');
      const oldImages = [...figure.querySelectorAll('.character')];
      const image = createImage(character, 'expression-enter');
      figure.append(image);
      oldImages.forEach((old) => old.classList.add('expression-exit'));
      schedule(() => oldImages.forEach((old) => old.remove()), 320);
      applySpeaker();
      return;
    }

    const slot = createSlot(pos, character);
    if (action === 'fadeIn') slot.classList.add('character-enter');
    container.append(slot);
    if (oldSlot) {
      oldSlot.classList.add('character-exit');
      schedule(() => oldSlot.remove(), 360);
    }
    applySpeaker();
  }

  const api = {
    show(id, expr, pos, action) {
      // CGは次の明示的な立ち絵表示までの一拍だけ保持し、ここで復帰させる。
      container.__screenControls?.clearCgForCharacter?.();
      const previous = positions[pos];
      positions = transitionCharacterPositions(positions, { id, expr, pos, action });
      renderCommand(pos, previous, positions[pos], action || 'replace');
    },
    clear() {
      positions = {};
      speaker = null;
      removalTimers.forEach(clearTimeout);
      removalTimers.clear();
      container.replaceChildren();
    },
    setSpeaker(characterId) {
      speaker = spriteId(characterId);
      applySpeaker();
    },
    setInstant(value) {
      instant = Boolean(value);
      container.classList.toggle('character-layer--instant', instant);
      if (instant) {
        removalTimers.forEach(clearTimeout);
        removalTimers.clear();
        container.querySelectorAll('.character-exit, .expression-exit').forEach((element) => element.remove());
      }
    },
    setCinematicVisible(value) {
      container.classList.toggle('is-cg-active', Boolean(value));
    },
  };
  // screen.js がCGの表示・解除に合わせて、DOM越しにこのUI層だけを退場させる。
  container.__characterLayer = api;
  return api;
}
