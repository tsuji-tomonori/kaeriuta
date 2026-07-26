/** 通常の文章を送る場面だけに「次へ」を表示する。 */
export function shouldShowAdvance({ nodeType, choicesActive = false, partActive = false, ending = false }) {
  if (choicesActive || partActive || ending) return false;
  return ['say', 'mono', 'stage'].includes(nodeType);
}
