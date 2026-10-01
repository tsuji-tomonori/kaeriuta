import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { playPersona } from './Node踏破検査.mjs';
import { personas } from './ペルソナ/index.js';
import { createPacingObserver, pacingRanges } from './lib/テンポ計測.js';

export async function measurePacing() {
  const results = {};
  for (const persona of Object.values(personas)) {
    const observer = createPacingObserver();
    const play = await playPersona(persona, { onNode:observer.observe });
    results[persona.id] = { ending:play.ending, warnings:play.warnings, ranges:observer.result() };
  }
  return { scope:'11 Node persona paths; not exhaustive reachable states or human/browser timing', charactersPerMinute:653, diagnosticCharactersPerMinute:300, results };
}
export function pacingReport(report) {
  const lines = ['# 意味ある行動間隔の計測', '',
    '実シナリオと11ペルソナのNode経路を計測した診断値。人間の読了時間、実ブラウザの待ち時間、全ての到達可能状態の最短・最長ではない。表示本文は say / mono / stage を各実行1回だけ数え、stage の表示用括弧を含める。話者名・章題・選択肢の読了時間は含めない。次の操作が選択可能になった時点で区間を閉じる。', '',
    '推定秒 = 表示文字数 ÷ 653 × 60 + 強制待機秒。300字/分は低速読者向け診断。作品固有の時間ゲートだけを表示し、判断材料の質や完全初心者の理解を合格扱いにしない。', '',
    '| ペルソナ | END | 区間 | 文字数 | 本文ノード | 推定秒 | 300字/分の秒 | 時間ゲート |',
    '| --- | --- | --- | ---: | ---: | ---: | ---: | --- |'];
  for (const [id, result] of Object.entries(report.results)) for (const r of result.ranges) lines.push(`| ${id} | ${result.ending} | #${r.range.issue} | ${r.characters} | ${r.nodes.length} | ${r.estimatedSeconds.toFixed(1)} | ${r.slowReaderSeconds.toFixed(1)} | ${r.timeGate} |`);
  lines.push('', '## 計測した経路の範囲', '');
  for (const range of pacingRanges) {
    const values = Object.values(report.results).map(r => r.ranges.find(x => x.range.id === range.id));
    lines.push(`- #${range.issue} ${range.name}: ${Math.min(...values.map(v=>v.characters))}〜${Math.max(...values.map(v=>v.characters))}字、${Math.min(...values.map(v=>v.estimatedSeconds)).toFixed(1)}〜${Math.max(...values.map(v=>v.estimatedSeconds)).toFixed(1)}秒。時間ゲートの合格上限 ${range.passSeconds}秒`);
  }
  lines.push('', '## 未完了の受入条件', '',
    '- 出来事境界は背景変更・章題の候補位置だけをJSONへ記録。意味が変わるか、80秒以内かの判定は未実施',
    '- 判断材料の LEFT / RIGHT / EVIDENCE / STAKE 分類、80%以上の一致、3〜5チャンクへの外部化は未評価',
    '- 直前約435字の根拠再提示、独立した初心者5体の理解、低速読者の疲労は未評価',
    '- 11ペルソナ以外の条件組合せ、全到達可能状態での最大値、実ブラウザ11体完走は別途検証が必要',
    '- 本ツールは本文やゲーム状態の遷移を変更しない。Issue #15 / #16 の完了を主張しない');
  return lines.join('\n') + '\n';
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await measurePacing();
  const jsonIndex = process.argv.indexOf('--json');
  if (jsonIndex >= 0) {
    const target = process.argv[jsonIndex + 1];
    if (!target || target.startsWith('--')) throw new Error('--json の保存先が必要です');
    await writeFile(target, JSON.stringify(report,null,2) + '\n');
  }
  console.log(pacingReport(report));
}
