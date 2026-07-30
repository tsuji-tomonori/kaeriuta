import { boardCards, boardCover, boardSolution, boardVerses } from '../src/data/temariuta-board.js';
import { scenes } from '../src/data/scenario/index.js';
import { canPlaceBoardCard, selectBoardVerses } from '../src/systems/temariuta-board/index.js';
import fs from 'node:fs';

const errors = [];
const kinds = ['dead', 'actor', 'meaning'];
for (const [label, answer] of [['boardSolution', boardSolution], ['boardCover', boardCover]]) {
  if (answer.length !== 6) errors.push(`${label}: 6詩ぶん定義されていない`);
  for (let index = 0; index < 6; index++) {
    const row = answer[index];
    for (const kind of kinds) {
      const cardId = row?.[kind];
      if (!cardId) errors.push(`${label}[${index + 1}].${kind}: 定義がない`);
      else if (!boardCards[cardId]) errors.push(`${label}[${index + 1}].${kind}: 札 ${cardId} が boardCards に存在しない`);
      else if (!canPlaceBoardCard(cardId, kind)) errors.push(`${label}[${index + 1}].${kind}: 札 ${cardId} は ${kind} 欄に置けない`);
      if (label === 'boardCover' && cardId === 'shiori') errors.push(`boardCover[${index + 1}].${kind}: 栞を見せる盤に置けない`);
    }
  }
}
const coverDifferences = boardSolution.flatMap((row, index) => kinds.filter((kind) => row?.[kind] !== boardCover[index]?.[kind]));
if (!coverDifferences.length) errors.push('boardCover: boardSolution と1欄以上食い違う必要がある');

const calls = [];
const visit = (value, location = '') => {
  if (Array.isArray(value)) return value.forEach((entry, index) => visit(entry, `${location}[${index}]`));
  if (!value || typeof value !== 'object') return;
  if (value.t === 'call' && value.part === 'temariBoard') calls.push({ args:value.args || {}, location });
  for (const [key, entry] of Object.entries(value)) visit(entry, `${location}.${key}`);
};
for (const [sceneId, scene] of Object.entries(scenes)) visit(scene, sceneId);

for (const { args, location } of calls) {
  const verses = selectBoardVerses(args, {});
  const cards = new Set(args.cards || []);
  if (!cards.has('shiori')) errors.push(`${location}: 見せる盤で栞を名指しする罰を発火させる shiori の札が配布されていない`);
  const reachableCount = (answer) => verses.flatMap((verse) => kinds.map((kind) => answer[verse.number - 1]?.[kind])).filter((cardId) => cards.has(cardId)).length;
  const reachable = reachableCount(boardSolution);
  const coverReachable = reachableCount(boardCover);
  const threshold = args.awarenessThreshold ?? 6;
  if (reachable < threshold) errors.push(`${location}: 配布札で到達可能な truthAccuracy 上限 ${reachable} が awarenessThreshold ${threshold} 未満`);
  if (coverReachable < verses.length * kinds.length) errors.push(`${location}: 配布札だけで boardCover を組めない（${coverReachable}/${verses.length * kinds.length}）`);
  const differsInPlayedVerse = verses.some((verse) => kinds.some((kind) => boardSolution[verse.number - 1][kind] !== boardCover[verse.number - 1][kind]));
  if (!differsInPlayedVerse) errors.push(`${location}: 実際に出す詩で boardCover と boardSolution が食い違わない`);
  const initial = Object.fromEntries(verses.map((verse) => [verse.number, verse.slots || {}]));
  const initialMatches = (answer) => verses.flatMap((verse) => kinds.map((kind) => initial[verse.number][kind] === answer[verse.number - 1][kind])).filter(Boolean).length;
  const initialTruth = initialMatches(boardSolution);
  const initialCover = initialMatches(boardCover);
  const maximum = verses.length * kinds.length;
  if (initialTruth >= maximum) errors.push(`${location}: 初期配置だけでまことの盤が満点 (${initialTruth}/${maximum})`);
  if (initialCover >= maximum) errors.push(`${location}: 初期配置だけで見せる盤が満点 (${initialCover}/${maximum})`);
  for (const verse of verses) {
    const source = boardVerses[verse.number - 1];
    for (const [face, answer] of [['truth', boardSolution], ['show', boardCover]]) {
      for (const kind of kinds) {
        const candidates = [...cards].filter((cardId) => canPlaceBoardCard(cardId, kind) && cardId !== answer[verse.number - 1]?.[kind]);
        const clues = source?.contradictions?.[face]?.[kind] || {};
        for (const cardId of candidates) {
          if (!clues[cardId]) errors.push(`${location}: ${verse.number}番 ${face}面 ${kind}欄の誤配置 ${cardId} に矛盾文がない`);
        }
      }
    }
  }
  console.log(`${location}: 初期配置 真=${initialTruth}/${maximum} 表=${initialCover}/${maximum}`);
}

// 画面の board-axis と自動プレイの抽出器は、同じ三つの観測項目を必ず持つ。
// 片方の表示語だけを変えると、この静的検査で止まる。
const axisSource = fs.readFileSync(new URL('../src/systems/temariuta-board/index.js', import.meta.url), 'utf8');
const readerSource = fs.readFileSync(new URL('./AIプレイ/自動プレイ.js', import.meta.url), 'utf8');
for (const label of ['表の読みへの一致', 'まことの盤の正確さ', '見せる盤の栞の名指し']) {
  if (!axisSource.includes(label)) errors.push(`board-axis: 観測項目 ${label} を表示していない`);
  if (!readerSource.includes(label)) errors.push(`自動プレイ: 観測項目 ${label} を読み取っていない`);
}

if (errors.length) {
  for (const error of errors) console.error(`ボード整合検査: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`ボード整合検査: OK (${calls.length}件の temariBoard 呼び出し)`);
}
