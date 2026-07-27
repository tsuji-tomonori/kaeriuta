import test from 'node:test';
import assert from 'node:assert/strict';
import { boardCards, boardSolution } from '../src/data/temariuta-board.js';
import { boardEvaluation, boardEffectsFor, canPlaceBoardCard, contradictionFor, placeBoardCard, selectBoardVerses } from '../src/systems/temariuta-board/index.js';

test('盤の札はすべて日本語の表示名を持つ', () => {
  for (const card of Object.values(boardCards)) assert.ok(card.name && !/^[a-z_]+$/.test(card.name));
});
test('解答が参照する札はすべて定義されている', () => {
  for (const row of boardSolution) for (const id of Object.values(row)) assert.ok(boardCards[id]);
});
test('札は同じ種類の欄にしか置けない', () => {
  assert.equal(canPlaceBoardCard('onda', 'dead'), true);
  assert.equal(canPlaceBoardCard('onda', 'actor'), false);
});
test('呼び出し側が渡した番だけを盤へ載せる', () => {
  assert.deepEqual(selectBoardVerses({ verses:[{ number:2 }] }, {}).map((verse) => verse.number), [2]);
});
test('矛盾文は定義済み配置を優先し、なければ汎用文を返す', () => {
  assert.match(contradictionFor(1, 'actor', 'goko'), /大広間/);
  assert.equal(contradictionFor(1, 'dead', 'sogen'), 'この置き方を裏づける頁が、まだどこにもない。');
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
