import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { endings } from '../src/data/scenario/endings.js';
import { endingsMeta } from '../src/data/endings-meta.js';

const manifest = JSON.parse(
  fs.readFileSync(new URL('../assets/manifest.json', import.meta.url), 'utf8')
);
const backgroundIds = new Set(
  manifest.assets.filter(asset => asset.kind === 'bg').map(asset => asset.id)
);

function walk(nodes, visit) {
  for (const node of nodes) {
    visit(node);
    if (node.t === 'if') {
      walk(node.then || [], visit);
      walk(node.else || [], visit);
    }
  }
}

function nodesOfType(scene, type) {
  const found = [];
  walk(scene.nodes, node => {
    if (node.t === type) found.push(node);
  });
  return found;
}

test('endingsMeta の7件は実際の endingId と一致する', () => {
  assert.equal(endingsMeta.length, 7);
  assert.deepEqual(endingsMeta.map(meta => meta.order), [1, 2, 3, 4, 5, 6, 7]);

  const actual = new Map();
  for (const [sceneId, scene] of Object.entries(endings)) {
    const endNodes = nodesOfType(scene, 'end');
    assert.equal(endNodes.length, 1, `${sceneId} の end ノード数`);
    actual.set(sceneId, endNodes[0].endingId);
  }

  assert.deepEqual(
    endingsMeta.map(meta => [meta.sceneId, meta.id]),
    [...actual.entries()]
  );
});

test('全ENDの背景は manifest に存在する背景IDである', () => {
  for (const meta of endingsMeta) {
    const scene = endings[meta.sceneId];
    const backgrounds = nodesOfType(scene, 'bg');
    assert.equal(backgrounds.length, 1, `${meta.sceneId} の背景数`);
    assert.ok(backgroundIds.has(backgrounds[0].id), `${backgrounds[0].id} が manifest にない`);
    assert.equal(backgrounds[0].id, meta.bg, `${meta.sceneId} とメタデータの背景が不一致`);
  }
});

test('全ENDに立ち絵があり、指定された表情ファイルが実在する', () => {
  for (const [sceneId, scene] of Object.entries(endings)) {
    const characterNodes = nodesOfType(scene, 'chara');
    assert.ok(characterNodes.length >= 1, `${sceneId} に立ち絵がない`);
    for (const node of characterNodes) {
      const filename = `${node.id}_${node.expr}.png`;
      const path = fileURLToPath(new URL(`../assets/chara/${filename}`, import.meta.url));
      assert.ok(fs.existsSync(path), `${sceneId}: ${filename} が実在しない`);
      assert.ok(['left', 'center', 'right'].includes(node.pos), `${sceneId}: pos が不正`);
      assert.ok(['fadeIn', 'replace', 'fadeOut'].includes(node.action), `${sceneId}: action が不正`);
    }
  }
});
