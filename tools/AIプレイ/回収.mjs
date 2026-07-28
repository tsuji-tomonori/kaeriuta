import { mkdir, readFile, writeFile } from 'node:fs/promises';

const [persona] = process.argv.slice(2);
if (!persona) throw new Error('ペルソナIDを指定してください');
const input = [];
for await (const chunk of process.stdin) {
  input.push(chunk);
}
const html = Buffer.concat(input).toString('utf8');
const chunks = [...html.matchAll(/data-ai-chunk="(\d+)"[^>]*>([^<]*)<\/script>/g)]
  .map((m) => [Number(m[1]), m[2]]).sort((a, b) => a[0] - b[0]).map(([, value]) => value).join('');
if (!chunks) throw new Error('AIプレイ結果がDOMから回収できませんでした');
const data = JSON.parse(Buffer.from(chunks, 'base64').toString('utf8'));
await mkdir(new URL('./ログ/', import.meta.url), { recursive: true });
const line = (value) => String(value ?? '').replace(/\n/g, '  \n');
let md = `# ${data.persona.name}\n\n${data.persona.description}\n\n`;
for (const entry of data.transcript) {
  md += `## ${entry.step}. ${entry.chapter || entry.sceneId || '場面'} — ${entry.kind}\n\n`;
  if (entry.speaker) md += `**${entry.speaker}**  \n`;
  if (entry.text) md += `${line(entry.text)}\n\n`;
  if (entry.choices?.length) md += `提示: ${entry.choices.map(x => `${x.index}. ${x.label}`).join(' / ')}\n\n`;
  if (entry.part) md += `特殊パート: ${entry.part.name}／${entry.part.title}${entry.part.nodeClaim ? `  \n主張: ${entry.part.nodeClaim}` : ''}\n\n`;
}
md += `# 決定\n\n${data.decisions.map(d => `- step ${d.step}: **${d.selected}** — ${d.reason}`).join('\n')}\n\n`;
const diagnosis = data.diagnosis || {};
const rate = Number(diagnosis.fallbackRate || 0);
md += `# 判断品質の自己診断\n\n- 総選択回数: ${diagnosis.totalSelections ?? 0}\n- 明確な根拠で選べた回数: ${diagnosis.groundedSelections ?? 0}\n- 差がつかず既定動作に落ちた回数: ${diagnosis.fallbackSelections ?? 0}（${(rate * 100).toFixed(1)}%）\n- 差がつかなかった選択肢の文言: ${(diagnosis.ambiguousLabels || []).join(' / ') || 'なし'}\n\n`;
md += `# パラメータ・フラグの節目\n\n${data.checkpoints.map(c => `- step ${c.step} (${c.sceneId}): ${JSON.stringify(c.params)}`).join('\n')}\n\n`;
const analysis = data.analysis || {};
md += `# データに基づく振り返り\n\n`;
md += `## 大きなパラメータ変動\n\n${(analysis.parameterMoves || []).map(({ key, moves }) => `- ${key}: ${moves?.length ? moves.map(m => `${m.delta > 0 ? '+' : ''}${m.delta}（step ${m.step}、直前本文: ${line((m.before || '').slice(0, 80))}）`).join(' / ') : '途中観測では変動なし・または未取得'}`).join('\n')}\n\n`;
const decisionFact = (label, decision) => decision ? `- ${label}: ${decision.selected}（得点差 ${decision.diagnostic?.margin ?? '未取得'}）` : `- ${label}: 該当なし`;
md += `## 得点差\n\n${decisionFact('最も大きい選択', analysis.widest)}\n${decisionFact('最も僅差の選択', analysis.narrowest)}\n\n`;
md += `## 取り逃した情報\n\n${(analysis.missedInformation || []).map(x => `- ${x}`).join('\n') || '- 観測できた自由行動ではなし'}\n\n`;
md += `## 特殊パートの成績\n\n- 反論の確信度推移: ${(analysis.rebuttal?.convictionTrend || []).join(' → ') || '未取得'}\n- 共同推理: 崩したノード ${analysis.joint?.broken ?? 0}、失敗・未完了 ${analysis.joint?.failures ?? 0}、手段 ${(analysis.joint?.methods || []).join(' / ') || 'なし'}\n\n`;
md += `## END条件の未達\n\n- 到達END: ${data.final?.endingId || '未確定'}\n- 条件データはゲーム本体から公開されないため、実プレイDOMで確認できる未達条件は特定不能（最終パラメータ・フラグ・選択ログを併記）。\n\n`;
md += `# 結果\n\n- 状態: ${data.status}\n- END: ${data.final.endingId}\n- 所要ステップ数: ${data.final.steps}\n- 最終画面: ${JSON.stringify(data.final.lastScreen ?? null)}\n`;
md += `- 手毬唄ボード: ${JSON.stringify(data.final.temari ?? null)}\n`;
md += `- 警告: ${(data.warnings || []).join(' / ') || 'なし'}\n`;
md += `\n# 振り返り\n\n${line(data.reflection || '振り返りは取得できませんでした。')}\n`;
await writeFile(new URL(`./ログ/${persona}.md`, import.meta.url), md);
const summaryUrl = new URL('./ログ/サマリ.json', import.meta.url);
let summary = {}; try { summary = JSON.parse(await readFile(summaryUrl, 'utf8')); } catch { /* first run */ }
summary[persona] = { persona: data.persona, status: data.status, final: data.final, errors: data.errors, warnings:data.warnings || [], transcriptSteps: data.transcript.length, decisions: data.decisions.length, diagnosis: data.diagnosis, analysis: data.analysis, reflection: data.reflection };
await writeFile(summaryUrl, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`ログを書き出しました: tools/AIプレイ/ログ/${persona}.md`);
