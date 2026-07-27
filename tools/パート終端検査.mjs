import assert from 'node:assert/strict';
import { boardCards } from '../src/data/temariuta-board.js';
import { placeBoardCard, selectBoardVerses } from '../src/systems/temariuta-board/index.js';
import { FREE_ACTION_PHASE, continueFreeAction, enrichFreeActions, focusFreeAction, selectFreeAction } from '../src/systems/freeaction/index.js';
import { applyResponse, responseOptions } from '../src/systems/rebuttal/index.js';
import { chapter1 } from '../src/data/scenario/chapter1.js';
import { rebuttalCh2 } from '../src/data/parts/rebuttal-ch2.js';
import { buildChapterSummary, completeChapterSummary } from '../src/systems/summary/index.js';

const maxSteps = 200;
const slots = ['dead', 'actor', 'meaning'];

function mustTerminate(name, advance, complete) {
  for (let step = 0; step < maxSteps; step++) {
    if (complete()) return console.log(`${name}: ${step}操作で終端`);
    advance();
  }
  assert.fail(`${name}: ${maxSteps}操作以内に終端しなかった`);
}

// actTemariBoard と同じく、常に先頭の札を選び、先頭の空欄へ置く。
const verses = selectBoardVerses({}, {});
let board = Object.fromEntries(verses.map((verse) => [verse.number, Object.fromEntries(slots.map((slot) => [slot, null]))]));
let selectedCard = null;
mustTerminate('手毬唄ボード', () => {
  if (!selectedCard) selectedCard = Object.keys(boardCards)[0];
  const empty = verses.flatMap((verse) => slots.map((kind) => ({ number:verse.number, kind }))).find(({ number, kind }) => !board[number][kind]);
  if (empty) board = placeBoardCard(board, empty.number, empty.kind, selectedCard);
  selectedCard = null;
}, () => verses.every((verse) => slots.every((kind) => board[verse.number][kind])));

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
let free = { state:{ flags:{ past:[], plan:[], alive:[] }, items:[] }, remaining:2, used:[], effects:[], phase:FREE_ACTION_PHASE.SELECTING, currentAction:null, focusResult:null };
mustTerminate('自由行動', () => {
  if (free.phase === FREE_ACTION_PHASE.SELECTING) {
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
