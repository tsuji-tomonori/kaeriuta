import { boardCards, boardSolution } from '../src/data/temariuta-board.js';
import { scenes } from '../src/data/scenario/index.js';
import { canPlaceBoardCard, selectBoardVerses } from '../src/systems/temariuta-board/index.js';

const errors = [];
for (const [index, row] of boardSolution.entries()) {
  for (const [kind, cardId] of Object.entries(row)) {
    if (!boardCards[cardId]) errors.push(`boardSolution[${index + 1}].${kind}: 札 ${cardId} が boardCards に存在しない`);
    else if (!canPlaceBoardCard(cardId, kind)) errors.push(`boardSolution[${index + 1}].${kind}: 札 ${cardId} は ${kind} 欄に置けない`);
  }
}

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
  const reachable = verses.flatMap((verse) => Object.values(boardSolution[verse.number - 1] || {})).filter((cardId) => cards.has(cardId)).length;
  const threshold = args.awarenessThreshold ?? 6;
  if (reachable < threshold) errors.push(`${location}: 配布札で到達可能な truthAccuracy 上限 ${reachable} が awarenessThreshold ${threshold} 未満`);
}

if (errors.length) {
  for (const error of errors) console.error(`ボード整合検査: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`ボード整合検査: OK (${calls.length}件の temariBoard 呼び出し)`);
}
