// 第二章だけの観察の使い道。元の札、所持条件、撃破条件には手を入れない。
export function observedResponse(state, partId, nodeId, response) {
  if (partId !== 'day2_inquiry' || state.logs?.detective_watch !== 'active') return response;
  const focus = state.logs?.detective_focus;
  const effects = response.result.effects || [];
  const goro = focus === 'goro' && nodeId === 'n1' && response.kind === 'redirect';
  const conan = focus === 'conan' && response.result.overknow && effects.some(e => e.t === 'param' && e.key === 'suspicion' && e.delta > 0);
  if (!goro && !conan) return response;
  return { ...response, observation: goro ? 'goro' : 'conan', result: { ...response.result,
    effects: goro ? [...effects, {t:'param',key:'conviction',delta:-3}]
      : effects.map(e => e.t === 'param' && e.key === 'suspicion' && e.delta > 0 ? {...e, delta:Math.max(0, e.delta - 3)} : e),
  } };
}
export function observationHint(state, partId, response, broken = []) {
  if (partId !== 'day2_inquiry' || state.logs?.detective_watch !== 'active') return '';
  const focus = state.logs?.detective_focus;
  if (response.observation === 'goro') return '観察で知った悟郎の手順：運び手を先に問えば、確信をさらに3下げられる。';
  if (focus === 'goro' && response.result.conditional?.ifBroken) {
    return broken.includes(response.result.conditional.ifBroken)
      ? '観察で知った悟郎の手順：運び手の推理は崩した。ここは黙っても確信が増さない。'
      : '観察で知った悟郎の手順：運び手の推理が残っている。ここで黙ると確信が増す。';
  }
  if (focus === 'conan' && (response.result.overknow || response.result.effects?.some(e => e.t === 'param' && e.key === 'overknow' && e.delta > 0))) {
    return '観察で知ったコウ君の読み方：言い方を整え、疑惑の増加を3抑える。それでも手口を知りすぎていることは隠せない。';
  }
  return '';
}
