import test from 'node:test';
import assert from 'node:assert/strict';
import { boardCards, boardSolution } from '../src/data/temariuta-board.js';
import { assessBoardHypothesis, boardCompletionEffects, placeBoardCard } from '../src/systems/temariuta-board/index.js';
import { decideByScore, reconcileTemariAttempt, temariPolicy } from '../tools/AIプレイ/ペルソナ/共通.js';
import { hasUntriedBoardPlacement } from '../tools/ブラウザ検証/進行基盤.js';

const card = { id:'poison', name:'珈琲の毒', note:'金の盃に残された眠りの読み', kinds:['meaning'], selected:true };
const slots = [
  { number:1, kind:'meaning', cardId:'surface', correct:false },
  { number:2, kind:'meaning', cardId:'body_swap', correct:true },
];
const observation = {
  part: {
    name:'temariBoard',
    temari:{ face:'truth', cards:[card], slots },
  },
};

test('推理型は金色の正解枠を上書きせず、未検証の欄を試す', () => {
  const memory = {};
  const open = temariPolicy({ meta:{ action:'slot', number:1, kind:'meaning' } }, observation, memory, 'deduce');
  const correct = temariPolicy({ meta:{ action:'slot', number:2, kind:'meaning' } }, observation, memory, 'deduce');
  assert.ok(open.score > 0);
  assert.ok(correct.score < 0);
});

test('不正解だった同一配置を記憶して繰り返さない', () => {
  const memory = { temariPending:{ face:'truth', cardId:'poison', number:1, kind:'meaning' } };
  const failedObservation = {
    part:{ name:'temariBoard', temari:{ ...observation.part.temari, slots:[{ ...slots[0], cardId:'poison' }, slots[1]] } },
  };
  reconcileTemariAttempt(failedObservation, memory);
  const retried = temariPolicy({ meta:{ action:'slot', number:1, kind:'meaning' } }, failedObservation, memory, 'deduce');
  assert.ok(retried.score < 0);
  assert.equal(memory.temariPending, null);
});

test('推理型は全欄が正解になってから確定する', () => {
  const incomplete = temariPolicy({ meta:{ action:'confirm' } }, observation, {}, 'deduce');
  const completeObservation = {
    part:{ name:'temariBoard', temari:{ ...observation.part.temari, slots:slots.map((slot) => ({ ...slot, correct:true })) } },
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

test('推理型ペルソナは正解表を渡されず、画面の金色フィードバックだけで6/6へ到達する', () => {
  const verses = [1, 2];
  const availableCards = ['onda', 'goko', 'poison', 'sogen', 'corpse_callus', 'body_swap'];
  const initial = {
    1:{ dead:'onda', actor:null, meaning:'surface' },
    2:{ dead:'sogen', actor:null, meaning:'surface' },
  };
  const faces = { truth:structuredClone(initial), show:structuredClone(initial) };
  const memory = {};
  const profile = {
    reason:'情報と証拠を増やして真相への経路を残す',
    advanceReason:'読み進める',
    labels:{},
    weights:{},
  };
  let face = 'show';
  let selected = null;
  let confirmed = false;

  const slotState = () => verses.flatMap((number) => ['dead', 'actor', 'meaning'].map((kind) => {
    const cardId = faces[face][number][kind];
    return {
      number,
      kind,
      cardId,
      correct:Boolean(cardId && cardId === boardSolution[number - 1][kind]),
      empty:!cardId,
      label:`${kind}: ${cardId ? boardCards[cardId].name : '—'}`,
    };
  }));
  const observation = (options) => ({
    kind:'part',
    text:'手毬唄の見立てを二つの盤で照合する',
    part:{
      name:'temariBoard',
      options,
      temari:{
        face,
        slots:slotState(),
        cards:availableCards.map((id) => ({ ...boardCards[id], selected:id === selected })),
      },
    },
  });

  for (let operation = 0; operation < 80 && !confirmed; operation++) {
    const slotsNow = slotState();
    const options = selected
      ? slotsNow.map((slot, index) => ({
        index,
        label:slot.label,
        meta:{ action:'slot', number:slot.number, kind:slot.kind },
      }))
      : [
        ...availableCards.map((id, index) => ({
          index,
          label:boardCards[id].name,
          meta:{ action:'card', cardId:id },
        })),
        {
          index:availableCards.length,
          label:face === 'truth' ? '見せる盤' : 'まことの盤',
          meta:{ action:'face', face:face === 'truth' ? 'show' : 'truth' },
        },
        ...(slotsNow.every((slot) => !slot.empty) ? [{
          index:availableCards.length + 1,
          label:'この仮説で確定',
          meta:{ action:'confirm' },
        }] : []),
        {
          index:availableCards.length + 2,
          label:'盤を伏せて席を立つ',
          meta:{ action:'done' },
        },
      ];
    const decision = decideByScore(observation(options), memory, profile);
    const action = options[decision.part];
    if (action.meta.action === 'face') face = action.meta.face;
    if (action.meta.action === 'card') selected = action.meta.cardId;
    if (action.meta.action === 'slot') {
      faces[face] = placeBoardCard(faces[face], action.meta.number, action.meta.kind, selected);
      selected = null;
    }
    if (action.meta.action === 'confirm') confirmed = true;
    assert.notEqual(action.meta.action, 'done', '完成前に盤を伏せていない');
  }

  assert.equal(confirmed, true, '80操作以内に盤を確定した');
  const score = assessBoardHypothesis(faces.truth, faces.show, verses.map((number) => ({ number })));
  assert.equal(score.truthAccuracy, 6);
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
