import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { boardSolution } from '../../src/data/temariuta-board.js';
import { applyHypothesis, judge, kinds, nameOf, verses } from './判定役.mjs';

const runDirectory = new URL('./ログ/実行/', import.meta.url);
const summaryUrl = new URL('./ログ/サマリ.json', import.meta.url);

let fileNames;
try {
  fileNames = (await readdir(runDirectory)).filter((name) => name.endsWith('.json')).sort();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  fileNames = [];
}

if (fileNames.length === 0) {
  console.error('人間代行プレイの生ログがありません: tools/人間代行プレイ/ログ/実行/*.json');
  process.exitCode = 1;
} else {
  const logs = await Promise.all(fileNames.map(async (fileName) => ({
    fileName,
    data:JSON.parse(await readFile(new URL(fileName, runDirectory), 'utf8')),
  })));
  const misplacementCounts = new Map();

  const runs = logs.map(({ fileName, data }) => {
    const rounds = Array.isArray(data.rounds) ? data.rounds : [];
    for (const round of rounds) {
      if (!round.hypothesis) continue;
      const { board } = applyHypothesis(round.hypothesis);
      const notice = judge(board).notice;
      for (const verse of verses) {
        for (const [kind, label] of kinds) {
          const cardId = board[verse.number][kind];
          if (!cardId || cardId === boardSolution[verse.number - 1][kind]) continue;
          const prefix = `第${verse.number}番の${label}欄。`;
          const contradiction = notice.split('\n').find((line) => line.startsWith(prefix)) || '';
          if (!contradiction) continue;
          const key = `${verse.number}\u0000${kind}\u0000${cardId}`;
          const current = misplacementCounts.get(key) || {
            verse:verse.number, slot:kind, slotLabel:label, cardId,
            cardName:nameOf(cardId), count:0, contradictions:[],
          };
          current.count += 1;
          if (!current.contradictions.includes(contradiction)) current.contradictions.push(contradiction);
          misplacementCounts.set(key, current);
        }
      }
    }
    return {
      file:fileName,
      model:data.model ?? '不明',
      effort:data.effort ?? '不明',
      solved:Boolean(data.solved),
      confirmationCount:data.solved ? data.solvedAtRound : rounds.filter((round) => round.hypothesis).length,
      accuracyTrend:rounds.filter((round) => Number.isFinite(round.truthAccuracy)).map((round) => round.truthAccuracy),
      cheatSuspicion:rounds.some((round) => round.cheatSuspicion === true),
      placementErrorCount:rounds.reduce((sum, round) => sum + (round.placementErrors?.length || 0), 0),
    };
  }).sort((a, b) => a.model.localeCompare(b.model) || a.effort.localeCompare(b.effort));

  const misplacements = [...misplacementCounts.values()]
    .sort((a, b) => b.count - a.count || a.verse - b.verse || a.slot.localeCompare(b.slot) || a.cardName.localeCompare(b.cardName));
  const summary = { generatedAt:new Date().toISOString(), runs, misplacements };

  console.table(runs.map((run) => ({
    モデル:run.model,
    effort:run.effort,
    解けた:run.solved ? '○' : '×',
    確定回数:run.confirmationCount,
    正確さの推移:run.accuracyTrend.join('→') || '—',
    不正読み取りの疑い:run.cheatSuspicion ? '要監査' : 'なし',
    配置エラー数:run.placementErrorCount,
  })));
  console.log('\n誤配置の内訳（矛盾を指摘された欄・回数順）');
  if (misplacements.length === 0) {
    console.log('誤配置なし');
  } else {
    console.table(misplacements.map((entry) => ({
      欄:`${entry.verse}番の${entry.slotLabel}`,
      札:entry.cardName,
      回数:entry.count,
      矛盾文:entry.contradictions.join(' / '),
    })));
  }

  await mkdir(new URL('./ログ/', import.meta.url), { recursive:true });
  await writeFile(summaryUrl, `${JSON.stringify(summary, null, 2)}\n`);
  console.log('\nサマリを書き出しました: tools/人間代行プレイ/ログ/サマリ.json');
}
