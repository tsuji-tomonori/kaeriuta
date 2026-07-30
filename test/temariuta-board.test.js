import test from 'node:test';
import assert from 'node:assert/strict';
import { boardCards, boardCover, boardSolution, boardVerses } from '../src/data/temariuta-board.js';
import { assessBoardHypothesis, boardCompletionEffects, boardEvaluation, boardEffectsFor, canPlaceBoardCard, confirmBoardHypothesis, contradictionFor, placeBoardCard, selectBoardVerses } from '../src/systems/temariuta-board/index.js';
import { chapter2 } from '../src/data/scenario/chapter2.js';

test('盤の札はすべて日本語の表示名を持つ', () => {
  for (const card of Object.values(boardCards)) assert.ok(card.name && !/^[a-z_]+$/.test(card.name));
});
test('解答が参照する札はすべて定義されている', () => {
  for (const answer of [boardSolution, boardCover]) for (const row of answer) for (const id of Object.values(row)) assert.ok(boardCards[id]);
});
test('札は同じ種類の欄にしか置けない', () => {
  assert.equal(canPlaceBoardCard('onda', 'dead'), true);
  assert.equal(canPlaceBoardCard('onda', 'actor'), false);
});
test('正解の札は全て対応する欄に置ける', () => {
  for (const answer of [boardSolution, boardCover]) for (const row of answer) for (const [kind, cardId] of Object.entries(row)) assert.equal(canPlaceBoardCard(cardId, kind), true, `${cardId} -> ${kind}`);
});
test('見せる盤は栞を置かず、まことの盤と食い違う', () => {
  assert.ok(boardCover.some((row, index) => Object.keys(row).some((kind) => row[kind] !== boardSolution[index][kind])));
  assert.equal(boardCover.some((row) => Object.values(row).includes('shiori')), false);
});
test('実際に遊ぶ一番・二番では、渡せる読みが真相を隠す', () => {
  assert.notDeepEqual(boardCover[0], boardSolution[0]);
  assert.notDeepEqual(boardCover[1], boardSolution[1]);
  assert.deepEqual(boardCover[1], { dead:'sogen', actor:'goko', meaning:'poison' });
  assert.notEqual(boardCover[1].meaning, 'corpse_callus');
  const call = chapter2.nodes.find((node) => node.t === 'call' && node.part === 'temariBoard');
  const verses = selectBoardVerses(call.args, {});
  const initial = Object.fromEntries(verses.map((verse) => [verse.number, verse.slots]));
  const score = (answer) => verses.flatMap((verse) => ['dead', 'actor', 'meaning'].map((kind) => initial[verse.number][kind] === answer[verse.number - 1][kind])).filter(Boolean).length;
  assert.equal(score(boardCover), 2);
  assert.equal(score(boardSolution), 2);
  assert.ok(call.args.cards.includes('shiori'));
});
test('呼び出し側が渡した番だけを盤へ載せる', () => {
  assert.deepEqual(selectBoardVerses({ verses:[{ number:2 }] }, {}).map((verse) => verse.number), [2]);
});
test('呼び出し側の初期配置と本文IDを盤へ残す', () => {
  const [verse] = selectBoardVerses({ verses:[{ number:1, textId:'temariuta_1', slots:{ dead:'onda', actor:null, meaning:'surface' } }] }, {});
  assert.equal(verse.textId, 'temariuta_1');
  assert.deepEqual(verse.slots, { dead:'onda', actor:null, meaning:'surface' });
});
test('矛盾文は面別で、まことの盤の正解を否定しない', () => {
  assert.equal(contradictionFor(1, 'truth', 'actor', 'goko'), 'この置き方を裏づける頁が、まだどこにもない。');
  assert.match(contradictionFor(1, 'show', 'actor', 'goko'), /大広間/);
  assert.equal(contradictionFor(1, 'truth', 'dead', 'sogen'), '一番の死者を宗玄にすると、顔を失う二番と同じ夜へ重なる。金の盃の客は別にいる。');
});
test('実際に遊ぶ詩は両面とも配布札の誤配置を全欄で矛盾文にできる', () => {
  const call = chapter2.nodes.find((node) => node.t === 'call' && node.part === 'temariBoard');
  for (const verse of selectBoardVerses(call.args, {})) for (const [face, answer] of [['truth', boardSolution], ['show', boardCover]]) {
    for (const kind of ['dead', 'actor', 'meaning']) for (const cardId of call.args.cards) {
      if (boardCards[cardId].kinds.includes(kind) && cardId !== answer[verse.number - 1][kind]) {
        assert.notEqual(contradictionFor(verse.number, face, kind, cardId), 'この置き方を裏づける頁が、まだどこにもない。');
      }
    }
  }
  assert.ok(boardVerses[0].contradictions.truth && boardVerses[0].contradictions.show);
});
test('後方互換の boardEvaluation は従来どおり行列で返す', () => {
  assert.deepEqual(boardEvaluation([['onda', 'goko', 'poison'], ['sogen', null, null]]), [[true, true, true], [true, null, null]]);
});
test('先頭の札だけを掴む検証操作でも盤の空欄は有限回で埋まる', () => {
  const verses = selectBoardVerses({}, {});
  const availableCards = Object.keys(boardCards);
  let face = Object.fromEntries(verses.map((verse) => [verse.number, { dead:null, actor:null, meaning:null }]));
  let selected = null;
  for (let steps = 0; steps < 200; steps++) {
    if (!selected) selected = availableCards[0];
    const empty = verses.flatMap((verse) => ['dead', 'actor', 'meaning'].map((kind) => ({ number:verse.number, kind }))).find(({ number, kind }) => !face[number][kind]);
    if (!empty) return;
    face = placeBoardCard(face, empty.number, empty.kind, selected);
    selected = null;
  }
  assert.fail('先頭の札を選び続けても、200操作以内に盤が埋まらなかった');
});
test('盤の知りすぎは完全に読めたときだけ合計1増す', () => {
  assert.deepEqual(boardEffectsFor({ truthAccuracy:5, showCredibility:0, divergence:0 }, 6), [{ t:'log', key:'temari_board_matches', value:5 }]);
  assert.deepEqual(boardEffectsFor({ truthAccuracy:6, showCredibility:0, divergence:0 }, 6), [{ t:'log', key:'temari_board_matches', value:6 }, { t:'param', key:'overknow', delta:1 }, { t:'flag', id:'other_scriptwriter_noticed' }]);
});
test('表の読みへの一致だけが確信を下げ、見せる盤の栞は疑いと警戒を上げる', () => {
  const shown = { 1:{ ...boardCover[0], actor:'shiori' } };
  const truth = { 1:{ ...boardSolution[0] } };
  const score = assessBoardHypothesis(truth, shown, [{ number:1 }]);
  assert.deepEqual(score, { truthAccuracy:3, showCredibility:2, divergence:1, showShiori:1, total:3 });
  assert.deepEqual(boardEffectsFor(score, 6), [
    { t:'log', key:'temari_board_matches', value:3 },
    { t:'param', key:'conviction', delta:-8 },
    { t:'param', key:'awareness', delta:8 },
    { t:'param', key:'suspicion', delta:6 },
  ]);
});
test('仮説の確定は結果文と終了可能状態だけを返し、即座には終了しない', () => {
  const verses = selectBoardVerses({ verses:[{ number:1 }] });
  const board = { 1:{ ...boardSolution[0] } };
  const confirmation = confirmBoardHypothesis(board, 'truth', verses);
  assert.equal(confirmation.ends, false);
  assert.equal(confirmation.canCommit, true);
  assert.equal(confirmation.notice, '金の糸が頁を綴じた。私は真相へ一歩近づき、そのぶん読まれてはいけない余白を増やした。');
});
test('盤の効果は確定結果のあとに盤を置いて席を立つ場合だけ得る', () => {
  const score = { truthAccuracy:6, showCredibility:0, divergence:0 };
  assert.deepEqual(boardCompletionEffects(score, 6, false), [{ t:'log', key:'temari_board_matches', value:6 }]);
  assert.deepEqual(boardCompletionEffects(score, 6, true), [{ t:'log', key:'temari_board_matches', value:6 }, { t:'param', key:'overknow', delta:1 }, { t:'flag', id:'other_scriptwriter_noticed' }]);
});
