export function showTitle(root, { onStart, onLoad }) {
  root.innerHTML = `<div class="title-screen"><h1>帰り唄 <small>―手毬唄の館―</small></h1><p>倒叙ミステリーアドベンチャー　α版</p><div class="title-actions"><button data-start>はじめから</button><button data-load="1">セーブ1をロード</button><button data-load="2">セーブ2をロード</button><button data-load="3">セーブ3をロード</button><button data-load="auto">オートセーブをロード</button></div></div>`;
  root.querySelector('[data-start]').onclick = onStart;
  root.querySelectorAll('[data-load]').forEach((b) => { b.onclick = () => onLoad(b.dataset.load); });
}
