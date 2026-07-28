export function createMessageWindow(container, onAdvance, options = {}) {
  container.innerHTML = `<section class="message-window" hidden><div class="speaker"></div><div class="message-text"></div><button class="advance" type="button">次へ</button></section>`;
  const box = container.firstElementChild;
  const speaker = box.querySelector('.speaker');
  const text = box.querySelector('.message-text');
  const advanceButton = box.querySelector('.advance');
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const charactersPerSecond = Number(options.charactersPerSecond) || 38;
  let speed = 1;
  let timer = null;
  let glyphs = [];
  let cursor = 0;
  let fullText = '';
  let revealing = false;
  let showAdvance = true;

  function stopTimer() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  function finishReveal() {
    stopTimer();
    text.textContent = fullText;
    text.scrollTop = text.scrollHeight;
    cursor = glyphs.length;
    revealing = false;
    advanceButton.hidden = !showAdvance;
    box.classList.add('reveal-complete');
  }

  function revealNext() {
    if (!revealing) return;
    cursor += 1;
    text.textContent = glyphs.slice(0, cursor).join('');
    text.scrollTop = text.scrollHeight;
    if (cursor >= glyphs.length) {
      finishReveal();
      return;
    }
    const glyph = glyphs[cursor - 1];
    const punctuationPause = glyph === '、' ? 80 : glyph === '。' ? 160 : 0;
    const delay = (1000 / charactersPerSecond + punctuationPause) / speed;
    timer = setTimeout(revealNext, delay);
  }

  function handleAdvance(event) {
    event?.stopPropagation?.();
    if (revealing) {
      finishReveal();
      return;
    }
    onAdvance?.();
  }

  box.addEventListener('click', handleAdvance);
  advanceButton.addEventListener('click', handleAdvance);

  return {
    show(who, value, mono = false, showAdvanceValue = true) {
      stopTimer();
      fullText = String(value ?? '');
      glyphs = Array.from(fullText);
      cursor = 0;
      showAdvance = showAdvanceValue;
      box.hidden = false;
      box.classList.remove('reveal-complete', 'monologue', 'stage-direction', 'dialogue');
      const stageDirection = mono === 'stage';
      box.classList.add(stageDirection ? 'stage-direction' : mono ? 'monologue' : 'dialogue');
      speaker.textContent = who || (stageDirection ? '―― 場面 ――' : mono ? '栞・心内' : '');
      speaker.hidden = !speaker.textContent;
      text.textContent = '';
      advanceButton.hidden = true;
      revealing = glyphs.length > 0;
      if (reducedMotion || options.instant) finishReveal();
      else revealNext();
    },
    hide() {
      stopTimer();
      revealing = false;
      box.hidden = true;
    },
    isRevealing() { return revealing; },
    completeReveal() { if (revealing) finishReveal(); },
    setSpeed(rate) {
      const numericRate = Number(rate);
      speed = Number.isFinite(numericRate) ? Math.min(8, Math.max(0.25, numericRate)) : 1;
    },
  };
}
