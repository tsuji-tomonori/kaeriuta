import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { prologue } from '../src/data/scenario/prologue.js';
import { INTRO_GUIDE, PLAY_GUIDE } from '../src/ui/play-guide.js';

function walk(nodes) {
  return nodes.flatMap((node) => [node, ...walk(node.then || []), ...walk(node.else || [])]);
}
const prose = walk(prologue.nodes).filter((node) => ['say', 'mono', 'stage'].includes(node.t));

test('序章の全本文は分岐内も215字以内で、先頭・末尾に改行を置かない', () => {
  for (const node of prose) {
    assert.ok([...node.text].length <= 215, `${node.t}: ${[...node.text].length}字: ${node.text.slice(0, 30)}`);
    assert.doesNotMatch(node.text, /^[\r\n]|[\r\n]$/);
  }
});

test('序章の選択肢・効果・遷移・ログ等は本文改訂前の契約を保つ', () => {
  // 02A開始時の宣言データから、本文textだけを除いたスナップショット。
  const contract = JSON.stringify(prologue, (key, value) => key === 'text' ? undefined : value);
  assert.equal(createHash('sha256').update(contract).digest('hex'), 'b62c4ae43e7903439a01556a39c00d370237320a578b0f0bc1fa43df612808ae');
});

test('序章は共犯関係・栞の役・恩田の標的指定をそれぞれ場面で一度伝える', () => {
  const text = prose.map((node) => node.text).join('\n');
  for (const fact of ['交換殺人', '共犯者', '二日目の夜', '標的']) {
    assert.equal(text.split(fact).length - 1, 1, fact);
  }
  assert.match(text, /恩田さんは膝の上の『手毬唄殺し』の初版本を開いた/);
  assert.doesNotMatch(text, /『冬の灯』/);
  assert.doesNotMatch(text, /疑惑|確信|知りすぎ/);
});

test('序章の書物関連語は改訂前35回から3割以上減らす', () => {
  // 全say/mono/stage（両分岐を含む）の語の出現数。実物の本も含む代理指標。
  // 人名の栞、「本当」の本は比喩でないため除外。
  const terms = /頁|本(?!当)|綴じ|貸出|返却|閉架|余白|司書|原稿|印刷|訂正印/g;
  const count = prose.reduce((sum, node) => sum + (node.text.match(terms) || []).length, 0);
  assert.ok(count <= 35 * 0.7, `${count}回`);
});

test('導入は入口と最小操作に絞り、遊び方に全パラメータの意味を置く', () => {
  assert.doesNotMatch(INTRO_GUIDE, /共犯|交換殺人|復讐|佐伯|恩田/);
  for (const term of ['クリック／タップ', 'Space／Enter', '選択肢', '遊び方']) assert.ok(INTRO_GUIDE.includes(term));
  for (const term of ['疑惑', '確信', '知りすぎ', '良心', '警戒', '信頼', '動揺']) assert.ok(PLAY_GUIDE.includes(`${term}：`));
  assert.match(PLAY_GUIDE, /現在は選択肢や結末を直接変えません/);
  assert.match(PLAY_GUIDE, /開き直り/);
});
