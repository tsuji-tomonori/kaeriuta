import { modal, finish, stateOf, condition, displayText } from '../common.js';
import { flags } from '../../data/flags.js';
import { mansionRooms, roomsByFloor, roomActionIndex, roomRect, roomStatus } from '../../data/mansion-map.js';
import { explorationHintsEnabled } from '../../engine/progress.js';

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
export function selectRoom(model, roomId) {
  return mansionRooms.some((room) => room.id === roomId) ? { ...model, selectedRoom: roomId } : model;
}

const defaults = [
  { id:'study', room:'study', label:'書斎を調べる', desc:'献辞の消し跡', reward:[{t:'flag',id:'dedication_erasure'}], risk:[] },
  { id:'housekeeper', room:'laundry', label:'家政婦と話す', desc:'地下の物音', reward:[{t:'flag',id:'basement_sound'}], risk:[] },
  { id:'explore', room:'corridor2', label:'館を探索する', desc:'寸法の不一致', reward:[{t:'flag',id:'hidden_dimension'}], risk:[] },
];

const floorLabels = { '1f':'一階', '2f':'二階', under:'地下・屋外' };
function roomName(roomId) { return mansionRooms.find((room) => room.id === roomId)?.name || '館のどこか'; }
function floorViewBox(floor) {
  const rects = roomsByFloor(floor).map(roomRect);
  const minX = Math.min(...rects.map((rect) => rect.x));
  const minY = Math.min(...rects.map((rect) => rect.y));
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
  const padding = 1;
  return `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;
}
function mapMarkup(model, actions) {
  const floor = mansionRooms.find((room) => room.id === model.selectedRoom)?.floor || '1f';
  const indexed = roomActionIndex(actions);
  const tabs = Object.entries(floorLabels).map(([id, label]) => `<span class="mansion-floor-tab${id === floor ? ' is-selected' : ''}" role="button" tabindex="0" data-floor="${id}" aria-pressed="${id === floor}">${label}</span>`).join('');
  const rooms = roomsByFloor(floor).map((room) => {
    const status = roomStatus(room, actions, model.used, model.state);
    const rect = roomRect(room);
    const selected = room.id === model.selectedRoom;
    const classes = ['mansion-room'];
    if (!status.revealed) classes.push('is-unknown');
    if (status.revealed && status.remaining) classes.push('has-action');
    if (status.done) classes.push('is-done');
    if (selected) classes.push('is-selected');
    const label = status.revealed ? room.name : '？';
    const count = status.revealed && status.remaining ? `<text class="mansion-room-count" x="${rect.x + rect.width - 3}" y="${rect.y + rect.height - 3}" text-anchor="end">${status.remaining}</text>` : '';
    return `<g class="${classes.join(' ')}" role="button" tabindex="0" data-room="${room.id}" aria-label="${label}" aria-pressed="${selected}"><rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}"/><text x="${rect.x + rect.width / 2}" y="${rect.y + rect.height / 2}" text-anchor="middle" dominant-baseline="middle">${label}</text>${count}</g>`;
  }).join('');
  const selectedRoom = mansionRooms.find((room) => room.id === model.selectedRoom) || roomsByFloor(floor)[0];
  const status = roomStatus(selectedRoom, actions, model.used, model.state);
  const available = (indexed[selectedRoom.id] || []).filter((action) => !model.used.includes(action.id));
  const detail = !status.revealed
    ? `<h2>？</h2><p>この区画のことは、まだ何も分かっていない。</p>`
    : `<h2>${displayText(selectedRoom.name)}</h2><p>${displayText(selectedRoom.desc)}</p>${available.length ? `<h3>ここでできること</h3><div class="mansion-room-actions">${available.map((action) => { const preview = previewLineLabels(action, model.hintsEnabled); return `<button data-id="${displayText(action.id)}"><strong>${displayText(action.label)}</strong>${preview.length ? `<span class="freeaction-lines">見込める手掛かり：${preview.map(displayText).join('・')}</span>` : ''}</button>`; }).join('')}</div>` : '<p>いまここで、できることはない。</p>'}`;
  return `<div class="mansion-floor-tabs">${tabs}</div><svg class="mansion-map" viewBox="${floorViewBox(floor)}" role="img" aria-label="${floorLabels[floor]}の館の見取り図">${rooms}</svg><section class="mansion-room-detail">${detail}</section>`;
}

export const freeAction = { async start(ctx, args = {}) {
  const actions = args.actions || defaults;
  const hintsEnabled = explorationHintsEnabled(globalThis.localStorage);
  let model = { state: stateOf(ctx), remaining: args.blocks ?? 3, used: [], effects: [], phase: FREE_ACTION_PHASE.SELECTING, currentAction: null, selectedRoom: 'study', hintsEnabled };
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
      modalView.main.innerHTML = `<p>残り <b>${displayText(model.remaining, 0)}</b> ブロック。行動を選ぶと時間を1つ使います。選ばなかった場所にも別の情報があります。</p>${countNotice}${acquired.length ? `<p class="freeaction-used">探索済み：${acquired.map(displayText).join('／')}</p>` : ''}${mapMarkup(model, actions)}<h3 class="freeaction-list-heading">館のどこでも選べる行動</h3><div class="action-list">${choices.map((action) => { const preview = previewLineLabels(action, hintsEnabled); const focused = action.room === model.selectedRoom ? ' is-focused' : ''; return `<button class="${focused.trim()}" data-id="${displayText(action.id)}"><strong>${displayText(action.label)}</strong><span class="freeaction-room">${displayText(roomName(action.room))}</span>${preview.length ? `<span class="freeaction-lines">見込める手掛かり：${preview.map(displayText).join('・')}</span>` : ''}</button>`; }).join('')}</div><button id="done">自由行動を切り上げる</button>`;
      const chooseAction = (id) => { model = selectFreeAction(model, choices.find((action) => action.id === id)); render(); };
      modalView.main.querySelectorAll('[data-id]').forEach((button) => {
        button.onclick = () => chooseAction(button.dataset.id);
      });
      modalView.main.querySelectorAll('[data-room]').forEach((room) => {
        const select = () => { model = selectRoom(model, room.dataset.room); render(); };
        room.onclick = select;
        room.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } };
      });
      modalView.main.querySelectorAll('[data-floor]').forEach((tab) => {
        const select = () => { model = { ...model, selectedRoom: roomsByFloor(tab.dataset.floor)[0].id }; render(); };
        tab.onclick = select;
        tab.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } };
      });
      modalView.main.querySelector('#done').onclick = done;
    };
    modalView.close.onclick = done;
    render();
  });
} };
