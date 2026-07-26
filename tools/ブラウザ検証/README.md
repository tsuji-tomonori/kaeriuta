# ブラウザ検証

`index.html` から検証用の `harness.html` を生成し、`file://` でゲームを自動操作します。実行ごとに `window.onerror`、未処理 Promise rejection、`console.error`、進行停止、主要UIの機械的オーバーフローを結果DOMへ記録します。

通常実行では、状態シグネチャ（本文・選択肢・シーン・特殊パート）が40回連続で変わらない場合を `stalled` とします。10分の仮想時間上限は安全弁のみです。結果JSONの `lastScreen`、`visitedScenes`、`partsEntered` を見れば停止箇所と特殊パートの完了状況を確認できます。

```sh
tools/ブラウザ検証/実行.sh
```

シナリオデータだけをたどる代表経路の検査は、`tools/到達可能性検査.mjs` です。これは特殊パートを実行せず、必要フラグも注入する到達可能性検査であり、実プレイではありません。AIによる実ブラウザプレイと本文ログは `tools/AIプレイ/実行.sh all` を使います（[設計](../../docs/AIプレイ設計.md)）。

単独で画面を確認するときは、生成後に以下の `mode` を指定します。`title`、`conversation`、`choice`、`rebuttal`、`inference` が使えます。

```sh
google-chrome --headless=new --no-sandbox --disable-gpu --allow-file-access-from-files \
  --window-size=1280,720 --virtual-time-budget=600000 --screenshot=/tmp/kaeriuta.png \
  'file:///home/t-tsuji/project/kaeriuta/tools/ブラウザ検証/harness.html?route=confession&mode=inference' 2>/dev/null
```
