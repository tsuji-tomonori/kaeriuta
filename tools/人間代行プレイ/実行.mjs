// 人間の代わりに codex のモデルへ手毬唄ボードを解かせる。
// 使い方: node tools/人間代行プレイ/実行.mjs <model> <effort> [最大確定回数]
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyHypothesis, boardText, deckText, judge, versesText } from './判定役.mjs';

const [model, effort, maxRounds = '6'] = process.argv.slice(2);
const rounds = Number(maxRounds);
const base = path.dirname(fileURLToPath(import.meta.url));
const sandbox = mkdtempSync(path.join(tmpdir(), 'kaeriuta-play-'));
const outDir = path.join(base, 'ログ', '実行');
mkdirSync(outDir, { recursive:true });

const rules = `あなたは推理アドベンチャーゲーム『帰り唄』のプレイヤーです。第二章の「手毬唄ボード」というパズルを解いてください。

## 盤の仕組み

童唄が2つあり、それぞれに「死者」「実行者」「意味」の3つの欄があります（全6欄）。
手元の札を各欄へ置き、6欄すべてを埋めて「この仮説で確定」を押すと、**間違っている欄すべてについて**、なぜ矛盾するのかを述べた文が返ってきます。正しい欄については何も言われません。
何度でも置き直して確定できます。6欄すべてが正しくなれば解けたことになります。

## 童唄

${versesText()}

## 手札

${deckText()}

盤には最初から「表の読み」（まず卓上に置ける、穏当な筋書き）が両方の意味の欄に置かれています。これは一度どければ手札には戻りません。

## 答え方

考えた根拠を簡潔に述べたあと、**最後に必ず**次の形式の JSON をコードブロックで出力してください。値は札の名前（日本語）です。

\`\`\`json
{"1": {"死者": "…", "実行者": "…", "意味": "…"}, "2": {"死者": "…", "実行者": "…", "意味": "…"}}
\`\`\`

ファイルを読んだりコマンドを実行したりする必要はありません。読み物として与えられた情報だけで考えてください。`;

const history = [];
const log = { model, effort, rounds:[], solved:false, startedAt:new Date().toISOString() };

const callCodex = (prompt) => new Promise((resolve, reject) => {
  const outFile = path.join(sandbox, `reply-${history.length}.md`);
  const child = spawn('codex', [
    'exec', '--cd', sandbox, '--skip-git-repo-check', '-s', 'read-only',
    '-m', model, '-c', `model_reasoning_effort="${effort}"`, '-o', outFile, '-',
  ], { stdio:['pipe', 'pipe', 'pipe'] });
  let stdout = ''; let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.stdin.end(prompt);
  child.on('close', (code) => {
    if (code !== 0) return reject(new Error(`codex exit ${code}: ${stderr.slice(-500)}`));
    resolve({ reply:readFileSync(outFile, 'utf8'), stdout });
  });
});

const parseHypothesis = (reply) => {
  const blocks = [...reply.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((match) => match[1].trim());
  const candidates = blocks.length ? blocks : [reply];
  for (const text of candidates.reverse()) {
    try { return JSON.parse(text); } catch { /* 次の候補へ */ }
  }
  const brace = reply.lastIndexOf('{');
  if (brace >= 0) { try { return JSON.parse(reply.slice(brace)); } catch { /* 諦める */ } }
  return null;
};

for (let round = 1; round <= rounds; round++) {
  const prompt = round === 1 ? `${rules}\n\n## いまの盤\n\n${boardText(applyHypothesis({}).board)}\n\n（実行者の欄は空です。まず1回目の仮説を出してください。）`
    : `${rules}\n\n## これまでの経過\n\n${history.join('\n\n')}\n\n上の矛盾文を手掛かりに、次の仮説を出してください。矛盾を指摘されなかった欄は正しいので動かさないこと。`;
  let result;
  try { result = await callCodex(prompt); } catch (error) { log.rounds.push({ round, error:String(error) }); break; }
  const hypothesis = parseHypothesis(result.reply);
  if (!hypothesis) { log.rounds.push({ round, error:'JSONを取り出せない', reply:result.reply.slice(-800) }); break; }
  const { board, errors } = applyHypothesis(hypothesis);
  const verdict = judge(board);
  const cheated = /temariuta-board|boardSolution|kaeriuta\/src/.test(result.stdout);
  log.rounds.push({
    round, hypothesis, placementErrors:errors, truthAccuracy:verdict.truthAccuracy,
    notice:verdict.notice, cheatSuspicion:cheated, reply:result.reply.slice(-1200),
  });
  history.push(`### ${round}回目の仮説\n${boardText(board)}\n\n**確定の結果**\n${verdict.notice}`);
  console.log(`[${model}/${effort}] ${round}回目: 正確さ ${verdict.truthAccuracy}/6${cheated ? '（要監査）' : ''}`);
  if (verdict.truthAccuracy === 6) { log.solved = true; log.solvedAtRound = round; break; }
}

log.finishedAt = new Date().toISOString();
writeFileSync(path.join(outDir, `${model}-${effort}.json`), JSON.stringify(log, null, 1));
rmSync(sandbox, { recursive:true, force:true });
console.log(`[${model}/${effort}] ${log.solved ? `解けた（確定${log.solvedAtRound}回）` : '解けなかった'}`);
