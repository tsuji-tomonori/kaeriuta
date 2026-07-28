import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const personas = ['suiri', 'bannin', 'kanjou', 'sokkyou', 'ura', 'toubou', 'ayatsuri', 'gyakuten', 'mikiri', 'shoshinsha', 'danzai'];
const metrics = [
  { name:'見せる盤の説得力', key:'showCredibility' },
  { name:'まことの盤の正確さ', key:'truthAccuracy' },
];
const summary = JSON.parse(await readFile(new URL('./ログ/サマリ.json', import.meta.url), 'utf8'));

for (const metric of metrics) {
  const values = personas.map((persona) => {
    const value = summary[persona]?.final?.temari?.[metric.key];
    assert.ok(Number.isInteger(value), `${persona}: ${metric.name}を観測できない`);
    return [persona, value];
  });
  const distinct = new Set(values.map(([, value]) => value));
  assert.ok(distinct.size >= 2, `${metric.name}が全ペルソナで${values[0][1]}のまま不変`);
  console.log(`${metric.name}: ${distinct.size}種類（${values.map(([persona, value]) => `${persona}=${value}`).join(' ')}）`);
}
