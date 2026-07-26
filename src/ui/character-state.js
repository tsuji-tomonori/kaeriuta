/**
 * 立ち絵レイヤーの表示状態。位置をキーにすることで、同じ位置に
 * 複数の人物が残ることを構造上防ぐ。
 */
export function transitionCharacterPositions(positions, command) {
  const next = { ...positions };
  const { id, expr, pos, action = 'replace' } = command;
  if (action === 'fadeOut') {
    delete next[pos];
    return next;
  }
  next[pos] = { id, expr, action };
  return next;
}
