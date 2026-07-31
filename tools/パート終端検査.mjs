import assert from 'node:assert/strict';
import { boardCards, boardSolution } from '../src/data/temariuta-board.js';
import { confirmBoardHypothesis, placeBoardCard, selectBoardVerses } from '../src/systems/temariuta-board/index.js';
import { FREE_ACTION_PHASE, closeRoomPanel, continueFreeAction, enrichFreeActions, focusFreeAction, openRoomPanel, selectFreeAction } from '../src/systems/freeaction/index.js';
import { applyResponse, responseOptions } from '../src/systems/rebuttal/index.js';
import { chapter1 } from '../src/data/scenario/chapter1.js';
import { chapter2 } from '../src/data/scenario/chapter2.js';
import { rebuttalCh2 } from '../src/data/parts/rebuttal-ch2.js';
import { buildChapterSummary, completeChapterSummary } from '../src/systems/summary/index.js';
import { temariSelectedCandidates } from './ブラウザ検証/進行基盤.js';

const maxSteps = 200;
const slots = ['dead', 'actor', 'meaning'];

function mustTerminate(name, advance, complete) {
  for (let step = 0; step < maxSteps; step++) {
    if (complete()) return console.log(`${name}: ${step}操作で終端`);
    advance();
  }
  assert.fail(`${name}: ${maxSteps}操作以内に終端しなかった`);
}

// actTemariBoard と同じく、札を選んでから欄を押す。不適合な種別では
// 1回目は警告だけなので、同じ欄をもう1回押して仮説として置く。
const temariCall = chapter2.nodes.find((node) => node.t === 'call' && node.part === 'temariBoard');
assert.ok(temariCall, '第二章に手毬唄ボードの呼び出しがある');
const verses = selectBoardVerses(temariCall.args, {});
let board = Object.fromEntries(verses.map((verse) => [
  verse.number,
  Object.fromEntries(slots.map((slot) => [slot, verse.slots?.[slot] ?? null])),
]));
let selectedCard = null;
let warnedSlot = null;
let boardOperations = 0;
let replacementOperations = 0;
let commitReady = false;
let committed = false;
const placedKeys = new Set();
mustTerminate('手毬唄ボード', () => {
  const solved = verses.every((verse) => slots.every((kind) => board[verse.number][kind] === boardSolution[verse.number - 1][kind]));
  if (solved && !commitReady) {
    commitReady = confirmBoardHypothesis(board, 'truth', verses).canCommit;
    boardOperations++;
    return;
  }
  if (commitReady) {
    committed = true;
    boardOperations++;
    return;
  }
  if (!selectedCard) {
    const target = verses.flatMap((verse) => slots.map((kind) => ({
      number:verse.number,
      kind,
      cardId:boardSolution[verse.number - 1][kind],
    }))).find(({ number, kind, cardId }) => (
      board[number][kind] !== cardId
      && !placedKeys.has(`truth:${number}:${kind}:${cardId}`)
    ));
    assert.ok(target, '置換可能な未試行配置がある');
    selectedCard = target.cardId;
    boardOperations++;
    return;
  }
  const target = verses.flatMap((verse) => slots.map((kind) => ({
    number:verse.number,
    kind,
    cardId:boardSolution[verse.number - 1][kind],
  }))).find(({ number, kind, cardId }) => (
    cardId === selectedCard
    && board[number][kind] !== cardId
    && !placedKeys.has(`truth:${number}:${kind}:${cardId}`)
  ));
  assert.ok(target, '選択中の札に対応する未試行欄がある');
  const incompatible = !boardCards[selectedCard].kinds.includes(target.kind);
  const isRetry = warnedSlot?.number === target.number && warnedSlot?.kind === target.kind;
  boardOperations++;
  if (incompatible && !isRetry) {
    warnedSlot = target;
    return;
  }
  if (board[target.number][target.kind]) replacementOperations++;
  board = placeBoardCard(board, target.number, target.kind, selectedCard);
  placedKeys.add(`truth:${target.number}:${target.kind}:${selectedCard}`);
  selectedCard = null;
  warnedSlot = null;
}, () => committed);
assert.ok(boardOperations > 0, '手毬唄ボード検査が0操作で終端していない');
assert.equal(committed, true, '確定後にcommit-close相当の操作で終端する');
assert.ok(replacementOperations > 0, '初期配置済みの欄を置換していない');
assert.equal(placedKeys.size, Math.ceil((boardOperations - 2) / 2), '確定・コミット以外で同一（面・節・欄・札）を再配置していない');
console.log(`手毬唄ボード: 実操作 ${boardOperations}回（うち置換 ${replacementOperations}回）`);

// actTemariBoard の候補生成とクリック後の状態更新を模す。採点役を替えても、
// 選択解除・不適合警告・面切替を含む操作列が有限で終わることを確かめる。
function runTemariCandidateModel(score, { preventRepeatedDeselect = false } = {}) {
  const modelSlots = [
    { number:'1', kind:'dead' },
    { number:'1', kind:'actor' },
  ];
  const state = {
    face:'show', selected:null, warned:null, lastAction:null, operations:0,
    placedKeys:new Set(['show:1:dead:onda']), deselectedCards:new Set(), done:false,
  };
  const placementKeyFor = (slot) => `${state.face}:${slot.number}:${slot.kind}:onda`;
  for (; state.operations < maxSteps && !state.done; state.operations++) {
    if (state.warned) {
      state.placedKeys.add(placementKeyFor(state.warned));
      state.warned = null;
      state.selected = null;
      state.deselectedCards.clear();
      state.lastAction = 'slot';
      continue;
    }
    let candidates;
    if (state.selected) {
      const untried = modelSlots.filter((slot) => !state.placedKeys.has(placementKeyFor(slot)));
      const selected = { action:'card', cardId:state.selected, selected:true, dataset:{ card:state.selected } };
      candidates = preventRepeatedDeselect
        ? temariSelectedCandidates(selected, untried.map((slot) => ({ action:'slot', ...slot })), [...state.deselectedCards])
        : [selected, ...untried.map((slot) => ({ action:'slot', ...slot }))];
    } else {
      const hasUntried = modelSlots.some((slot) => !state.placedKeys.has(placementKeyFor(slot)));
      candidates = [
        ...(hasUntried ? [{ action:'card', cardId:'onda', selected:false }] : []),
        ...(state.lastAction !== 'face' ? [{ action:'face', face:state.face === 'show' ? 'truth' : 'show' }] : []),
        { action:'done' },
      ];
    }
    const action = candidates.reduce((best, candidate) => score(candidate) > score(best) ? candidate : best);
    if (action.action === 'card' && action.selected) {
      state.deselectedCards.add(action.cardId);
      state.selected = null;
      state.lastAction = 'card';
    } else if (action.action === 'card') {
      state.selected = action.cardId;
      state.lastAction = 'card';
    } else if (action.action === 'slot') {
      // onda は dead 専用なので actor は警告後の再クリックで初めて配置される。
      if (action.kind !== 'dead') state.warned = action;
      else {
        state.placedKeys.add(placementKeyFor(action));
        state.selected = null;
        state.deselectedCards.clear();
      }
      state.lastAction = 'slot';
    } else if (action.action === 'face') {
      state.face = action.face;
      state.lastAction = 'face';
    } else {
      state.done = true;
      state.lastAction = 'done';
    }
  }
  return state;
}

const prefersDeselectToIncompatible = (candidate) => ({
  card: candidate.selected ? -5 : 3,
  slot: -9,
  face: -20,
  done: -6,
}[candidate.action]);
const deselectModel = runTemariCandidateModel(prefersDeselectToIncompatible, { preventRepeatedDeselect:true });
assert.ok(deselectModel.operations > 0, '選択解除検査が0操作で終端していない');
assert.equal(deselectModel.done, true,
  `手毬唄ボード選択解除: ${deselectModel.operations}操作以内に終端しなかった`);
console.log(`手毬唄ボード選択解除: 実操作 ${deselectModel.operations}回`);

const faceModel = runTemariCandidateModel((candidate) => ({
  face: 10,
  done: 5,
  card: -10,
  slot: -10,
}[candidate.action]), { preventRepeatedDeselect:true });
assert.ok(faceModel.operations > 0, '面切替検査が0操作で終端していない');
assert.equal(faceModel.done, true, '面切替後のstate更新でface候補を外して終端する');
assert.equal(faceModel.operations, 2, '面切替の直後はface候補を外して別操作で終端する');
console.log(`手毬唄ボード面切替: 実操作 ${faceModel.operations}回`);

// actRebuttal と同じく、disabled の札を候補から除き、先頭の押せる反応を選ぶ。
let rebuttal = { conviction:rebuttalCh2.initialConviction, overknow:0, broken:[] };
let rebuttalIndex = 0;
mustTerminate('反論', () => {
  const node = rebuttalCh2.nodes[rebuttalIndex];
  const choices = responseOptions(node.responses, { hasCard:() => false, meetsCondition:() => true }).filter((choice) => !choice.disabled);
  assert.ok(choices.length, `${node.id}: 押せる反応がない`);
  rebuttal = applyResponse({ ...rebuttal, node }, choices.find((choice) => choice.response.kind === 'rebut')?.response || choices[0].response, rebuttal.broken);
  rebuttalIndex++;
}, () => rebuttalIndex >= rebuttalCh2.nodes.length);

// actFreeAction と同じく、行動→最初の注目→読了を機械的に繰り返す。
const freeActions = enrichFreeActions(chapter1.nodes.find((node) => node.t === 'call' && node.part === 'freeAction').args.actions);
let free = { state:{ flags:{ past:[], plan:[], alive:[] }, items:[] }, remaining:2, used:[], effects:[], phase:FREE_ACTION_PHASE.SELECTING, currentAction:null, focusResult:null, selectedRoom:'study', openRoomId:null };
let roomPanelChecked = false;
mustTerminate('自由行動', () => {
  if (free.phase === FREE_ACTION_PHASE.SELECTING) {
    if (roomPanelChecked === false) {
      free = openRoomPanel(free, 'study');
      assert.equal(free.openRoomId, 'study', '部屋パネルを開く');
      roomPanelChecked = 'opened';
      return;
    }
    if (roomPanelChecked === 'opened') {
      free = closeRoomPanel(free);
      assert.equal(free.openRoomId, null, '部屋パネルを閉じる');
      roomPanelChecked = true;
      return;
    }
    const action = freeActions.find((candidate) => !free.used.includes(candidate.id));
    assert.ok(action, '押せる自由行動がない');
    free = selectFreeAction(free, action);
  } else if (free.phase === FREE_ACTION_PHASE.FOCUSING) {
    free = focusFreeAction(free, free.currentAction.scenes.focus.options[0].id);
  } else if (free.phase === FREE_ACTION_PHASE.READING) {
    free = continueFreeAction(free, freeActions);
  }
}, () => free.phase === FREE_ACTION_PHASE.FINISHED);

// actPart と同じ #done の終端遷移を一度実行し、表示構築後に必ず閉じることを確かめる。
let summary = { phase:'shown', data:buildChapterSummary({ params:{}, flags:{ past:[], plan:[], alive:[] }, items:[], logs:{} }, { chapter:1, actions:[] }) };
mustTerminate('章末サマリ', () => {
  assert.equal(summary.phase, 'shown', '表示済みの章末サマリだけを #done で閉じる');
  summary = { ...summary, phase:completeChapterSummary().done ? 'finished' : 'shown' };
}, () => summary.phase === 'finished');
