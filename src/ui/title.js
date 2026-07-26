export const EXPLORATION_HINTS_KEY = 'kaeriuta-exploration-hints';
export function explorationHintsEnabled(storage = globalThis.localStorage) {
  return storage?.getItem(EXPLORATION_HINTS_KEY) === 'on';
}
export function toggleExplorationHints(storage = globalThis.localStorage) {
  const enabled = !explorationHintsEnabled(storage);
  storage?.setItem(EXPLORATION_HINTS_KEY, enabled ? 'on' : 'off');
  return enabled;
}

export function showTitle(root, { onStart, onLoad }) {
  const hintEnabled = explorationHintsEnabled();
  root.innerHTML = `<div class="title-screen"><h1>帰り唄 <small>―手毬唄の館―</small></h1><p>倒叙ミステリーアドベンチャー　α版</p><div class="title-actions"><button data-start>はじめから</button><button data-load="1">セーブ1をロード</button><button data-load="2">セーブ2をロード</button><button data-load="3">セーブ3をロード</button><button data-load="auto">オートセーブをロード</button></div><details class="title-settings"><summary>プレイ設定</summary><button data-exploration-hints>自由探索の事前ヒント：${hintEnabled ? '表示する' : '表示しない'}</button><small>表示すると、行動を選ぶ前に情報の系統と所持数が分かります。</small></details></div>`;
  root.querySelector('[data-start]').onclick = onStart;
  root.querySelectorAll('[data-load]').forEach((b) => { b.onclick = () => onLoad(b.dataset.load); });
  root.querySelector('[data-exploration-hints]').onclick = (event) => {
    const enabled = toggleExplorationHints();
    event.currentTarget.textContent = `自由探索の事前ヒント：${enabled ? '表示する' : '表示しない'}`;
  };
}
