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

test('不正解だった同一配置を記憶して繰り返さない', () => {
  const memory = { temariPending:{ face:'truth', cardId:'poison', number:1, kind:'meaning' } };
  const failedObservation = {
    part:{ name:'temariBoard', temari:{ ...observation.part.temari, notice:'珈琲の毒を意味の欄へ置いた。この仮説には矛盾がある。', slots:[{ ...slots[0], cardId:'poison' }, slots[1]] } },
  };
  reconcileTemariAttempt(failedObservation, memory);
  const retried = temariPolicy({ meta:{ action:'slot', number:1, kind:'meaning' } }, failedObservation, memory, 'deduce');
  assert.ok(retried.score < 0);
  assert.equal(memory.temariPending, null);
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

test('推理型は全欄を仮説で埋めてから確定する', () => {
  const incomplete = temariPolicy({ meta:{ action:'confirm' } }, observation, {}, 'deduce');
  const completeObservation = {
    part:{ name:'temariBoard', temari:{ ...observation.part.temari, slots:slots.map((slot) => ({ ...slot, empty:false })) } },
  };
  const complete = temariPolicy({ meta:{ action:'confirm' } }, completeObservation, {}, 'deduce');
  assert.ok(incomplete.score < 0);
  assert.ok(complete.score > 0);
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
