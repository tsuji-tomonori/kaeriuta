import test from 'node:test';
import assert from 'node:assert/strict';
import { missingEvidenceHint, canBreak } from '../src/systems/inference/index.js';

test('取得済みの署名を不足扱いせず、開き直りと宇野の協力を案内する', () => {
  const node = { id: 'n10', requirements: [['acrostic', 'acrostic_card']] };
  const cards = ['acrostic_card'];
  assert.equal(canBreak(node, cards, true, false), false);
  assert.match(missingEvidenceHint(node, cards, true, false), /手持ちの証拠.*宇野/);
  assert.equal(missingEvidenceHint(node, cards, true, true), '');
  assert.match(missingEvidenceHint(node, [], true, false), /署名がない/);
});

test('前半の開き直りには宇野で解けると誤案内せず、別の方法を案内する', () => {
  const node = { id: 'n5', requirements: [['lattice_shadow'], ['temariuta_murder_page']] };
  const cards = ['lattice_shadow', 'temariuta_murder_page'];
  assert.equal(canBreak(node, cards, true, true), false);
  assert.match(missingEvidenceHint(node, cards, true, true), /栞の提示だけでは崩せません/);
  assert.match(missingEvidenceHint(node, cards, true, true), /律の遺品/);
});
