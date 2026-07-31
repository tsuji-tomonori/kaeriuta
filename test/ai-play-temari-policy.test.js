import test from 'node:test';
import assert from 'node:assert/strict';
import { boardCards, boardCover, boardSolution } from '../src/data/temariuta-board.js';
import { assessBoardHypothesis, boardCompletionEffects, placeBoardCard } from '../src/systems/temariuta-board/index.js';
import { decideByScore, reconcileTemariAttempt, temariPolicy } from '../tools/AIプレイ/ペルソナ/共通.js';
import { hasUntriedBoardPlacement } from '../tools/ブラウザ検証/進行基盤.js';
import fs from 'node:fs';

const card = { id:'poison', name:'珈琲の毒', note:'金の盃に残された眠りの読み', kinds:['meaning'], selected:true };
const slots = [
  { number:1, kind:'meaning', cardId:null, empty:true },
  { number:2, kind:'meaning', cardId:'body_swap', empty:false },
];
const observation = {
  part: {
    name:'temariBoard',
    temari:{ face:'truth', cards:[card], slots },
  },
};

test('推理型は色の正誤に頼らず、空欄だけを試す', () => {
  const memory = {};
  const open = temariPolicy({ meta:{ action:'slot', number:1, kind:'meaning' } }, observation, memory, 'deduce');
  const filled = temariPolicy({ meta:{ action:'slot', number:2, kind:'meaning' } }, observation, memory, 'deduce');
  assert.ok(open.score > 0);
  assert.ok(filled.score < 0);
});

test('確定通知の複数矛盾を失敗にし、挙がらない欄を正解として記憶する', () => {
  const memory = {};
  const failedObservation = {
    part:{ name:'temariBoard', temari:{
      face:'truth', cards:[], notice:'第1番の死者欄。この仮説には矛盾がある。手掛かり。 第2番の意味欄。この仮説には矛盾がある。手掛かり。',
      slots:[
        { number:1, kind:'dead', cardId:'sogen', empty:false },
        { number:1, kind:'actor', cardId:'goko', empty:false },
        { number:2, kind:'meaning', cardId:'poison', empty:false },
      ],
    } },
  };
  reconcileTemariAttempt(failedObservation, memory);
  assert.deepEqual(memory.temariFailedPlacements, ['truth:sogen:1:dead', 'truth:poison:2:meaning']);
  assert.deepEqual(memory.temariVerifiedPlacements, ['truth:goko:1:actor']);
});

test('ペルソナ方針は正解表を読み込まず、表示された矛盾文だけを記憶する', () => {
  const source = fs.readFileSync(new URL('../tools/AIプレイ/ペルソナ/共通.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /boardSolution|boardCover/);
  const memory = {};
  reconcileTemariAttempt({
    part:{ name:'temariBoard', temari:{
      face:'truth', notice:'第1番の意味欄。この仮説には矛盾がある。',
      cards:[], slots:[{ number:1, kind:'meaning', cardId:'surface', empty:false }],
    } },
  }, memory);
  assert.deepEqual(memory.temariFailedPlacements, ['truth:surface:1:meaning']);
});

test('推理型は未解消矛盾の間は確定せず、解消後に確定してコミットする', () => {
  const incomplete = temariPolicy({ meta:{ action:'confirm' } }, observation, {}, 'deduce');
  const completeObservation = {
    part:{ name:'temariBoard', temari:{ ...observation.part.temari, slots:slots.map((slot) => ({ ...slot, empty:false })) } },
  };
  const failedMemory = { temariFailedPlacements:['truth:poison:1:meaning'] };
  const failedComplete = {
    part:{ name:'temariBoard', temari:{ ...completeObservation.part.temari,
      slots:[{ ...slots[0], cardId:'poison', empty:false }, { ...slots[1], empty:false }] } },
  };
  const blocked = temariPolicy({ meta:{ action:'confirm' } }, failedComplete, failedMemory, 'deduce');
  const blockedCommit = temariPolicy({ meta:{ action:'commit' } }, failedComplete, failedMemory, 'deduce');
  const complete = temariPolicy({ meta:{ action:'confirm' } }, completeObservation, {}, 'deduce');
  assert.ok(incomplete.score < 0);
  assert.ok(blocked.score < 0);
  assert.ok(blockedCommit.score < 0);
  assert.ok(complete.score > 0);
  assert.ok(temariPolicy({ meta:{ action:'commit' } }, completeObservation, {}, 'deduce').score > complete.score);
});

test('推理型はverified欄を上書きせず、置けない選択札だけ解除する', () => {
  const memory = { temariVerifiedPlacements:['truth:body_swap:2:meaning'] };
  assert.ok(temariPolicy({ meta:{ action:'slot', number:2, kind:'meaning' } }, observation, memory, 'deduce').score < -100);
  const selectable = temariPolicy({ meta:{ action:'card', cardId:'poison', selected:true } }, observation, {}, 'deduce');
  const noPlace = { part:{ name:'temariBoard', temari:{ ...observation.part.temari, slots:slots.map((slot) => ({ ...slot, empty:false })) } } };
  const deselect = temariPolicy({ meta:{ action:'card', cardId:'poison', selected:true } }, noPlace, {}, 'deduce');
  assert.ok(selectable.score < 0);
  assert.ok(deselect.score > 0);
});

test('非推理型は方針上置きたい未試行欄の有無と選択解除を噛み合わせる', () => {
  const exhausted = { temariTriedPlacements:['truth:poison:1:meaning', 'truth:poison:2:meaning'] };
  for (const strategy of ['safe', 'quick', 'ordered', 'hide', 'relic', 'rush']) {
    assert.ok(temariPolicy({ meta:{ action:'card', cardId:'poison', selected:true } }, observation, {}, strategy).score < 0, strategy);
    assert.ok(temariPolicy({ meta:{ action:'card', cardId:'poison', selected:false } }, observation, exhausted, strategy).score < 0, strategy);
    assert.ok(temariPolicy({ meta:{ action:'card', cardId:'poison', selected:true } }, observation, exhausted, strategy).score > 0, strategy);
  }
  const disruptObservation = {
    part:{ name:'temariBoard', temari:{ ...observation.part.temari,
      slots:[...slots, { number:1, kind:'dead', cardId:null, empty:true }] } },
  };
  const disruptExhausted = { temariTriedPlacements:['truth:poison:1:meaning', 'truth:poison:2:meaning'] };
  assert.ok(temariPolicy({ meta:{ action:'card', cardId:'poison', selected:false } }, disruptObservation, disruptExhausted, 'disrupt').score > 0);
  assert.ok(temariPolicy({ meta:{ action:'card', cardId:'poison', selected:true } }, disruptObservation, disruptExhausted, 'disrupt').score < 0);
});

test('非推理型も確定後はコミットを最優先する', () => {
  for (const strategy of ['quick', 'ordered', 'hide', 'relic', 'disrupt', 'rush', 'safe']) {
    const commit = temariPolicy({ meta:{ action:'commit' } }, observation, {}, strategy);
    const done = temariPolicy({ meta:{ action:'done' } }, observation, { temariCards:['poison'] }, strategy);
    assert.ok(commit.score > done.score, strategy);
  }
});

test('ライト層と指示待ち層は一枚を試した後、自分で盤を伏せる', () => {
  const done = { meta:{ action:'done' } };
  assert.ok(temariPolicy(done, observation, {}, 'quick').score < 0);
  assert.ok(temariPolicy(done, observation, { temariCards:['poison'] }, 'quick').score > 0);
  assert.ok(temariPolicy(done, observation, {}, 'ordered').score < 0);
  assert.ok(temariPolicy(done, observation, { temariCards:['onda'] }, 'ordered').score > 0);
});

test('二面は画面情報だけで別の方針を選べ、採点も別の正本を使う', () => {
  const faceOptions = {
    part:{ name:'temariBoard', temari:{ face:'show', cards:[], slots:[] } },
  };
  assert.ok(temariPolicy({ meta:{ action:'face', face:'truth' } }, faceOptions, {}, 'deduce').score > 0);
  assert.ok(temariPolicy({ meta:{ action:'face', face:'show' } }, { part:{ name:'temariBoard', temari:{ ...faceOptions.part.temari, face:'truth' } } }, {}, 'hide').score > 0);
  assert.ok(temariPolicy({ meta:{ action:'face', face:'show' } }, faceOptions, {}, 'hide').score < 0);
  const truth = Object.fromEntries([1, 2].map((number) => [number, { ...boardSolution[number - 1] }]));
  const shown = Object.fromEntries([1, 2].map((number) => [number, { ...boardCover[number - 1] }]));
  const score = assessBoardHypothesis(truth, shown, [1, 2].map((number) => ({ number })));
  assert.equal(score.truthAccuracy, 6);
  assert.equal(score.showCredibility, 6);
  assert.deepEqual(boardCompletionEffects(score, 6, true).at(-1), { t:'flag', id:'other_scriptwriter_noticed' });
});

test('全欄で試し終えた札を再び操作候補へ出さない', () => {
  const boardSlots = [
    { number:'1', kind:'dead' },
    { number:'1', kind:'actor' },
    { number:'1', kind:'meaning' },
    { number:'2', kind:'dead' },
    { number:'2', kind:'actor' },
    { number:'2', kind:'meaning' },
  ];
  const exhausted = boardSlots.map((slot) => `show:${slot.number}:${slot.kind}:onda`);
  assert.equal(hasUntriedBoardPlacement('show', 'onda', boardSlots, exhausted), false);
  assert.equal(hasUntriedBoardPlacement('show', 'poison', boardSlots, exhausted), true);
  assert.equal(hasUntriedBoardPlacement('truth', 'onda', boardSlots, exhausted), true);
});
