import { items } from '../data/items.js';

export function exposureMeta(cardId) {
  return items[cardId] || items[`${cardId}_card`] || null;
}

export function exposureEffectsFor(cardId) {
  const meta = exposureMeta(cardId);
  if (!meta?.exposure) return [];
  return [
    ...(meta.exposureEffects || []).map((effect) => ({ ...effect })),
    { t:'log', key:`exposure_${meta.id}`, value:true },
  ];
}

const parameterNames = {
  suspicion: '疑い',
  awareness: '注視',
  conscience: '良心',
  trust: '信頼',
  overknow: '知りすぎ',
};

export function exposureCostLabels(cardId) {
  return exposureEffectsFor(cardId)
    .filter((effect) => effect.t === 'param' && Number.isFinite(effect.delta))
    .map((effect) => `露見時：${parameterNames[effect.key] ?? effect.key} ${effect.delta > 0 ? '+' : ''}${effect.delta}`);
}

export function evidenceUsedFor(node, cards = []) {
  return (node?.requirements || []).map((group) => {
    const held = group.filter((id) => cards.includes(id));
    return held.find((id) => exposureMeta(id)?.exposure) || held[0];
  }).filter(Boolean);
}
