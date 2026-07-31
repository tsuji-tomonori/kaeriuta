import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { scenes } from '../src/data/scenario/index.js';
import { items } from '../src/data/items.js';
import { rebuttalCh2 } from '../src/data/parts/rebuttal-ch2.js';
import { rebuttalCh4a } from '../src/data/parts/rebuttal-ch4a.js';
import { rebuttalB3 } from '../src/data/parts/rebuttal-b3.js';
import { inferenceFinal } from '../src/data/parts/inference-final.js';
import { enrichFreeActions } from '../src/systems/freeaction/index.js';
import { exposureCostLabels, exposureEffectsFor } from '../src/systems/exposure.js';

function collectObtainable() {
  const obtainable = new Set();
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    if ((value.t === 'item' || value.t === 'flag') && value.id) obtainable.add(value.id);
    for (const child of Object.values(value)) visit(child);
  };
  Object.values(scenes).forEach(visit);
  for (const scene of Object.values(scenes)) {
    for (const call of scene.nodes.filter((node) => node.t === 'call' && node.part === 'freeAction')) {
      enrichFreeActions(call.args.actions).forEach(visit);
    }
  }
  return obtainable;
}

test('反論で要求する札は、要求される章までに取得経路を持つ', () => {
  const obtainable = collectObtainable();
  for (const part of [rebuttalCh2, rebuttalCh4a, rebuttalB3]) {
    for (const node of part.nodes) {
      for (const response of node.responses.filter((entry) => entry.card)) {
        assert.ok(obtainable.has(response.card), `${part.id}/${node.id}: ${response.card}`);
      }
    }
  }
});

test('共同推理の各証拠群は、少なくとも一つ取得経路を持つ', () => {
  const obtainable = collectObtainable();
  for (const node of inferenceFinal.phases.flatMap((phase) => phase.nodes)) {
    for (const group of node.requirements) {
      assert.ok(group.some((id) => obtainable.has(id)), `${node.id}: ${group.join(' / ')}`);
    }
  }
});

test('露見すると表示する札は、実際の効果とログを持つ', () => {
  for (const item of Object.values(items).filter((entry) => entry.exposure)) {
    assert.ok(item.exposureEffects?.length, `${item.id}: exposureEffects`);
    const effects = exposureEffectsFor(item.id);
    assert.ok(effects.some((effect) => effect.t === 'param'), `${item.id}: param effect`);
    assert.ok(effects.some((effect) => effect.t === 'log' && effect.key === `exposure_${item.id}`), `${item.id}: log`);
    assert.ok(exposureCostLabels(item.id).some((label) => /露見時：.+ [+-]\d+/.test(label)), `${item.id}: visible cost`);
  }
});

test('固定8秒のブート待機を残さない', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /setTimeout\([^)]*boot-loader[^)]*8000|8000[^<]*boot-loader/s);
});
