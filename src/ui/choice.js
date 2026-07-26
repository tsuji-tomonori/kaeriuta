export function createChoice(container) {
  let pickTimer = null;
  let section = null;

  function clear() {
    if (pickTimer !== null) clearTimeout(pickTimer);
    pickTimer = null;
    section = null;
    container.classList.remove('choice-active');
    container.replaceChildren();
  }

  return {
    show(prompt, options, select) {
      clear();
      const wrapper = document.createElement('div');
      wrapper.className = 'choice-wrapper';
      section = document.createElement('section');
      section.className = 'choices';
      section.tabIndex = -1;
      const heading = document.createElement('p');
      heading.className = 'choice-prompt';
      heading.textContent = prompt;
      section.append(heading);
      wrapper.append(section);
      container.append(wrapper);
      container.classList.add('choice-active');

      let picked = false;
      const buttons = options.map((option, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = option.label;
        button.style.setProperty('--choice-index', index);
        button.addEventListener('click', () => {
          if (picked) return;
          picked = true;
          section.classList.add('choice-picked');
          button.classList.add('is-picked');
          buttons.forEach((other) => { other.disabled = true; });
          pickTimer = setTimeout(() => {
            pickTimer = null;
            select(option);
          }, 220);
        });
        section.append(button);
        return button;
      });

      section.addEventListener('keydown', (event) => {
        if (picked || buttons.length === 0) return;
        const current = buttons.indexOf(document.activeElement);
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const direction = event.key === 'ArrowDown' ? 1 : -1;
          buttons[(current + direction + buttons.length) % buttons.length].focus();
        } else if (/^[1-9]$/.test(event.key) && buttons[Number(event.key) - 1]) {
          event.preventDefault();
          buttons[Number(event.key) - 1].click();
        } else if (event.key === 'Enter' && current < 0) {
          event.preventDefault();
          buttons[0].click();
        }
      });
      buttons[0]?.focus();
    },
    clear,
  };
}
