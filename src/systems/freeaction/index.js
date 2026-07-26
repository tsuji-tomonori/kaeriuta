import { modal, finish, stateOf, condition, displayText } from '../common.js';
import { flags } from '../../data/flags.js';

const lineHint = { past: '🕯 過去', plan: '📜 計画', alive: '👁 生存' };
function actionLines(action) {
  return [...new Set((action.reward || []).filter((effect) => effect.t === 'flag')
    .map((effect) => flags[effect.id]?.line).filter(Boolean))];
}
export function acquiredLineLabels(action) {
  return actionLines(action).map((line) => lineHint[line]);
}
export function previewLineLabels(action, hintsEnabled = false) {
  return hintsEnabled ? acquiredLineLabels(action) : [];
}
function flagCounts(state) {
  return Object.fromEntries(Object.keys(lineHint).map((line) => [line, (state.flags?.[line] || []).length]));
}

export const FREE_ACTION_PHASE = Object.freeze({ SELECTING: 'selecting', READING: 'reading', FINISHED: 'finished' });

function stateAfter(state, effects) {
  const next = structuredClone(state);
  next.flags ||= { past: [], plan: [], alive: [] }; next.items ||= [];
  for (const effect of effects) {
    if (effect.t === 'flag' && flags[effect.id]) {
      const line = flags[effect.id].line; next.flags[line] ||= [];
      if (!next.flags[line].includes(effect.id)) next.flags[line].push(effect.id);
    }
    if (effect.t === 'item' && !next.items.includes(effect.id)) next.items.push(effect.id);
  }
  return next;
}
export function consumeBlock(model, action) {
  if (model.remaining <= 0 || model.used.includes(action.id)) return model;
  const risk = (action.risk || []).filter((effect) => !effect.when || condition({ state: model.state }, effect.when));
  const gained = [...(action.reward || []), ...risk];
  return { ...model, state: stateAfter(model.state, gained), remaining: model.remaining - 1, used: [...model.used, action.id], effects: [...model.effects, ...gained] };
}

// These transitions deliberately contain no DOM work so that the completion
// rules stay testable independently of a modal or a browser.
export function selectFreeAction(model, action) {
  if (model.phase !== FREE_ACTION_PHASE.SELECTING) return model;
  const next = consumeBlock(model, action);
  return next === model ? model : { ...next, phase: FREE_ACTION_PHASE.READING, currentAction: action };
}

export function continueFreeAction(model, actions) {
  if (model.phase !== FREE_ACTION_PHASE.READING) return model;
  const hasAvailableAction = actions.some((action) => !model.used.includes(action.id));
  return { ...model, phase: model.remaining > 0 && hasAvailableAction ? FREE_ACTION_PHASE.SELECTING : FREE_ACTION_PHASE.FINISHED, currentAction: null };
}

export function closeFreeAction(model) {
  return { ...model, phase: FREE_ACTION_PHASE.FINISHED, currentAction: null };
}

const defaults = [
  { id:'study', label:'書斎を調べる', desc:'献辞の消し跡', reward:[{t:'flag',id:'dedication_erasure'}], risk:[] },
  { id:'housekeeper', label:'家政婦と話す', desc:'地下の物音', reward:[{t:'flag',id:'basement_sound'}], risk:[] },
  { id:'explore', label:'館を探索する', desc:'寸法の不一致', reward:[{t:'flag',id:'hidden_dimension'}], risk:[] },
];

export const freeAction = { async start(ctx, args = {}) {
  const actions = args.actions || defaults;
  const hintsEnabled = globalThis.localStorage?.getItem('kaeriuta-exploration-hints') === 'on';
  let model = { state: stateOf(ctx), remaining: args.blocks ?? 3, used: [], effects: [], phase: FREE_ACTION_PHASE.SELECTING, currentAction: null };
  return new Promise((resolve) => {
    const modalView = modal(ctx, `第${args.day || 1}章・自由行動`);
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      model = closeFreeAction(model);
      finish(modalView.root, resolve, { effects: [...model.effects, { t:'log', key:`free_action_day${args.day || 1}`, value:model.used.join(',') }], remaining:model.remaining });
    };
    const render = () => {
      if (model.phase === FREE_ACTION_PHASE.FINISHED) return done();
      if (model.phase === FREE_ACTION_PHASE.READING) {
        const action = model.currentAction;
        const acquired = acquiredLineLabels(action);
        const acquiredNotice = acquired.length ? `<p class="freeaction-acquired">取得した情報：${acquired.map(displayText).join('・')}</p>` : '<p class="freeaction-acquired">この行動で得た内容は、後の会話や判断に反映されます。</p>';
        modalView.main.innerHTML = `<article class="freeaction-narrative"><h2>${displayText(action.label)}</h2><div class="freeaction-narrative-body"><p>${displayText(action.narrative, `${displayText(action.desc, '情報')}を得た。`)}</p>${acquiredNotice}</div><footer><button id="next">${model.remaining > 0 && actions.some((item) => !model.used.includes(item.id)) ? '次の行動を選ぶ' : '自由行動を終える'}</button></footer></article>`;
        modalView.main.querySelector('#next').onclick = () => { model = continueFreeAction(model, actions); render(); };
        return;
      }
      const choices = actions.filter((action) => !model.used.includes(action.id));
      if (model.remaining <= 0 || choices.length === 0) return done();
      const acquired = model.used.map((id) => actions.find((action) => action.id === id)?.label).filter(Boolean);
      const counts = hintsEnabled ? flagCounts(model.state) : null;
      const countNotice = counts ? `<p class="freeaction-counts">所持：🕯 過去 ${counts.past}　📜 計画 ${counts.plan}　👁 生存 ${counts.alive}</p>` : '';
      modalView.main.innerHTML = `<p>残り <b>${displayText(model.remaining, 0)}</b> ブロック。行動を選ぶと時間を1つ使います。選ばなかった場所にも別の情報があります。</p>${countNotice}${acquired.length ? `<p class="freeaction-used">探索済み：${acquired.map(displayText).join('／')}</p>` : ''}<div class="action-list">${choices.map((action) => { const preview = previewLineLabels(action, hintsEnabled); return `<button data-id="${displayText(action.id)}"><strong>${displayText(action.label)}</strong>${preview.length ? `<span class="freeaction-lines">見込める手掛かり：${preview.map(displayText).join('・')}</span>` : ''}</button>`; }).join('')}</div><button id="done">自由行動を切り上げる</button>`;
      modalView.main.querySelectorAll('[data-id]').forEach((button) => {
        button.onclick = () => { model = selectFreeAction(model, choices.find((action) => action.id === button.dataset.id)); render(); };
      });
      modalView.main.querySelector('#done').onclick = done;
    };
    modalView.close.onclick = done;
    render();
  });
} };
