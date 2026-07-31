import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { boardCards, boardSolution, boardVerses } from '../../src/data/temariuta-board.js';
import { assessBoardHypothesis, canPlaceBoardCard, confirmBoardHypothesis, placeBoardCard } from '../../src/systems/temariuta-board/index.js';
import { chapter2 } from '../../src/data/scenario/chapter2.js';

const limit = 200;
const seedCount = 300;
const firstReachLimit = 100000;
const kinds = ['dead', 'actor', 'meaning'];
const call = chapter2.nodes.find((node) => node.t === 'call' && node.part === 'temariBoard');
const verses = boardVerses.slice(0, 2);
const cards = call.args.cards;
const initialBoard = () => Object.fromEntries(call.args.verses.map((verse) => [
  verse.number,
  { dead:null, actor:null, meaning:null, ...(verse.slots || {}) },
]));
const positions = verses.flatMap((verse) => kinds.map((kind) => ({ number:verse.number, kind })));
const scoreOf = (board) => assessBoardHypothesis(board, {}, verses).truthAccuracy;

function rng(seed = 0x13c0ffee) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomIndividual({ seed, knowsSolution = false } = {}) {
  let board = initialBoard();
  let operations = 0;
  let scoreAtLimit = null;
  let firstReach = null;
  const random = rng(seed);
  while (operations + 2 <= firstReachLimit && (operations < limit || firstReach === null)) {
    const target = positions[Math.floor(random() * positions.length)];
    const compatible = cards.filter((cardId) => canPlaceBoardCard(cardId, target.kind));
    const cardId = knowsSolution
      ? boardSolution[target.number - 1][target.kind]
      : compatible[Math.floor(random() * compatible.length)];
    operations++; // 札選択
    board = placeBoardCard(board, target.number, target.kind, cardId);
    operations++; // 欄配置
    const score = scoreOf(board);
    if (operations === limit) scoreAtLimit = score;
    if (score === 6 && firstReach === null) firstReach = operations;
  }
  return { operations, scoreAtLimit:scoreAtLimit ?? scoreOf(board), firstReach:firstReach ?? Infinity };
}

function contradictionIndividual({ ignoresContradictions = false } = {}) {
  let board = initialBoard();
  let operations = 0;
  const rejected = new Map();
  const compatibleFor = ({ kind }) => cards.filter((cardId) => canPlaceBoardCard(cardId, kind));
  for (const position of positions) {
    if (board[position.number][position.kind]) continue;
    const cardId = compatibleFor(position)[0];
    operations++;
    board = placeBoardCard(board, position.number, position.kind, cardId);
    operations++;
  }
  while (operations < limit) {
    const confirmation = confirmBoardHypothesis(board, 'truth', verses);
    operations++;
    const score = scoreOf(board);
    if (score === 6) return { operations, score };
    const wrong = ignoresContradictions ? [] : [...confirmation.notice.matchAll(/第(\d+)番の(死者|実行者|意味)欄。/g)]
      .map((match) => ({ number:Number(match[1]), kind:{ 死者:'dead', 実行者:'actor', 意味:'meaning' }[match[2]] }));
    if (!wrong.length) return { operations, score };
    for (const position of wrong) {
      const key = `${position.number}:${position.kind}`;
      const failures = rejected.get(key) || new Set();
      failures.add(board[position.number][position.kind]);
      rejected.set(key, failures);
      const next = compatibleFor(position).find((cardId) => !failures.has(cardId));
      assert.ok(next, `${key}: 矛盾文から除外しても候補が残る`);
      if (operations + 2 > limit) break;
      operations++;
      board = placeBoardCard(board, position.number, position.kind, next);
      operations++;
    }
  }
  return { operations, score:scoreOf(board) };
}

export function runBruteForceResistance(options = {}) {
  const negativeRuns = Array.from({ length:seedCount }, (_, index) => randomIndividual({
    seed:0x13c0ffee + index,
    knowsSolution:options.negativeKnowsSolution,
  }));
  const solvedAtLimit = negativeRuns.filter((run) => run.scoreAtLimit === 6).length;
  const finalSolvedRate = solvedAtLimit / negativeRuns.length;
  const firstReaches = negativeRuns.map((run) => run.firstReach).sort((a, b) => a - b);
  const medianFirstReach = firstReaches[Math.floor(firstReaches.length / 2)];
  const positive = contradictionIndividual({ ignoresContradictions:options.positiveIgnoresContradictions });
  // 盤の判定値を見ながら総当たりでも解けるため、不可能性は主張しない。
  // 矛盾文を読むと初回解決コストが約90倍安い、という分布上の差を固定する。
  console.log(`総当たり耐性・否定側: ${seedCount}シード、200操作時6/6率 ${(finalSolvedRate * 100).toFixed(2)}%、初回6/6中央値 ${medianFirstReach}操作`);
  console.log(`総当たり耐性・肯定側: ${positive.operations}操作、到達 ${positive.score}/6`);
  assert.ok(negativeRuns.every((run) => run.operations > 0), '否定側が0操作で終了した');
  assert.ok(positive.operations > 0, '肯定側が0操作で終了した');
  assert.ok(finalSolvedRate <= 0.02, `矛盾文を読まない個体の200操作時6/6率が${(finalSolvedRate * 100).toFixed(2)}%`);
  assert.ok(medianFirstReach >= 400, `矛盾文を読まない個体の初回6/6中央値が${medianFirstReach}操作`);
  assert.equal(positive.score, 6, `矛盾文を読む個体が${positive.operations}操作で6/6へ到達できない`);
  assert.ok(positive.operations <= 30, `矛盾文を読む個体の解決に${positive.operations}操作かかった`);
  return { negative:{ runs:negativeRuns, finalSolvedRate, medianFirstReach }, positive };
}

const directlyRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (directlyRun) {
  runBruteForceResistance({
    negativeKnowsSolution:process.argv.includes('--fault-negative-knows-solution'),
    positiveIgnoresContradictions:process.argv.includes('--fault-positive-ignores-contradictions'),
  });
}
