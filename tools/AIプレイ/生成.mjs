import { readFile, writeFile } from 'node:fs/promises';

const source = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
const injected = source
  .replace('<head>', '<head>\n  <base href="../../">')
  .replace('</body>', '  <p id="ai-play-launch-status">自動プレイはまだ起動していません</p>\n  <script type="module" src="tools/AIプレイ/自動プレイ.js"></script>\n</body>');

await writeFile(new URL('./harness.html', import.meta.url), injected);
console.log('tools/AIプレイ/harness.html を生成しました');
