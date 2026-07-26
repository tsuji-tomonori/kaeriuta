import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { prologue } from '../src/data/scenario/prologue.js';
import { chapter1 } from '../src/data/scenario/chapter1.js';
import { chapter2 } from '../src/data/scenario/chapter2.js';
import { chapter3 } from '../src/data/scenario/chapter3.js';
import { chapter4a } from '../src/data/scenario/chapter4a.js';
import { chapter4b } from '../src/data/scenario/chapter4b.js';
import { endings } from '../src/data/scenario/endings.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(resolve(root, 'assets/manifest.json'), 'utf8'));
const assetIds = new Set(manifest.assets.map((asset) => asset.id));
const mainScenes = [prologue, chapter1, chapter2, chapter3, chapter4a, chapter4b];
const scenes = [...mainScenes, ...Object.values(endings)];

function collectNodes(value, result = []) {
  if (Array.isArray(value)) {
    for (const entry of value) collectNodes(entry, result);
  } else if (value && typeof value === 'object') {
    if (typeof value.t === 'string') result.push(value);
    for (const child of Object.values(value)) collectNodes(child, result);
  }
  return result;
}

test('本編の立ち絵はmanifestに登録された実在IDだけを使う', () => {
  const charaNodes = scenes.flatMap((scene) => collectNodes(scene.nodes).filter((node) => node.t === 'chara'));
  assert.ok(charaNodes.length >= 120, `立ち絵が不足: ${charaNodes.length}`);
  for (const node of charaNodes) {
    const assetId = `${node.id}_${node.expr}`;
    assert.ok(assetIds.has(assetId), `${sceneLabel(node)}: manifest未登録 ${assetId}`);
  }
});

function countExpressions() {
  const result = new Map();
  for (const node of scenes.flatMap((scene) => collectNodes(scene.nodes).filter((entry) => entry.t === 'chara'))) {
    if (!result.has(node.id)) result.set(node.id, new Map());
    const counts = result.get(node.id);
    counts.set(node.expr, (counts.get(node.expr) ?? 0) + 1);
  }
  return result;
}

test('複数表情を持つ人物は平常表情が単独で最頻になる', () => {
  const defaultExpressions = new Map([
    ['chara_goko', 'normal'],
    ['chara_fujino', 'normal'],
    ['chara_saeki', 'normal'],
    ['chara_makabe', 'normal'],
    ['chara_sogen', 'smile'],
    ['chara_uno', 'normal'],
    ['chara_detective', 'normal'],
    ['chara_companion', 'normal'],
    ['chara_observer', 'normal'],
    ['chara_shiori', 'normal'],
  ]);
  const expressions = countExpressions();
  for (const [characterId, defaultExpression] of defaultExpressions) {
    const counts = expressions.get(characterId);
    assert.ok(counts, `${characterId} の立ち絵がない`);
    const defaultCount = counts.get(defaultExpression) ?? 0;
    const strongestAlternative = Math.max(
      0,
      ...[...counts].filter(([expression]) => expression !== defaultExpression).map(([, count]) => count),
    );
    assert.ok(
      defaultCount > strongestAlternative,
      `${characterId}: ${defaultExpression}=${defaultCount}, 他表情の最大=${strongestAlternative}`,
    );
  }
});

test('強い表情は人物ごとの登場回数の30%を超えない', () => {
  const strongExpressions = new Map([
    ['chara_goko', 'angry'],
    ['chara_fujino', 'sad'],
    ['chara_observer', 'serious'],
  ]);
  const expressions = countExpressions();
  for (const [characterId, strongExpression] of strongExpressions) {
    const counts = expressions.get(characterId);
    const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
    const strongCount = counts.get(strongExpression) ?? 0;
    assert.ok(
      strongCount / total <= 0.3,
      `${characterId}:${strongExpression} が ${strongCount}/${total} (${(strongCount / total * 100).toFixed(1)}%)`,
    );
  }
});

test('本編の立ち絵は有効な位置とアクションだけを使う', () => {
  const positions = new Set(['left', 'center', 'right']);
  const actions = new Set(['fadeIn', 'replace', 'fadeOut']);
  for (const node of scenes.flatMap((scene) => collectNodes(scene.nodes).filter((entry) => entry.t === 'chara'))) {
    assert.ok(positions.has(node.pos), `${sceneLabel(node)}: 不正なpos ${node.pos}`);
    assert.ok(actions.has(node.action), `${sceneLabel(node)}: 不正なaction ${node.action}`);
  }
});

test('本編の各シナリオファイルに立ち絵演出がある', () => {
  for (const scene of scenes) {
    const count = collectNodes(scene.nodes).filter((node) => node.t === 'chara').length;
    assert.ok(count > 0, `${scene.id} に立ち絵がない`);
  }
});

const speakerCharacter = {
  sogen: 'chara_sogen',
  goko: 'chara_goko',
  fujino: 'chara_fujino',
  saeki: 'chara_saeki',
  makabe: 'chara_makabe',
  onda: 'chara_onda',
  uno: 'chara_uno',
  housekeeper: 'chara_housekeeper',
  toyo: 'chara_toyo',
  kogoro: 'chara_detective',
  ran: 'chara_companion',
  conan: 'chara_observer',
};

function inspectSpeakerCoverage(nodes, initialSeen = new Set()) {
  let seen = new Set(initialSeen);
  const result = { total: 0, missing: [] };
  for (const node of nodes) {
    if (node.t === 'bg') seen = new Set();
    if (node.t === 'chara' && node.action !== 'fadeOut') seen.add(node.id);
    const expected = node.t === 'say' ? speakerCharacter[node.who] : null;
    if (expected) {
      result.total += 1;
      if (!seen.has(expected)) result.missing.push(`${node.who}: ${String(node.text).slice(0, 24)}`);
    }
    if (node.t === 'if') {
      for (const branch of [node.then ?? [], node.else ?? []]) {
        const branchResult = inspectSpeakerCoverage(branch, seen);
        result.total += branchResult.total;
        result.missing.push(...branchResult.missing);
      }
    }
  }
  return result;
}

test('話者の90%以上は直近の背景以降に立ち絵で一度は示される', () => {
  const results = mainScenes.map((scene) => ({ sceneId: scene.id, ...inspectSpeakerCoverage(scene.nodes) }));
  const total = results.reduce((sum, result) => sum + result.total, 0);
  const missing = results.flatMap((result) => result.missing.map((line) => `${result.sceneId}: ${line}`));
  assert.ok(missing.length / total <= 0.1, `未登場話者 ${missing.length}/${total}\n${missing.join('\n')}`);
});

function sceneLabel(node) {
  return `${node.id ?? 'unknown'}/${node.expr ?? 'unknown'}`;
}
