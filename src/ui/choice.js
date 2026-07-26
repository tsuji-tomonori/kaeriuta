export function createChoice(container) {
  return {
    show(prompt, options, select) {
      container.innerHTML = `<section class="choices"><p>${prompt}</p></section>`; const section = container.firstElementChild;
      options.forEach((option) => { const b = document.createElement('button'); b.textContent = option.label; b.addEventListener('click', () => select(option)); section.append(b); });
    },
    clear() { container.innerHTML = ''; },
  };
}
