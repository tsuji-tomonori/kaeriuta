import { readFile, writeFile } from 'node:fs/promises';

const source = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
const injected = source
  .replace('<head>', '<head>\n  <base href="../../">')
  .replace('</body>', '  <script type="module" src="tools/ブラウザ検証/自動操作.js"></script>\n</body>');

await writeFile(new URL('./harness.html', import.meta.url), injected);
console.log('tools/ブラウザ検証/harness.html を生成しました');
