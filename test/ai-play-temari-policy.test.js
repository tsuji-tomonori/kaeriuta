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

const effectNote = '「この仮説で確定」で矛盾文を確認し、「盤を置いて席を立つ」で効果が適用されます。';
const showHeading = '悟郎たちへ差し出す盤。表の読みに寄せるほど確信は下がる。栞の名を置けば、その場で疑いを呼ぶ。';
const truthHeading = '栞だけが綴じる盤。正しく読むほど、知りすぎの余白が増える。';
function effectObservation(face = 'show') {
  return { kind:'part', part:{ name:'temariBoard',
    text:`${face === 'show' ? showHeading : truthHeading} まことの盤 見せる盤 ${effectNote}`,
    temari:{ face, cards:['shiori', 'sogen', 'goko', 'poison', 'body_swap'].map(id => ({ ...boardCards[id], selected:false })),
      slots:[
        { number:1, kind:'actor', cardId:null, empty:true },
        { number:1, kind:'meaning', cardId:null, empty:true },
      ] },
  } };
}
const operation = (action, details = {}) => ({ meta:{ action, ...details } });
const policyScore = (strategy, obs, action, details = {}, memory = {}) => temariPolicy(operation(action, details), obs, memory, strategy).score;

test('hideは効果説明を根拠に表の読みを優先し、確定前に伏せず、確定後commitする', () => {
  const obs = effectObservation();
  const score = (action, details) => policyScore('hide', obs, action, details);
  assert.ok(score('card', {cardId:'poison'}) > score('card', {cardId:'body_swap'}));
  assert.ok(score('card', {cardId:'poison'}) > score('done'));
  assert.ok(score('face', {face:'truth'}) < 0);
  assert.ok(score('confirm') < 0);
  obs.part.temari.slots.forEach(slot => { slot.empty = false; slot.cardId = slot.kind === 'actor' ? 'sogen' : 'poison'; });
  assert.ok(score('confirm') > score('done'));
  assert.ok(score('confirm') > score('card', {cardId:'body_swap'}));
  assert.ok(score('commit') > score('confirm'));
  assert.match(temariPolicy(operation('confirm'), obs, {}, 'hide').grounds.join(' '), /表の読みに寄せるほど確信は下がる。/);
});

test('hideは栞の札を選ばず、持っていても種別の合う欄へ置かずに戻す', () => {
  const obs = effectObservation();
  assert.ok(policyScore('hide', obs, 'card', {cardId:'shiori'}) < 0);
  obs.part.temari.cards.find(card => card.id === 'shiori').selected = true;
  assert.ok(policyScore('hide', obs, 'card', {cardId:'shiori', selected:true})
    > policyScore('hide', obs, 'slot', {number:1, kind:'actor'}));
});

test('hideは置ける札・欄が尽きた場合にだけ未完成の盤を伏せる', () => {
  const obs = effectObservation();
  obs.part.temari.cards = obs.part.temari.cards.filter(card => card.id === 'shiori');
  assert.ok(policyScore('hide', obs, 'done') > policyScore('hide', obs, 'card', {cardId:'shiori'}));
  assert.ok(policyScore('hide', obs, 'done') > 0);
  const tried = effectObservation();
  const memory = { temariTriedPlacements:tried.part.temari.cards.flatMap(card =>
    tried.part.temari.slots.map(slot => `show:${card.id}:${slot.number}:${slot.kind}`)) };
  assert.ok(policyScore('hide', tried, 'done', {}, memory) > 0);
});

test('disruptは疑いの説明を読んで見せる盤の栞を種別の合う欄へ置く', () => {
  const obs = effectObservation();
  assert.ok(policyScore('disrupt', obs, 'card', {cardId:'shiori'}) > policyScore('disrupt', obs, 'card', {cardId:'sogen'}));
  obs.part.temari.cards.find(card => card.id === 'shiori').selected = true;
  assert.ok(policyScore('disrupt', obs, 'slot', {number:1, kind:'actor'}) > policyScore('disrupt', obs, 'slot', {number:1, kind:'meaning'}));
  assert.match(temariPolicy(operation('card', {cardId:'shiori'}), obs, {}, 'disrupt').grounds.join(' '), /栞の名を置けば、その場で疑いを呼ぶ。/);
  obs.part.temari.slots[0] = {number:1, kind:'actor', cardId:'shiori', empty:false};
  assert.ok(policyScore('disrupt', obs, 'face', {face:'truth'}) > policyScore('disrupt', obs, 'confirm'));
  obs.part.temari.cards.forEach(card => { card.selected = card.id === 'sogen'; });
  assert.ok(policyScore('disrupt', obs, 'slot', {number:1, kind:'actor'}) < 0, '置いた栞は上書きしない');
});

test('disruptはまことの盤への実配置を観測した後、見せる盤へ戻り確定する', () => {
  const obs = effectObservation('truth');
  const memory = {temariPending:{face:'truth', cardId:'sogen', number:1, kind:'actor'}};
  reconcileTemariAttempt(obs, memory);
  assert.equal(memory.temariPlacedFaces, undefined, '札を選んだだけでは配置済みにしない');
  assert.ok(policyScore('disrupt', obs, 'face', {face:'show'}, memory) < 0);
  obs.part.temari.slots[0] = {number:1, kind:'actor', cardId:'sogen', empty:false};
  reconcileTemariAttempt(obs, memory);
  assert.deepEqual(memory.temariPlacedFaces, ['truth']);
  assert.ok(policyScore('disrupt', obs, 'face', {face:'show'}, memory) > policyScore('disrupt', obs, 'confirm', {}, memory));
});

test('condemnは表示されたまことの盤を開き、見出しと札の宗玄を根拠に配置する', () => {
  const show = effectObservation();
  assert.ok(policyScore('condemn', show, 'face', {face:'truth'}) > policyScore('condemn', show, 'card', {cardId:'sogen'}));
  assert.ok(policyScore('condemn', show, 'card', {cardId:'shiori'}) < 0);
  const truth = effectObservation('truth');
  assert.ok(policyScore('condemn', truth, 'card', {cardId:'sogen'}) > policyScore('condemn', truth, 'card', {cardId:'poison'}));
  assert.ok(policyScore('condemn', truth, 'card', {cardId:'goko'}) > policyScore('condemn', truth, 'card', {cardId:'poison'}), '注記の宗玄も読む');
  truth.part.temari.cards.find(card => card.id === 'sogen').selected = true;
  assert.ok(policyScore('condemn', truth, 'slot', {number:1, kind:'actor'}) > policyScore('condemn', truth, 'slot', {number:1, kind:'meaning'}));
  assert.match(temariPolicy(operation('card', {cardId:'sogen'}), truth, {}, 'condemn').grounds.join(' '), /栞だけが綴じる盤。.*宗玄/);
});

test('効果文が画面にない・文言が変わった場合は従来の盤方針へ戻る', () => {
  const options = [operation('done'), operation('confirm'), operation('commit'), operation('face', {face:'truth'}), operation('card', {cardId:'shiori'})];
  for (const strategy of ['hide', 'disrupt', 'condemn']) {
    const absent = effectObservation();
    absent.part.text = '';
    const changed = effectObservation();
    changed.part.text = '説明文は改稿された。';
    // observation.text に旧説明が残っていても、盤の表示文から読めないなら使わない。
    changed.text = showHeading + effectNote;
    for (const option of options) {
      const old = temariPolicy(option, absent, {}, strategy === 'condemn' ? 'disrupt' : strategy);
      assert.deepEqual(temariPolicy(option, changed, {}, strategy), old, strategy);
      assert.deepEqual(temariPolicy(option, absent, {}, strategy), old, strategy);
    }
  }
  for (const strategy of ['hide', 'disrupt']) {
    const changed = effectObservation();
    changed.part.text = changed.part.text.replace('栞の名を置けば、その場で疑いを呼ぶ。', '栞の名は注目される。');
    const absent = effectObservation(); absent.part.text = '';
    assert.deepEqual(temariPolicy(operation('done'), changed, {}, strategy), temariPolicy(operation('done'), absent, {}, strategy));
  }
});

test('盤操作ボタンの汎用語群加点は、効果文を読んだ対象方針だけで抑える', () => {
  const obs = effectObservation();
  obs.part.options = [{index:0, label:'盤を伏せて席を立つ', meta:{action:'done'}}];
  const profile = {reason:'', temariStrategy:'hide', weights:{conceal:5}, contextWeights:{conceal:2}, labels:{conceal:'沈黙・隠蔽'}};
  obs.part.text += ' 伏せ';
  assert.doesNotMatch(decideByScore(obs, {}, profile).reason, /沈黙・隠蔽/);
  assert.match(decideByScore(obs, {}, {...profile, temariStrategy:'rush'}).reason, /沈黙・隠蔽/);
  obs.part.text = '';
  assert.match(decideByScore(obs, {}, profile).reason, /沈黙・隠蔽/);
});
