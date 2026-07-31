import { modal, finish, stateOf, condition, displayText } from '../common.js';
import { flags } from '../../data/flags.js';
import { items } from '../../data/items.js';
import { mansionRooms, roomsByFloor, roomActionIndex, roomRect, roomStatus } from '../../data/mansion-map.js';
import { explorationHintsEnabled } from '../../engine/progress.js';
import { chapter1 } from '../../data/scenario/chapter1.js';
import { chapter2 } from '../../data/scenario/chapter2.js';

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
  if (model.phase !== FREE_ACTION_PHASE.SELECTING) return model;
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
  { id:'study', room:'study', label:'書斎を調べる', desc:'献辞の消し跡', reward:[{t:'flag',id:'dedication_erasure'}], risk:[] },
  { id:'housekeeper', room:'laundry', label:'家政婦と話す', desc:'地下の物音', reward:[{t:'flag',id:'basement_sound'}], risk:[] },
  { id:'explore', room:'corridor2', label:'館を探索する', desc:'寸法の不一致', reward:[{t:'flag',id:'hidden_dimension'}], risk:[] },
];

// Scenario prose remains the source text; this layer supplies the playable
// margins around it for older scenario nodes as well as newer ones.
export const actionDetails = {
  study:{gain:'消された献辞の行を読める',scenes:{intro:'私は書斎の扉を指二本ぶんだけ開け、初版本を司書の手つきで背から抜いた。',focus:{prompt:'どこを読む？',options:[{id:'dedication',label:'献辞の頁を光にかざす',text:'献辞の頁に薄い消し跡がある。「――友、Rに」。消された箇所ほど目に残る。',effects:[{t:'log',key:'study_focus',value:'dedication'}]},{id:'binding',label:'最終章の綴じを見る',text:'最終章だけ紙がわずかに白く、手触りが硬い。頁の綴じ目は別の手を示している。',effects:[{t:'log',key:'study_focus',value:'binding'},{t:'param',key:'overknow',delta:1}]}]},reaction:'コウ君は私の指先を見ていた。「図書館の人って、本を触ると分かるんだね」問いではなく記録だった。'}},
  housekeeper:{gain:'地下から聞こえた音の記憶に触れる',scenes:{intro:'志津さんは洗濯室で、濡れた客用タオルを何度も畳み直していた。',focus:{prompt:'どこに注目する？',options:[{id:'hands',label:'震える指先を見る',text:'「夜中」という語に触れた途端、彼女の手が止まった。',effects:[{t:'log',key:'housekeeper_focus',value:'hands'}]},{id:'underground',label:'地下の音をたずねる',text:'若いころ、地下からことん、ことん、と物を打つ音が聞こえたという。',effects:[{t:'log',key:'housekeeper_focus',value:'underground'},{t:'param',key:'awareness',delta:1}]}]},reaction:'志津さんは宇野さんの名を出しかけて飲み込んだ。廊下の咳払いが近すぎた。'}},
  accomplice_room:{gain:'共犯者ごとに違う計画書を読む',scenes:{intro:'剛蔵兄さんの上着のポケットに、三つ折りの紙が半分だけ覗いていた。',focus:{prompt:'どこを確かめる？',options:[{id:'time',label:'唄の時刻を照合する',text:'私の紙は夜食のあと、剛蔵兄さんの紙は散会の直後。二枚は別の場所へ送り出されている。',effects:[{t:'log',key:'accomplice_focus',value:'time'}]},{id:'note',label:'余白の注記まで読む',text:'恩田さんの名の脇に「読ませるな」とある。紙は別々の札だった。封筒の消印も控え、別の宛先へ見せる頁を作る。',effects:[{t:'log',key:'accomplice_focus',value:'note'},{t:'param',key:'awareness',delta:1},{t:'item',id:'alibi_4'}]}]},reaction:'剛蔵兄さんは窓でなく私の手を見た。紙を確かめる顔から笑いが消えた。'}},
  prepare:{gain:'配膳時刻と自室の記録を揃える',scenes:{intro:'私は厨房の隅にある当番表を、皿洗い用の棚からそっと抜き取った。紙がこちらを読む。',focus:{prompt:'どの余白を整える？',options:[{id:'roster',label:'配膳の刻限を覚える',text:'誰が湯を沸かし、誰がカップを運ぶかを、一つも書き換えずに覚えた。',effects:[{t:'log',key:'prepare_focus',value:'roster'}]},{id:'record',label:'自室の読書記録を辿る',text:'昨夜の私が本を読んでいた時間を支える、小さな頁を作る。',effects:[{t:'log',key:'prepare_focus',value:'record'},{t:'param',key:'suspicion',delta:1}]}]},reaction:'準備は、生き残るための小さな嘘を棚へ戻す作業だった。'}},
  observe_detectives:{gain:'悟郎の質問の順序が読めるようになる',scenes:{intro:'談話室では悟郎さんが椅子を動かし、客間の見取り図を作っていた。',focus:{prompt:'誰の手順を追う？',options:[{id:'goro',label:'悟郎の聞く順番を数える',text:'誰を長く見るか、何を見たあと誰へ質問するかを覚える。',effects:[{t:'log',key:'detective_focus',value:'goro'}]},{id:'conan',label:'コウ君の靴の読み方を見る',text:'少年は雨の泥の違いを読んでいく。索引を先に読むほど、こちらも読まれる。',effects:[{t:'log',key:'detective_focus',value:'conan'},{t:'param',key:'awareness',delta:1}]}]},reaction:'「栞お姉さんも、靴を見るの？」私は、もう一つの現場として整理され始めていた。'}},
  explore:{gain:'壁内の空白と旧道を見つける',scenes:{intro:'二階の窓は九つあるのに、廊下には窓三つ分の距離が残る。私は歩数を数え直した。',focus:{prompt:'どの空白を追う？',options:[{id:'walls',label:'壁の寸法を測る',text:'棚一段ぶんでは済まない、暗い余白が壁の内側にある。',effects:[{t:'log',key:'explore_focus',value:'walls'}]},{id:'road',label:'笹の向こうの旧道を見る',text:'谷を迂回して三里先へ続く旧道。五番の唄が地図の上で羽を持った。',effects:[{t:'log',key:'explore_focus',value:'road'},{t:'param',key:'suspicion',delta:3}]}]},reaction:'宇野さんは散歩以外を考えていると知る返事をした。'}},
  morgue:{gain:'死因を崩す筆だこの手を読む',scenes:{intro:'安置室にされた客間へ、私は時計と人の隙を読んで入った。',focus:{prompt:'白布のどこを見る？',options:[{id:'hand',label:'左手の筆だこを見る',text:'中指の横には固いペンだこがあり、親指には紙を押さえる摩耗がある。',effects:[{t:'log',key:'morgue_focus',value:'hand'}]},{id:'ink',label:'爪の根元の黒さを読む',text:'沈んだ黒さは土でなく、長いあいだインクを扱った人の影だった。袖に残った替え布の繊維も控える。',effects:[{t:'log',key:'morgue_focus',value:'ink'},{t:'param',key:'awareness',delta:1},{t:'item',id:'alibi_3'}]}]},reaction:'床板が鳴り、私は布を戻した。手を洗っても、指先に視線の冷たさが残った。'}},
  doctor:{gain:'歯型照合を揺らす控えを読む',scenes:{intro:'佐伯先生は古いカルテを膝に置いていた。頁の端だけが白い傷のようだった。',focus:{prompt:'どの記録を見る？',options:[{id:'copy',label:'複写紙の端を覚える',text:'訂正液の下に別の筆跡があり、歯の記号が一つ消されている。診察時刻の控えも手帳へ写す。',effects:[{t:'log',key:'doctor_focus',value:'copy'},{t:'item',id:'alibi_7'}]},{id:'words',label:'佐伯先生の言いよどみを読む',text:'「照合は書類で作れる」告白でなく、自分の喉を塞ぐ仕草だった。',effects:[{t:'log',key:'doctor_focus',value:'words'},{t:'param',key:'suspicion',delta:3}]}]},reaction:'先生は「頼まれたとおりに、空欄を埋めた」と言った。'}},
  kitchen:{gain:'夜食の当番表と献立を照合する',scenes:{intro:'厨房では志津さんが、誰にも頼まれていないのにカップを煮沸していた。',focus:{prompt:'何を確かめる？',options:[{id:'roster',label:'夜食の当番欄を読む',text:'夜食の欄には家政婦の名があり、補助の欄には空白がある。',effects:[{t:'log',key:'kitchen_focus',value:'roster'}]},{id:'tea',label:'余った朝の茶葉を嗅ぐ',text:'館には、まだ誰かのために用意される量がある。',effects:[{t:'log',key:'kitchen_focus',value:'tea'},{t:'param',key:'conscience',delta:1}]}]},reaction:'志津さんは朝の紅茶を口にして、すぐ口を押さえた。'}},
  library:{gain:'初版本の余白から別の筆を読む',scenes:{intro:'書斎の机には恩田さんの眼鏡が残され、初版本の余白には細い鉛筆の矢印があった。',focus:{prompt:'どの頁を開く？',options:[{id:'margin',label:'余白の鉛筆を追う',text:'「初出なし」「終章のみ別人」と二度、読む者へ細い矢印が引かれている。',effects:[{t:'log',key:'library_focus',value:'margin'}]},{id:'ending',label:'最終章の紙を撫で比べる',text:'最後だけ室内の机に座って急いで結んだような文だった。筆圧の差を比較する走り書きを残す。',effects:[{t:'log',key:'library_focus',value:'ending'},{t:'param',key:'awareness',delta:1},{t:'item',id:'alibi_5'}]}]},reaction:'扉の外で少年が咳払いをした。死者の鉛筆は私の中へ残った。'}},
  old_road_song:{gain:'三里先へ抜ける旧道を地図に重ねる',scenes:{intro:'談話室の唄の写しで、私は五番の「逃げた小鳥は三里先」を追った。',focus:{prompt:'どこを照合する？',options:[{id:'song',label:'唄の距離を数える',text:'唄はただの脅しでなく、谷を迂回する旧道の距離だった。',effects:[{t:'log',key:'old_road_focus',value:'song'}]},{id:'map',label:'赤鉛筆の山道を辿る',text:'誰かが逃げるために残した索引と、猟師が見た影の時刻を頁の端へ写した。',effects:[{t:'log',key:'old_road_focus',value:'map'},{t:'param',key:'suspicion',delta:1},{t:'item',id:'alibi_6'}]}]},reaction:'宇野さんが通る気配に地図を閉じた。逃げ道を探すことまで知られそうだった。'}},
  cover_tracks:{gain:'知っている事実を、知らない人の順序で言い直す',scenes:{intro:'談話室で蘭子さんが証言の順序を一緒に確かめてくれた。私はその善意を、自分を守る頁へ綴じ直す。',focus:{prompt:'どう演じ直す？',options:[{id:'ran',label:'蘭子と昨日の動線を確かめる',text:'見た順序だけを声に出し、知っている理由を余白へ戻す。蘭子への信頼と引き換えに、視線から一歩退く。',effects:[{t:'log',key:'cover_focus',value:'ran'},{t:'param',key:'overknow',delta:-1},{t:'param',key:'trust',delta:5}]},{id:'goro',label:'悟郎の聞き取り順に答え直す',text:'問われたことだけを短く並べる。疑いは薄れるが、コウ君には演技の継ぎ目を見られた。',effects:[{t:'log',key:'cover_focus',value:'goro'},{t:'param',key:'overknow',delta:-1},{t:'param',key:'suspicion',delta:-5},{t:'param',key:'awareness',delta:3}]}]},reaction:'知らないふりは忘れることではない。誰かの善意を盾にするぶん、良心の余白が一つ減った。'}}
};
const scenarioFreeActions = [chapter1, chapter2].flatMap((chapter) => chapter.nodes)
  .filter((node) => node.t === 'call' && node.part === 'freeAction')
  .flatMap((node) => node.args.actions);
export function enrichFreeActions(actions) {
  return actions.map((action) => {
    const details = actionDetails[action.id] || {};
    const scenarioAction = scenarioFreeActions.find((item) => item.id === action.id);
    return { ...action, ...details, risk:[...(action.risk ?? scenarioAction?.risk ?? [])] };
  });
}

const paramNames = { suspicion:'疑い', trust:'信頼', awareness:'警戒', overknow:'知りすぎ', conscience:'良心' };
function paramText(effect) {
  const name = paramNames[effect.key] || effect.key;
  return `${name}が${Math.abs(effect.delta)}${effect.delta >= 0 ? '増す' : '下がる'}`;
}
export function costDescription(action) {
  const fixed = (action.risk || []).filter((effect) => effect.t === 'param').map(paramText);
  const conditional = (action.scenes?.focus?.options || []).map((option) => ({
    label: option.label,
    effects: (option.effects || []).filter((effect) => effect.t === 'param').map(paramText),
  })).filter(({ effects }) => effects.length);
  return `${fixed.length ? fixed.join('、') : '数えられる代償はない'}${conditional.map(({ label, effects }) => `\n（「${label}」を選ぶと、さらに ${effects.join('、')}）`).join('')}`;
}

const floorLabels = { '1f':'一階', '2f':'二階', under:'地下・屋外' };
function roomName(roomId) { return mansionRooms.find((room) => room.id === roomId)?.name || '館のどこか'; }
function actionPreview(action, hintsEnabled) {
  const preview = previewLineLabels(action, hintsEnabled);
  const cost = displayText(costDescription(action)).replace(/\n/g, '<br>');
  return `${preview.length ? `<span class="freeaction-lines">見込める手掛かり：${preview.map(displayText).join('・')}</span>` : ''}<span class="freeaction-gain">見返り：${displayText(action.gain, action.desc || '頁を読む')}</span><span class="freeaction-cost">代償：${cost}</span>`;
}
function effectNotices(effects) {
  const notices = [];
  for (const effect of effects) {
    if (effect.t === 'flag' && flags[effect.id]) notices.push(`手掛かり「${flags[effect.id].name}」を獲得　内容：${flags[effect.id].desc}`);
    if (effect.t === 'item') {
      const meta = items[effect.id];
      const power = meta?.power ?? null;
      const exposure = meta?.exposure ?? null;
      notices.push(`反論札「${meta?.name ?? effect.id}」を獲得${power ? `　効き目：${power}` : ''}${exposure ? `　危険：${exposure}` : ''}`);
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
    : `<p>${displayText(room.desc)}</p>${available.length ? `<h3>ここでできること</h3><div class="mansion-room-actions">${available.map((action) => `<button data-room-action="${displayText(action.id)}"><strong>${displayText(action.label)}</strong>${actionPreview(action, model.hintsEnabled)}</button>`).join('')}</div>` : '<p>いまここで、できることはない。</p>'}`;
  return `<div class="parts-panel mansion-room-panel" role="dialog" aria-modal="true" aria-labelledby="mansion-room-title"><header><h2 id="mansion-room-title">${status.revealed ? displayText(room.name) : '？'}</h2><button class="mansion-room-close" aria-label="閉じる">×</button></header><main>${contents}<footer><button class="mansion-room-return">見取り図に戻る</button></footer></main></div>`;
}

export const freeAction = { async start(ctx, args = {}) {
  const actions = enrichFreeActions(args.actions || defaults);
  const hintsEnabled = explorationHintsEnabled(globalThis.localStorage);
  let model = { state: stateOf(ctx), remaining: args.blocks ?? 3, used: [], effects: [], phase: FREE_ACTION_PHASE.SELECTING, currentAction: null, focusResult: null, selectedRoom: 'study', openRoomId: null, hintsEnabled };
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
      if (model.phase === FREE_ACTION_PHASE.FOCUSING) {
        const action = model.currentAction;
        const focus = action.scenes.focus;
        modalView.main.innerHTML = `<article class="freeaction-narrative"><h2>${displayText(action.label)}</h2><div class="freeaction-narrative-body"><p>${displayText(action.scenes.intro, action.narrative)}</p><h3>${displayText(focus.prompt, 'どこを見る？')}</h3><div class="freeaction-focuses">${focus.options.map((option) => `<button data-focus="${displayText(option.id)}">${displayText(option.label)}</button>`).join('')}</div></div></article>`;
        modalView.main.querySelectorAll('[data-focus]').forEach((button) => { button.onclick = () => { model = focusFreeAction(model, button.dataset.focus); render(); }; });
        return;
      }
      if (model.phase === FREE_ACTION_PHASE.READING) {
        const action = model.currentAction;
        const notices = effectNotices([...(action.reward || []), ...(model.focusResult?.effects || [])]);
        const discovery = model.focusResult?.text || action.scenes?.discovery || action.narrative || `${displayText(action.desc, '情報')}を得た。`;
        const reaction = action.scenes?.reaction || '';
        const acquiredNotice = notices.length ? `<div class="freeaction-acquired">${notices.map((notice) => `<p>${displayText(notice)}</p>`).join('')}</div>` : `<p class="freeaction-acquired">得たこと：${displayText(action.acquired, action.desc || '悟郎の質問の順序が読めるようになった')}</p>`;
        modalView.main.innerHTML = `<article class="freeaction-narrative"><h2>${displayText(action.label)}</h2><div class="freeaction-narrative-body"><p>${displayText(discovery)}</p>${reaction ? `<p>${displayText(reaction)}</p>` : ''}${acquiredNotice}</div><footer><button id="next">${model.remaining > 0 && actions.some((item) => !model.used.includes(item.id)) ? '次の行動を選ぶ' : '自由行動を終える'}</button></footer></article>`;
        modalView.main.querySelector('#next').onclick = () => { model = continueFreeAction(model, actions); render(); };
        return;
      }
      const choices = actions.filter((action) => !model.used.includes(action.id));
      if (model.remaining <= 0 || choices.length === 0) return done();
      const acquired = model.used.map((id) => actions.find((action) => action.id === id)?.label).filter(Boolean);
      const counts = hintsEnabled ? flagCounts(model.state) : null;
      const countNotice = counts ? `<p class="freeaction-counts">所持：🕯 過去 ${counts.past}　📜 計画 ${counts.plan}　👁 生存 ${counts.alive}</p>` : '';
      modalView.main.innerHTML = `<p>残り <b>${displayText(model.remaining, 0)}</b> ブロック。行動を選ぶと時間を1つ使います。選ばなかった場所にも別の情報があります。</p>${countNotice}${acquired.length ? `<p class="freeaction-used">探索済み：${acquired.map(displayText).join('／')}</p>` : ''}${mapMarkup(model, actions)}<h3 class="freeaction-list-heading">館のどこでも選べる行動</h3><div class="action-list">${choices.map((action) => { const focused = action.room === model.selectedRoom ? ' is-focused' : ''; return `<button class="${focused.trim()}" data-id="${displayText(action.id)}"><strong>${displayText(action.label)}</strong><span class="freeaction-room">${displayText(roomName(action.room))}</span>${actionPreview(action, hintsEnabled)}</button>`; }).join('')}</div><button id="done">自由行動を切り上げる</button>`;
      const chooseAction = (id) => { model = selectFreeAction(model, choices.find((action) => action.id === id)); render(); };
      modalView.main.querySelectorAll('[data-id]').forEach((button) => {
        button.onclick = () => chooseAction(button.dataset.id);
      });
      modalView.main.querySelectorAll('[data-room]').forEach((room) => {
        const open = () => { model = openRoomPanel(model, room.dataset.room); render(); };
        room.onclick = open;
        room.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } };
      });
      modalView.main.querySelectorAll('[data-floor]').forEach((tab) => {
        const select = () => { model = { ...model, selectedRoom: roomsByFloor(tab.dataset.floor)[0].id }; render(); };
        tab.onclick = select;
        tab.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } };
      });
      modalView.main.querySelector('#done').onclick = done;
      if (model.openRoomId) {
        const roomPanel = document.createElement('section');
        roomPanel.className = 'mansion-room-modal';
        roomPanel.innerHTML = roomPanelMarkup(model, actions);
        modalView.root.append(roomPanel);
        const closePanel = () => {
          const roomId = model.openRoomId;
          roomPanel.remove();
          model = closeRoomPanel(model);
          render();
          modalView.main.querySelector(`[data-room="${roomId}"]`)?.focus();
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
    modalView.close.onclick = done;
    render();
  });
} };
