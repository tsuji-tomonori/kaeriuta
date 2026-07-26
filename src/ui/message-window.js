export function createMessageWindow(container, onAdvance) {
  container.innerHTML = `<section class="message-window" hidden><div class="speaker"></div><div class="message-text"></div><button class="advance" type="button">次へ</button></section>`;
  const box = container.firstElementChild; const speaker = box.querySelector('.speaker'); const text = box.querySelector('.message-text');
  box.addEventListener('click', onAdvance);
  box.querySelector('.advance').addEventListener('click', (event) => { event.stopPropagation(); onAdvance(); });
  return {
    show(who, value, mono = false, showAdvance = true) { box.hidden = false; box.classList.toggle('monologue', mono); speaker.textContent = who || (mono ? '栞・モノローグ' : ''); text.textContent = value; box.querySelector('.advance').hidden = !showAdvance; },
    hide() { box.hidden = true; },
  };
}
