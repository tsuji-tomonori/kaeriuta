import { writeFile } from 'node:fs/promises';
import { chapter1 } from '../src/data/scenario/chapter1.js';
import { chapter2 } from '../src/data/scenario/chapter2.js';
import { enrichFreeActions, focusPreview } from '../src/systems/freeaction/index.js';

const lines = ['# 自由行動の表示本文・全24通り', '', '生成: `node tools/自由行動本文一覧.mjs`。導入は注目先画面、発見・余韻は結果画面に表示。', ''];
let count = 0;
for (const [day, chapter] of [chapter1, chapter2].entries()) {
  const actions = enrichFreeActions(chapter.nodes.find(n => n.part === 'freeAction').args.actions);
  for (const action of actions) for (const focus of action.scenes.focus.options) {
    lines.push(`## ${++count}. 第${day + 1}章 ${action.label}／${focus.label}`, '', `報酬・追加変化：${focusPreview(action, focus)}`, '', '### 導入', '', action.scenes.intro, '', '### 選んだ発見', '', focus.text, '', '### 余韻', '', action.scenes.reaction, '');
  }
}
await writeFile(new URL('../docs/自由行動-本文一覧.md', import.meta.url), lines.join('\n'));
console.log(`自由行動本文一覧: ${count}通り`);
