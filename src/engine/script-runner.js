import { addFlag, countFlags, hasFlag } from './flags.js';
import { changeParam } from './params.js';

export function evaluateCondition(cond, state, definitions) {
  if (!cond) return true;
  if (cond.flag) return hasFlag(state.flags, cond.flag, definitions);
  if (cond.item) return state.items.includes(cond.item);
  if (cond.param) return compare(state.params[cond.param] ?? 0, cond);
  if (cond.countFlags) return compare(countFlags(state.flags, cond.countFlags), cond);
  if (cond.log) return state.logs[cond.log.key] === cond.log.equals;
  if (cond.and) return cond.and.every((c) => evaluateCondition(c, state, definitions));
  if (cond.or) return cond.or.some((c) => evaluateCondition(c, state, definitions));
  if (cond.not) return !evaluateCondition(cond.not, state, definitions);
  return false;
}
function compare(value, cond) { return (cond.gte === undefined || value >= cond.gte) && (cond.lte === undefined || value <= cond.lte) && (cond.eq === undefined || value === cond.eq); }

export function applyEffect(state, effect, definitions) {
  const next = structuredClone(state);
  if (effect.t === 'flag') next.flags = addFlag(next.flags, definitions[effect.id]);
  if (effect.t === 'item' && !next.items.includes(effect.id)) next.items.push(effect.id);
  if (effect.t === 'param') next.params = changeParam(next.params, effect.key, effect.delta);
  if (effect.t === 'log') next.logs[effect.key] = effect.value;
  return next;
}

export function applyNodeEffect(state, node, definitions) {
  if (['flag', 'item', 'param', 'log'].includes(node.t)) return applyEffect(state, node, definitions);
  return state;
}
