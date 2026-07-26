/** パラメータの範囲と初期値。値はすべて整数に丸める。 */
export const PARAMS = {
  suspicion: { initial: 10, min: 0, max: 100 },
  conviction: { initial: 50, min: 0, max: 100 },
  awareness: { initial: 0, min: 0, max: 100 },
  conscience: { initial: 0, min: -10, max: 10 },
  narrator: { initial: 0, min: -10, max: 10 },
  agitation: { initial: 0, min: 0, max: 100 },
  trust: { initial: 0, min: 0, max: 100 },
  overknow: { initial: 0, min: 0, max: 10 },
};

export function createParams() { return Object.fromEntries(Object.entries(PARAMS).map(([k, v]) => [k, v.initial])); }
export function changeParam(params, key, delta) {
  if (!PARAMS[key]) return params;
  const next = { ...params };
  next[key] = Math.max(PARAMS[key].min, Math.min(PARAMS[key].max, Math.round(next[key] + delta)));
  return next;
}
