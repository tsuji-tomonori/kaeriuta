/** 三系統の情報フラグを扱う純粋関数。 */
export const FLAG_LINES = ['past', 'plan', 'alive'];

export function createFlagState() { return { past: [], plan: [], alive: [] }; }

export function addFlag(flags, definition) {
  if (!definition || !FLAG_LINES.includes(definition.line)) return flags;
  const next = structuredClone(flags);
  if (!next[definition.line].includes(definition.id)) next[definition.line].push(definition.id);
  return next;
}

export function hasFlag(flags, id, definitions) {
  const definition = definitions[id];
  return Boolean(definition && flags[definition.line]?.includes(id));
}

export function countFlags(flags, line) { return flags[line]?.length ?? 0; }
