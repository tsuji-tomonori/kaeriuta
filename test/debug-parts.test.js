import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../debug-parts.html', import.meta.url), 'utf8');

test('特殊パート単体検証は反論と手毬唄ボードへ実在する引数を渡す', () => {
  assert.match(html, /name==='rebuttal'\?\{id:'rebuttal_ch2'\}/);
  assert.match(html, /name==='temariBoard'\?boardArgs/);
  assert.match(html, /node\.part==='temariBoard'/);
});
