import { screenRoot, finish, stateOf, condition, displayText } from '../common.js';
import { flags } from '../../data/flags.js';
import { items } from '../../data/items.js';
import { mansionRooms, roomsByFloor, roomActionIndex, roomRect, roomStatus } from '../../data/mansion-map.js';
import { explorationHintsEnabled } from '../../engine/progress.js';
import { isDialogOpen, showConfirm, showNotice } from '../../ui/dialog.js';
import { showPlayGuide } from '../../ui/play-guide.js';
import { chapter1 } from '../../data/scenario/chapter1.js';
import { chapter2 } from '../../data/scenario/chapter2.js';
import { powerWord } from '../rebuttal/power.js';
import { changeParam, createParams } from '../../engine/params.js';

const lineHint = { past: '🕯 過去', plan: '📜 計画', alive: '👁 生存' };
function actionLines(action) {
  return [...new Set([...(action.reward || []), ...(action.scenes?.focus?.options || []).flatMap(option => option.effects || [])].filter((effect) => effect.t === 'flag')
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

export const FREE_ACTION_PHASE = Object.freeze({ SELECTING: 'selecting', FOCUSING: 'focusing', READING: 'reading', FINISHED: 'finished' });

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
  if (model.phase !== FREE_ACTION_PHASE.SELECTING || !action) return model;
  const next = consumeBlock(model, action);
  return next === model ? model : { ...next, openRoomId: null, phase: action.scenes?.focus?.options?.length ? FREE_ACTION_PHASE.FOCUSING : FREE_ACTION_PHASE.READING, currentAction: action, focusResult: null };
}

export function focusFreeAction(model, focusId) {
  if (model.phase !== FREE_ACTION_PHASE.FOCUSING) return model;
  const focus = model.currentAction?.scenes?.focus?.options?.find((option) => option.id === focusId);
  if (!focus) return model;
  const effects = focus.effects || [];
  return { ...model, state: stateAfter(model.state, effects), effects: [...model.effects, ...effects], phase: FREE_ACTION_PHASE.READING, focusResult: focus };
}

export function continueFreeAction(model, actions) {
  if (model.phase !== FREE_ACTION_PHASE.READING) return model;
  const hasAvailableAction = actions.some((action) => !model.used.includes(action.id));
  return { ...model, phase: model.remaining > 0 && hasAvailableAction ? FREE_ACTION_PHASE.SELECTING : FREE_ACTION_PHASE.FINISHED, currentAction: null, focusResult: null };
}

export function closeFreeAction(model) {
  return { ...model, phase: FREE_ACTION_PHASE.FINISHED, currentAction: null, focusResult: null };
}
export function selectRoom(model, roomId) {
  return mansionRooms.some((room) => room.id === roomId) ? { ...model, selectedRoom: roomId } : model;
}
export function openRoomPanel(model, roomId) {
  return mansionRooms.some((room) => room.id === roomId) ? { ...model, selectedRoom: roomId, openRoomId: roomId } : model;
}
export function closeRoomPanel(model) {
  return model.openRoomId === null || model.openRoomId === undefined ? model : { ...model, openRoomId: null };
}

const defaults = [
  { id:'study', room:'study', label:'書斎で初版本の痕を読む', desc:'献辞の消し跡', reward:[{t:'flag',id:'dedication_erasure'}], risk:[] },
  { id:'housekeeper', room:'laundry', label:'洗濯室で志津の記憶を聞く', desc:'地下の物音', reward:[{t:'flag',id:'basement_sound'}], risk:[] },
  { id:'explore', room:'corridor2', label:'二階廊下から壁と裏道を探る', desc:'寸法の不一致', reward:[{t:'flag',id:'hidden_dimension'}], risk:[] },
];

// 発見の本文と注目先の報酬はシナリオを正本にする。
const scenarioFreeActions = [chapter1, chapter2].flatMap((chapter) => chapter.nodes)
  .filter((node) => node.t === 'call' && node.part === 'freeAction')
  .flatMap((node) => node.args.actions);
export const actionDetails = Object.fromEntries(scenarioFreeActions.map((action) => [action.id, {
  gain: action.use,
  scenes: {
    intro: action.narrative.intro,
    reaction: action.narrative.reaction,
    focus: { ...action.scenes.focus, options: action.scenes.focus.options.map((option) => ({
      ...option, text: action.narrative.discoveries[option.id],
    })) },
  },
}]));
export function enrichFreeActions(actions) {
  return actions.map((action) => {
    const scenarioAction = scenarioFreeActions.find((item) => item.id === action.id);
    return { ...scenarioAction, ...action, ...actionDetails[action.id], risk: [...(action.risk ?? scenarioAction?.risk ?? [])] };
  });
}

const paramNames = { suspicion:'疑惑', conviction:'確信', trust:'信頼', awareness:'警戒', overknow:'知りすぎ', conscience:'良心', agitation:'動揺' };
export function freeActionParamPreview(state, effects) {
  const before = { ...createParams(), ...state.params };
  const after = effects.filter((effect) => effect.t === 'param')
    .reduce((params, effect) => changeParam(params, effect.key, effect.delta), before);
  return Object.keys(before).filter((key) => after[key] !== before[key])
    .map((key) => `${paramNames[key] || '状態'} ${before[key]} → ${after[key]}`);
}
function pendingChangesMarkup(model) {
  if (!model.used.length) return '';
  const changes = freeActionParamPreview(model.state, model.effects);
  return `<section class="fa-acquired" aria-label="数値の反映予定"><strong>ここまでの行動による数値の反映予定</strong><p>${changes.length ? changes.map(displayText).join(' ／ ') : '数値の変化なし'}</p><small>自由行動を終えると、画面上部の数値や手帳にもまとめて反映されます。</small></section>`;
}
function paramText(effect) {
  const name = paramNames[effect.key] || '状態';
  return `${name}が${Math.abs(effect.delta)}${effect.delta >= 0 ? '増す' : '下がる'}`;
}
export function costDescription(action) {
  const fixed = (action.risk || []).filter((effect) => effect.t === 'param').map(paramText);
  const conditional = (action.scenes?.focus?.options || []).map((option) => ({
    label: option.label,
    effects: (option.effects || []).filter((effect) => effect.t === 'param').map(paramText),
  })).filter(({ effects }) => effects.length);
  return `${fixed.length ? fixed.join('、') : '数値の変化なし'}${conditional.map(({ label, effects }) => `\n（「${label}」を選ぶと、さらに ${effects.join('、')}）`).join('')}`;
}

export function freeActionGoal(day, actions, used = []) {
  const opening = day === 1;
  const preferred = opening ? 'accomplice_room' : 'kitchen';
  const suggested = actions.find((action) => action.id === preferred && !used.includes(action.id));
  return {
    title: opening ? '自分の足取りと、共犯計画を確かめる' : '計画と事件を照合し、手毬唄ボードで整理する',
    detail: opening
      ? '恩田の死で計画が動き出しました。昨夜の行動を説明できる記録や、仲間の指示を確かめましょう。'
      : '尋問はひとまず終わりました。計画と実際の事件の食い違いを調べ、次の手毬唄ボードで整理しましょう。証拠は、その後の推理や反論にも使えます。',
    suggested,
    next: suggested ? `迷ったら「${suggested.label}」から。${opening ? '仲間の指示書を確認できます。' : '配膳の記録を確認できます。'}ほかの行動から始めても構いません。`
      : '得た情報を踏まえ、自分を守る記録を集めるか、館の違和感を追うかを選びましょう。',
  };
}

const floorLabels = { '1f':'一階', '2f':'二階', under:'地下・屋外' };
function roomName(roomId) { return mansionRooms.find((room) => room.id === roomId)?.name || '館のどこか'; }
export const PARAM_GUIDE = '疑惑：探偵の注視と終盤の逃走に響く。警戒：告白後、命を狙われる危険に響く。良心：庇う・疑いを向ける選択の積み重ねが、章末の帳簿に残る。信頼：少年の助力や合図に響く。知りすぎ：反論で少年の注視を強める。';
export function narrativeMarkup(text) {
  return displayText(text).split(/\n\s*\n/).filter(Boolean).map(paragraph => `<p>${displayText(paragraph)}</p>`).join('');
}
export function rewardNames(effects) {
  return effects.flatMap(effect => {
    const meta = effect.t === 'flag' ? flags[effect.id] : effect.t === 'item' ? items[effect.id] : null;
    return meta ? [`${effect.t === 'flag' ? '手掛かり' : '反論札'}「${meta.name}」`] : [];
  });
}
export function compactRewards(effects) {
  return [['flag', '手掛かり', flags], ['item', '反論札', items]].flatMap(([type, title, catalog]) => {
    const names = effects.filter(e => e.t === type && catalog[e.id]).map(e => catalog[e.id].name);
    return names.length ? [`${title}：${names.join('・')}`] : [];
  }).join('／') || '手掛かり・反論札なし';
}
export function focusPreview(action, option) {
  const rewards = rewardNames([...(action.reward || []), ...(option.effects || [])]);
  const changes = (option.effects || []).filter(effect => effect.t === 'param').map(paramText);
  return `${rewards.join('／') || '手掛かり・反論札なし'}｜${changes.join('、') || '追加の数値変化なし'}`;
}
function fixedCostDescription(action) {
  return (action.risk || []).filter(effect => effect.t === 'param').map(paramText).join('、') || '数値の変化なし';
}
export function actionPreview(action) {
  return `<span class="freeaction-use">${displayText(action.use, action.gain || action.desc || '気になる痕を確かめる。')}</span><span class="freeaction-cost">${displayText(fixedCostDescription(action))}${action.scenes?.focus?.options?.some(o => o.effects?.some(e => e.t === 'param')) ? '｜注目先で追加の変化あり' : ''}</span>`;
}
export function effectNotices(effects) {
  const notices = [];
  for (const effect of effects) {
    if (effect.t === 'flag' && flags[effect.id]) notices.push(`手掛かり「${flags[effect.id].name}」を獲得　内容：${flags[effect.id].desc}`);
    if (effect.t === 'item') {
      const meta = items[effect.id];
      if (!meta) continue;
      const power = powerWord[meta.power];
      const exposure = meta?.exposure ?? null;
      notices.push(`反論札「${meta.name}」を獲得${power ? `　効き目：${power}` : ''}${exposure ? `　危険：${exposure}` : ''}`);
    }
  }
  return notices;
}
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
  return `<div class="mansion-floor-tabs">${tabs}</div><svg class="mansion-map" viewBox="${floorViewBox(floor)}" role="img" aria-label="${floorLabels[floor]}の館の見取り図">${rooms}</svg>`;
}

function roomPanelMarkup(model, actions) {
  const room = mansionRooms.find((item) => item.id === model.openRoomId);
  if (!room) return '';
  const status = roomStatus(room, actions, model.used, model.state);
  const available = (roomActionIndex(actions)[room.id] || []).filter((action) => !model.used.includes(action.id));
  const contents = !status.revealed
    ? '<p>この区画のことは、まだ何も分かっていない。</p>'
    : `<p>${displayText(room.desc)}</p>${available.length ? `<h3>ここでできること</h3><div class="mansion-room-actions">${available.map((action) => `<button data-room-action="${displayText(action.id)}"><strong>${displayText(action.label)}</strong>${actionPreview(action, model.hintsEnabled)}<span class="fa-row-cost">行動1回を消費して開始</span></button>`).join('')}</div>` : '<p>いまここで、できることはない。</p>'}`;
  return `<div class="parts-panel mansion-room-panel" role="dialog" aria-modal="true" aria-labelledby="mansion-room-title"><header><h2 id="mansion-room-title">${status.revealed ? displayText(room.name) : '？'}</h2><button class="mansion-room-close" aria-label="閉じる">×</button></header><main>${contents}<footer><button class="mansion-room-return">見取り図に戻る</button></footer></main></div>`;
}

export const freeAction = { async start(ctx, args = {}) {
  const actions = enrichFreeActions(args.actions || defaults);
  const hintsEnabled = explorationHintsEnabled(globalThis.localStorage);
  const totalBlocks = args.blocks ?? 3;
  let model = { state: stateOf(ctx), remaining: totalBlocks, used: [], effects: [], phase: FREE_ACTION_PHASE.SELECTING, currentAction: null, focusResult: null, selectedRoom: 'study', openRoomId: null, hintsEnabled };
  let filter = 'all';
  let briefing = totalBlocks > 0 && actions.length > 0;
  model.selectedRoom = freeActionGoal(args.day || 1, actions).suggested?.room || model.selectedRoom;
  return new Promise((resolve) => {
    const { root, stage } = screenRoot(ctx);
    root.classList.add('fa-screen');
    let resolved = false;
    const done = () => {
      if (resolved) return;
      resolved = true;
      model = closeFreeAction(model);
      finish(root, resolve, { effects: [...model.effects, { t:'log', key:`free_action_day${args.day || 1}`, value:model.used.join(',') }], remaining:model.remaining });
    };
    const requestEnd = async () => {
      if (isDialogOpen() || resolved) return;
      if (model.phase === FREE_ACTION_PHASE.FOCUSING || model.phase === FREE_ACTION_PHASE.READING) {
        await showNotice({ mount: root, title: '選んだ行動を終えてから', body: '注目する点を選び、結果を読んでください。「次の行動を選ぶ」へ進んだあとで探索を切り上げられます。', okLabel: '行動に戻る' });
        return;
      }
      const accepted = await showConfirm({ mount: root, title: '自由行動を切り上げますか？', body: `残り${model.remaining}回の行動を使わずに、次の場面へ進みます。この自由行動には戻れません。`, okLabel: '切り上げて進む', cancelLabel: '探索を続ける' });
      if (accepted && !resolved) done();
    };
    root.addEventListener('click', (event) => {
      if (event.target.closest?.('[data-free-help]') && !isDialogOpen()) showPlayGuide({ mount: root });
    });
    const pips = () => Array.from({ length: totalBlocks }, (_, index) => `<span class="fa-pip ${index < model.remaining ? 'is-full' : ''}"></span>`).join('');
    const topbar = (title, extra = '') => `<div class="ku-topbar"><span class="ku-chip">自由行動</span><span class="ku-meta">第${args.day || 1}章${title ? ` ／ ${displayText(title)}` : ''}</span>${extra}<button class="ku-secondary fa-help" data-free-help>遊び方</button><button class="ku-close" aria-label="自由行動を切り上げる">×</button></div>`;
    const render = () => {
      root.dataset.phase = model.phase;
      if (model.phase === FREE_ACTION_PHASE.FINISHED) return done();
      const goal = freeActionGoal(args.day || 1, actions, model.used);
      if (briefing) {
        stage.innerHTML = `${topbar('行動を選ぶ前に')}
          <section class="fa-briefing" aria-labelledby="fa-goal-title">
            <p class="fa-narrative-prompt">いまの目的</p><h1 id="fa-goal-title">${displayText(goal.title)}</h1>
            <p>${displayText(goal.detail)}</p>
            <p class="fa-suggestion">${displayText(goal.next)}</p>
            <h2>行動の選び方</h2>
            <ol><li>一覧で、行動の内容と数値の変化を読みます。</li><li>行動ボタンをクリック／タップすると開始。<strong>1つ選ぶと残り回数が1減ります。</strong></li><li>注目先で持ち帰るものが変わります。ボタンにある手掛かり・反論札と追加の数値変化を見て、一つ選びます。</li><li>結果を読んで次の行動へ。証拠は後の推理や反論に使えます。</li></ol>
            <p>今回は<strong>${totalBlocks}回</strong>行動できます。読む・考える・見取り図を見るだけでは時間は進みません。すべてを調べる時間はないので、知りたいことを選んでください。</p>
          </section><div class="ku-thumbzone"><button class="ku-primary" id="begin-exploration">行動一覧へ</button><span class="ku-primary-hint">この操作では行動回数を消費しません</span></div>`;
        stage.querySelector('#begin-exploration').onclick = () => { briefing = false; render(); };
        stage.querySelector('.ku-close').onclick = requestEnd;
        stage.querySelector('#begin-exploration').focus();
        return;
      }

      if (model.phase === FREE_ACTION_PHASE.FOCUSING) {
        const action = model.currentAction;
        const focus = action.scenes.focus;
        stage.innerHTML = `${topbar(action.label)}<div class="fa-narrative">${narrativeMarkup(action.scenes.intro)}<p class="fa-narrative-prompt">${displayText(focus.prompt, 'どこを見る？')}</p><small>注目する点を一つ選ぶと、その先の発見を読みます。追加の行動回数は使いません。</small></div><div class="ku-thumbzone"><div class="ku-hand">${focus.options.map((option) => `<button class="ku-card" data-focus="${displayText(option.id)}"><span class="ku-card-name">${displayText(option.label)}</span><span class="fa-focus-change">${displayText(focusPreview(action, option))}</span></button>`).join('')}</div></div>`;
        stage.querySelectorAll('[data-focus]').forEach((button) => { button.onclick = () => { model = focusFreeAction(model, button.dataset.focus); render(); }; });
        stage.querySelector('.ku-close').onclick = requestEnd;
        return;
      }
      if (model.phase === FREE_ACTION_PHASE.READING) {
        const action = model.currentAction;
        const notices = effectNotices([...(action.reward || []), ...(model.focusResult?.effects || [])]);
        const discovery = model.focusResult?.text || action.scenes?.discovery || action.narrative || `${displayText(action.desc, '情報')}を得た。`;
        const reaction = action.scenes?.reaction || '';
        const acquiredNotice = notices.length ? `<div class="fa-acquired">${notices.map((notice) => `<p>${displayText(notice)}</p>`).join('')}</div>` : `<p class="fa-acquired">手掛かり・反論札なし。得たこと：${displayText(action.use, 'この場面で知ったことを胸に留めた。')}</p>`;
        stage.innerHTML = `${topbar(action.label)}<div class="fa-narrative ku-scroll">${narrativeMarkup(discovery)}${narrativeMarkup(reaction)}</div><aside class="fa-takeaway"><h2>持ち帰ったもの</h2><p class="fa-acquired">${displayText(compactRewards([...(action.reward || []), ...(model.focusResult?.effects || [])]))}</p>${pendingChangesMarkup(model)}<details class="fa-reward-details"><summary>内容・札の性質</summary>${acquiredNotice}</details></aside><div class="ku-thumbzone fa-result-controls"><div class="fa-result-summary"><span>${displayText(compactRewards([...(action.reward || []), ...(model.focusResult?.effects || [])]))}</span><span>ここまで：${displayText(freeActionParamPreview(model.state, model.effects).join('／') || '数値の変化なし')}（反映予定）</span></div><button class="ku-primary" id="next">${model.remaining > 0 && actions.some((item) => !model.used.includes(item.id)) ? '次の行動を選ぶ' : '自由行動を終える'}</button></div>`;
        stage.querySelector('#next').onclick = () => { model = continueFreeAction(model, actions); render(); };
        stage.querySelector('.ku-close').onclick = requestEnd;
        return;
      }
      const choices = actions.filter((action) => !model.used.includes(action.id));
      if (model.remaining <= 0 || choices.length === 0) return done();
      const counts = hintsEnabled ? flagCounts(model.state) : null;
      const countNotice = counts ? `<p class="fa-counts">所持：🕯 過去 ${counts.past}　📜 計画 ${counts.plan}　👁 生存 ${counts.alive}</p>` : '';
      const filterTabs = hintsEnabled ? `<div class="fa-filters"><button class="fa-filter ${filter === 'all' ? 'is-selected' : ''}" data-filter="all">すべて ${choices.length}</button>${Object.entries(lineHint).map(([line, label]) => `<button class="fa-filter ${filter === line ? 'is-selected' : ''}" data-filter="${line}">${label} ${choices.filter((action) => actionLines(action).includes(line)).length}</button>`).join('')}</div>` : '';
      const visible = hintsEnabled && filter !== 'all' ? choices.filter((action) => actionLines(action).includes(filter)) : choices;
      const rows = visible.map((action) => {
        const focused = action.room === model.selectedRoom;
        return `<button class="ku-card fa-row ${focused ? 'is-focused' : ''}" data-id="${displayText(action.id)}"><span class="ku-card-name">${displayText(action.label)}</span>${actionPreview(action, hintsEnabled)}</button>`;
      }).join('');
      stage.innerHTML = `${topbar('', `<span class="fa-pips">残り ${model.remaining} / ${totalBlocks} 回<span aria-hidden="true">${pips()}</span></span>`)}
        <div class="fa-body">
          <div class="fa-main"><section class="fa-objective" aria-label="いまの目的"><strong>${displayText(goal.title)}</strong><details class="fa-rules"><summary>数値の意味・操作</summary><p>${PARAM_GUIDE}</p><p>行動を一つ選ぶと1回消費。読む間は時間が進みません。数値は自由行動を終えると上部へ反映されます。</p></details></section>${filterTabs}${countNotice}<div class="fa-list">${rows}</div></div>
          <aside class="fa-aside">${mapMarkup(model, actions)}</aside>
        </div>
        <div class="ku-thumbzone"><button class="ku-secondary" id="done">自由行動を切り上げる</button></div>`;
      const chooseAction = (id) => { model = selectFreeAction(model, choices.find((action) => action.id === id)); render(); };
      stage.querySelectorAll('[data-id]').forEach((button) => {
        button.onclick = () => chooseAction(button.dataset.id);
      });
      stage.querySelectorAll('[data-filter]').forEach((button) => {
        button.onclick = () => { filter = button.dataset.filter; render(); };
      });
      stage.querySelectorAll('[data-room]').forEach((room) => {
        const open = () => { model = openRoomPanel(model, room.dataset.room); render(); };
        room.onclick = open;
        room.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } };
      });
      stage.querySelectorAll('[data-floor]').forEach((tab) => {
        const select = () => { model = { ...model, selectedRoom: roomsByFloor(tab.dataset.floor)[0].id }; render(); };
        tab.onclick = select;
        tab.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } };
      });
      stage.querySelector('#done').onclick = requestEnd;
      stage.querySelector('.ku-close').onclick = requestEnd;
      if (model.openRoomId) {
        const roomPanel = document.createElement('section');
        roomPanel.className = 'mansion-room-modal';
        roomPanel.innerHTML = roomPanelMarkup(model, actions);
        root.append(roomPanel);
        const closePanel = () => {
          const roomId = model.openRoomId;
          roomPanel.remove();
          model = closeRoomPanel(model);
          render();
          stage.querySelector(`[data-room="${roomId}"]`)?.focus();
        };
        roomPanel.querySelectorAll('.mansion-room-close, .mansion-room-return').forEach((button) => { button.onclick = closePanel; });
        roomPanel.querySelectorAll('[data-room-action]').forEach((button) => {
          button.onclick = () => {
            roomPanel.remove();
            model = selectFreeAction(model, choices.find((action) => action.id === button.dataset.roomAction));
            render();
          };
        });
        roomPanel.onclick = (event) => { if (event.target === roomPanel) closePanel(); };
        const keydown = (event) => { if (event.key === 'Escape') { event.preventDefault(); closePanel(); } };
        roomPanel.addEventListener('keydown', keydown);
        const firstAction = roomPanel.querySelector('[data-room-action]');
        (firstAction || roomPanel.querySelector('.mansion-room-close')).focus();
      }
    };
    render();
  });
} };
