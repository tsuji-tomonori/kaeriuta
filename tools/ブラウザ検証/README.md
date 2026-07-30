# ブラウザ検証

`index.html` から検証用の `harness.html` を生成し、`file://` でゲームを自動操作します。実行ごとに `window.onerror`、未処理 Promise rejection、`console.error`、進行停止、主要UIの機械的オーバーフローを結果DOMへ記録します。

通常実行では、状態シグネチャ（本文・文字送り状態・選択肢・シーン・特殊パート・オーバーレイ）が40回連続で変わらない場合を `stalled` とします。10分の仮想時間上限は安全弁のみです。文字送り中は `.message-window.reveal-complete` が付くまで全文表示を行い、次のティックで先へ送ります。

結果JSONには現在の画面種別を示す `screen` が常に入り、`title`、`conversation`、`revealing`、`choice`、`part` と、`overlays`（`saveMenu`、`saveConfirm`、`dialog`、`notebook`、`backlog`、`gallery`）を確認できます。`save-load` モードでは `saveLoad` に使用スロット、保存形式、保存時・ロード後のシーンと本文、照合結果を記録します。

`stalled` の場合は追加の `stallReason` と `stalledScreen` を最初に確認してください。タイトルなら `[data-start]` などの主メニュー、ダイアログなら `.dialog-ok` / `.dialog-cancel`、セーブメニューならスロットの有効状態、会話なら `revealing`、特殊パートなら `part` を切り分けます。詳細な本文と表示ボタンは `lastScreen`、到達履歴は `visitedScenes`、特殊パートの開始・完了は `partsEntered`、直前の操作は `events` にあります。`errors` が空でも `stallReason` は進行停止の診断として扱ってください。

## 期待する到達END

通常の機械的操作ドライバによる基準線は、`execution` → `a4`、`confession` → `b2` です。`confession` が `b1` ではないのは退行ではありません。ドライバはペルソナではなく、押せるボタンを順に押すため、共同推理で `コウナンに任せる` を多く選びます。その結果、宗玄の動揺が B-1 の門である 97 に届かず、最終選択で『帰り唄』の意味を正しく指摘しても B-2 へ進みます。動揺ゲート導入後は、この `b2` を期待値として扱います。

```sh
tools/ブラウザ検証/実行.sh
```

シナリオデータだけをたどる代表経路の検査は、`tools/到達可能性検査.mjs` です。これは特殊パートを実行せず、必要フラグも注入する到達可能性検査であり、実プレイではありません。AIによる実ブラウザプレイと本文ログは `tools/AIプレイ/実行.sh all` を使います（[設計](../../docs/AIプレイ設計.md)）。

単独で画面を確認するときは、生成後に以下の `mode` を指定します。`title`、`conversation`、`choice`、`rebuttal`、`inference` が使えます。`save-load` はスロット1へ保存し、タイトル確認を経て同じスロットをロードした後、通常どおりENDまで進める往復検証です。

```sh
google-chrome --headless=new --no-sandbox --disable-gpu --allow-file-access-from-files \
  --window-size=1280,720 --virtual-time-budget=600000 --screenshot=/tmp/kaeriuta.png \
  'file:///home/t-tsuji/project/kaeriuta/tools/ブラウザ検証/harness.html?route=confession&mode=inference' 2>/dev/null
```
