export function createMessageWindow(container, onAdvance) {
  container.innerHTML = `<section class="message-window" hidden><div class="speaker"></div><div class="message-text"></div><div class="advance">◆</div></section>`;
  const box = container.firstElementChild; const speaker = box.querySelector('.speaker'); const text = box.querySelector('.message-text');
  box.addEventListener('click', onAdvance);
  return {
    show(who, value, mono = false) { box.hidden = false; box.classList.toggle('monologue', mono); speaker.textContent = who || (mono ? '栞・モノローグ' : ''); text.textContent = value; },
    hide() { box.hidden = true; },
  };
}
