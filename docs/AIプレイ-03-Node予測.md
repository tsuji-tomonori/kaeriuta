# 指示書03 AIプレイのNode予測

生成: `node tools/AIプレイ/Node踏破検査.mjs --report`。実シナリオを進め、実パートのHTMLから表示文を読み、11ペルソナの採点器でクリックする。盤の操作・観測はブラウザと共通。CSS描画とブラウザの非同期動作は未検証。章末帳簿は効果がないため省略。

| ペルソナ | END予測 | 疑惑 | 確信 | 動揺 | 判断数 |
|---|---|---:|---:|---:|---:|
| suiri | b3_silenced | 85 | 0 | 0 | 57 |
| bannin | a3_puppet | 61 | 100 | 0 | 39 |
| kanjou | b1_true | 50 | 13 | 100 | 70 |
| sokkyou | a1_arrest | 89 | 11 | 0 | 41 |
| ura | a3_puppet | 61 | 37 | 0 | 41 |
| toubou | a2_escape | 42 | 100 | 0 | 43 |
| ayatsuri | a1_arrest | 94 | 35 | 0 | 41 |
| gyakuten | a4_reversal | 100 | 0 | 0 | 59 |
| mikiri | b3_silenced | 43 | 27 | 0 | 52 |
| shoshinsha | b2_unfinished | 69 | 25 | 48 | 91 |
| danzai | b2_unfinished | 64 | 60 | 0 | 36 |

以下は各採点器が実際に選んだ表示文。自由行動は行動と注目先を交互に記載。END用の状態・選択肢ID・正解表を採点器へ渡していない。

## suiri

- prologue／choice: 時刻だけを書き留める
- prologue／choice: 暖炉から遠い席に座る
- prologue／choice: 口上を聞き流す
- prologue／choice: 片付けを手伝う
- chapter1／choice: 白湯を取りに行った、と答える
- chapter1／freeAction: 書斎で初版本の痕を読む消し跡か綴じの違いを、明日の少年への言葉にできる。疑惑が10増す｜注目先で追加の変化あり
- chapter1／freeAction: 献辞の頁を光にかざす手掛かり「献辞の消し跡」｜追加の数値変化なし
- chapter1／freeAction: 剛蔵の部屋で指示書を盗み見る明日の尋問で、兄さんも珈琲に近づいたと言える。疑惑が6増す、信頼が1下がる｜注目先で追加の変化あり
- chapter1／freeAction: 余白の注記まで読む手掛かり「他人の計画書」／反論札「脅迫状の消印控え」｜警戒が1増す
- chapter1／freeAction: 談話室で探偵の手順を覚える明日の尋問で、沈黙が通る順序か、少年が疑う答えを読める。疑惑が4増す、警戒が1増す｜注目先で追加の変化あり
- chapter1／freeAction: コウ君の靴の読み方を見る手掛かり・反論札なし｜警戒が1増す
- chapter1／freeAction: 洗濯室で志津の記憶を聞く明日、志津さんを責める前に、震えの理由を思い出せる。良心が1増す｜注目先で追加の変化あり
- chapter1／freeAction: 地下の音をたずねる手掛かり「地下の物音」｜警戒が1増す
- chapter2／choice: 顔の傷を見る
- chapter2／rebuttal: 反証: 毒は寝酒の方では？観察で知ったコウ君の読み方：言い方を整え、疑惑の増加を3抑える。それでも手口を知りすぎていることは隠せない。 ／ 効き目：強力 ／ 👁 知りすぎを疑われる ／ 疑いが濃くなる ／ 詳細を知りすぎる危険な切り返し
- chapter2／rebuttal: 転嫁: 剛蔵兄さんが後からポットに近づいた効き目：強力 ／ 🤝 誰かの信頼を失う ／ 兄へ疑いを向けて追及をそらす
- chapter2／rebuttal: 反証: 手袋をしていれば指紋など…観察で知ったコウ君の読み方：言い方を整え、疑惑の増加を3抑える。それでも手口を知りすぎていることは隠せない。 ／ 効き目：強力 ／ 👁 知りすぎを疑われる ／ 疑いが濃くなる
- chapter2／freeAction: 佐伯の部屋で歯型の記録を問う控えか証言を持てば、後で死者の名を決めた照合を問い直せる。疑惑が5増す｜注目先で追加の変化あり
- chapter2／freeAction: 佐伯先生の言いよどみを読む手掛かり「カルテ改ざんの証言」｜疑惑が3増す
- chapter2／freeAction: 厨房で夜食と余った茶を調べるこの後、唄と事件を並べるとき、夜食か余った一杯を思い返せる。良心が1増す｜注目先で追加の変化あり
- chapter2／freeAction: 夜食の当番欄を読む手掛かり「配膳の当番メモ」／手掛かり「厨房の献立表」／反論札「厨房の献立表」｜追加の数値変化なし
- chapter2／freeAction: 談話室で昨日の証言を整える後の尋問で知りすぎを疑われる危険を薄め、信頼か疑いを整える。良心が1下がる｜注目先で追加の変化あり
- chapter2／freeAction: 悟郎の聞き取り順に答え直す手掛かり・反論札なし｜知りすぎが1下がる、疑惑が5下がる、警戒が3増す
- chapter2／freeAction: 書斎で恩田の書き込みを辿る消された名は作者を問う根拠に、筆圧は後の計画書の追及への備えに。疑惑が6増す｜注目先で追加の変化あり
- chapter2／freeAction: 余白の鉛筆を追う手掛かり「献辞の消し跡」｜追加の数値変化なし
- chapter3／choice: ……あなたたちが来なければよかったのに
- chapter3／choice: 右へ――少年の部屋の扉を叩く
- chapter3／choice: このまま扉を叩く
- chapter3／choice: あの唄を書いた人に、会ってみたくなったの
- chapter4b／choice: 部屋に籠る
- chapter4b／choice: 危険を承知で扉を開ける
- chapter4b／rebuttal: 反証: 暖炉の指示メモプロローグ・暖炉で得た札 ／ 効き目：強力 ／ 露見時：疑い +4 ／ 使うと指示メモを先に読んでいたことが露見する
- chapter4b／rebuttal: 反証: 計画書三通の差異第二章・計画書の照合で得た札 ／ 効き目：強力 ／ 露見時：疑い +8 ／ 使うと共犯者ごとの偽の頁を作っていたことが露見する
- chapter4b／rebuttal: 反証: 六つの唄プロローグ・宴の朗読で得た札 ／ 効き目：手応えあり
- chapter4b／choice: コウ君へ原稿を投げる

盤の判断数: 22。警告: 0件。

## bannin

- prologue／choice: 雨と館の様子も書く
- prologue／choice: 少年の近くに座る
- prologue／choice: 口上を聞き流す
- prologue／choice: 自室へ戻る
- chapter1／choice: 曖昧に笑って答えを遅らせる
- chapter1／freeAction: 二階廊下から壁と裏道を探る壁の空白は館内の退路に、旧道は館を離れる足掛かりに。疑惑が5増す｜注目先で追加の変化あり
- chapter1／freeAction: 笹の向こうの旧道を見る手掛かり「三里先の旧道」｜疑惑が3増す
- chapter1／freeAction: 談話室で探偵の手順を覚える明日の尋問で、沈黙が通る順序か、少年が疑う答えを読める。疑惑が4増す、警戒が1増す｜注目先で追加の変化あり
- chapter1／freeAction: 悟郎の聞く順番を数える手掛かり・反論札なし｜追加の数値変化なし
- chapter1／freeAction: 厨房から昨夜の足取りを辿る配膳は明日の尋問に、雨靴の控えは後の足跡の追及に。疑惑が6増す｜注目先で追加の変化あり
- chapter1／freeAction: 配膳の刻限を覚える手掛かり「配膳の当番メモ」／反論札「配膳の当番メモ」／反論札「厨房の献立表」／反論札「夜食の配膳時刻表」｜追加の数値変化なし
- chapter1／freeAction: 剛蔵の部屋で指示書を盗み見る明日の尋問で、兄さんも珈琲に近づいたと言える。疑惑が6増す、信頼が1下がる｜注目先で追加の変化あり
- chapter1／freeAction: 唄の時刻を照合する手掛かり「他人の計画書」｜疑惑が2下がる
- chapter2／choice: 黙って下がる
- chapter2／rebuttal: 沈黙: 沈黙する効き目：悟郎の確信は変わらない
- chapter2／rebuttal: 沈黙: 沈黙する効き目：逆効果（悟郎の確信が上がる）
- chapter2／rebuttal: 沈黙: 沈黙する観察で知った悟郎の手順：運び手の推理が残っている。ここで黙ると確信が増す。 ／ 効き目：逆効果（悟郎の確信が上がる）
- chapter2／freeAction: 旧道の道標と五番の唄を照合する道筋は館を離れる足掛かりに、目撃の控えは後の追及への備えに。疑惑が3増す｜注目先で追加の変化あり
- chapter2／freeAction: 唄の距離を数える手掛かり「三里先の旧道」｜疑惑が2下がる
- chapter2／freeAction: 書斎で恩田の書き込みを辿る消された名は作者を問う根拠に、筆圧は後の計画書の追及への備えに。疑惑が6増す｜注目先で追加の変化あり
- chapter2／freeAction: 最終章の紙を撫で比べる反論札「筆圧比較メモ」｜警戒が1増す
- chapter2／freeAction: 安置室で死者の手を確かめる手は死者の名を疑う根拠に、繊維は後の凶器の追及への備えに。疑惑が9増す、知りすぎが1増す｜注目先で追加の変化あり
- chapter2／freeAction: 爪の根元の黒さを読む反論札「替え布の繊維鑑定」｜警戒が1増す
- chapter2／freeAction: 厨房で夜食と余った茶を調べるこの後、唄と事件を並べるとき、夜食か余った一杯を思い返せる。良心が1増す｜注目先で追加の変化あり
- chapter2／freeAction: 夜食の当番欄を読む手掛かり「配膳の当番メモ」／手掛かり「厨房の献立表」／反論札「厨房の献立表」｜追加の数値変化なし
- chapter3／choice: 無言で会釈する
- chapter3／choice: 左へ――凶器を取る
- chapter3／choice: 無言
- chapter4a／choice: 自室へ戻る
- chapter4a／rebuttal: 沈黙: 時刻だけは争わない効き目：悟郎の確信は変わらない
- chapter4a／rebuttal: 沈黙: 足跡の話を聞き流す効き目：逆効果（悟郎の確信が上がる）
- chapter4a／rebuttal: 沈黙: 繊維の話には答えない効き目：逆効果（悟郎の確信が上がる）
- chapter4a／rebuttal: 沈黙: 被害者の恐怖を否定しない効き目：逆効果（悟郎の確信が上がる）
- chapter4a／rebuttal: 沈黙: ペンを握った手を隠す効き目：逆効果（悟郎の確信が上がる）
- chapter4a／rebuttal: 沈黙: 旧道の名を口にしない効き目：悟郎の確信は変わらない
- chapter4a／rebuttal: 沈黙: 死因の名を繰り返さない効き目：逆効果（悟郎の確信が上がる）
- chapter4a／choice: 黙って耐える
- chapter4a／choice: 自分の選択として紙片を開く

盤の判断数: 1。警告: 0件。

## kanjou

- prologue／choice: 時刻だけを書き留める
- prologue／choice: 暖炉から遠い席に座る
- prologue／choice: 口上を聞き流す
- prologue／choice: 片付けを手伝う
- chapter1／choice: 白湯を取りに行った、と答える
- chapter1／freeAction: 談話室で探偵の手順を覚える明日の尋問で、沈黙が通る順序か、少年が疑う答えを読める。疑惑が4増す、警戒が1増す｜注目先で追加の変化あり
- chapter1／freeAction: 悟郎の聞く順番を数える手掛かり・反論札なし｜追加の数値変化なし
- chapter1／freeAction: 剛蔵の部屋で指示書を盗み見る明日の尋問で、兄さんも珈琲に近づいたと言える。疑惑が6増す、信頼が1下がる｜注目先で追加の変化あり
- chapter1／freeAction: 余白の注記まで読む手掛かり「他人の計画書」／反論札「脅迫状の消印控え」｜警戒が1増す
- chapter1／freeAction: 洗濯室で志津の記憶を聞く明日、志津さんを責める前に、震えの理由を思い出せる。良心が1増す｜注目先で追加の変化あり
- chapter1／freeAction: 震える指先を見る手掛かり・反論札なし｜信頼が5増す
- chapter1／freeAction: 厨房から昨夜の足取りを辿る配膳は明日の尋問に、雨靴の控えは後の足跡の追及に。疑惑が6増す｜注目先で追加の変化あり
- chapter1／freeAction: 配膳の刻限を覚える手掛かり「配膳の当番メモ」／反論札「配膳の当番メモ」／反論札「厨房の献立表」／反論札「夜食の配膳時刻表」｜追加の数値変化なし
- chapter2／choice: 顔の傷を見る
- chapter2／rebuttal: 反証: 厨房の献立表第一・第二章・厨房の当番欄で得た札 ／ 効き目：逆効果（悟郎の確信が上がる）
- chapter2／rebuttal: 反証: 配膳の当番メモ第一章・厨房で得た札 ／ 効き目：強力
- chapter2／rebuttal: 反証: 食後の後片付けプロローグ・片付けを手伝うで得た札 ／ 効き目：強力
- chapter2／freeAction: 談話室で昨日の証言を整える後の尋問で知りすぎを疑われる危険を薄め、信頼か疑いを整える。良心が1下がる｜注目先で追加の変化あり
- chapter2／freeAction: 蘭子と昨日の動線を確かめる手掛かり・反論札なし｜知りすぎが1下がる、信頼が5増す
- chapter2／freeAction: 厨房で夜食と余った茶を調べるこの後、唄と事件を並べるとき、夜食か余った一杯を思い返せる。良心が1増す｜注目先で追加の変化あり
- chapter2／freeAction: 余った朝の茶葉を嗅ぐ手掛かり・反論札なし｜良心が1増す、信頼が3増す
- chapter2／freeAction: 書斎で恩田の書き込みを辿る消された名は作者を問う根拠に、筆圧は後の計画書の追及への備えに。疑惑が6増す｜注目先で追加の変化あり
- chapter2／freeAction: 最終章の紙を撫で比べる反論札「筆圧比較メモ」｜警戒が1増す
- chapter2／freeAction: 佐伯の部屋で歯型の記録を問う控えか証言を持てば、後で死者の名を決めた照合を問い直せる。疑惑が5増す｜注目先で追加の変化あり
- chapter2／freeAction: 複写紙の端を覚える手掛かり「控えカルテ」／反論札「控えカルテ」／反論札「診察時刻の控え」｜追加の数値変化なし
- chapter3／choice: ……あなたたちが来なければよかったのに
- chapter3／choice: 右へ――少年の部屋の扉を叩く
- chapter3／choice: 本にメモを挟む
- chapter3／choice: 分からない。気づいたら、ここにいた
- chapter4b／choice: 共犯者のふりをして準備を続ける
- chapter4b／jointReasoning: あの男は存在しない地下室？ あれはただの物置だ
- chapter4b／jointReasoning: 律の遺したものを突きつける 🕯
- chapter4b／jointReasoning: あの男は存在しない食事の件はもう答えた。管理人に聞けばいい
- chapter4b／jointReasoning: 自分が暴く（カード提示）
- chapter4b／jointReasoning: あの男は存在しない霧原律？ 四十年前に谷へ落ちた男だろう
- chapter4b／jointReasoning: 律の遺したものを突きつける 🕯
- chapter4b／jointReasoning: 物語は私のものだ最終章の改稿は推敲だ。結末を書き直すのも作者の権利だよ
- chapter4b／jointReasoning: 自分が暴く（カード提示）
- chapter4b／jointReasoning: 物語は私のものだでは、作者は誰だと言うのだ。名前が、あるのか
- chapter4b／jointReasoning: 自分が暴く（カード提示）
- chapter4b／jointReasoning: 物語は私のものだ原稿は私の直筆だ。筆跡鑑定でもするかね
- chapter4b／jointReasoning: コウナンに任せる主張は崩せる／動揺は増えない
- chapter4b／jointReasoning: 私は死んでいた生きた私はどこにいた？ 三日間、誰も私を見ていない
- chapter4b／jointReasoning: コウナンに任せる主張は崩せる／動揺は増えない
- chapter4b／jointReasoning: 私は死んでいた歯型の照合は済んでいる。医学が私の死を証明した
- chapter4b／jointReasoning: コウナンに任せる主張は崩せる／動揺は増えない
- chapter4b／jointReasoning: 私は死んでいた君たちは私の死体を見た。全員がだ
- chapter4b／jointReasoning: コウナンに任せる主張は崩せる／動揺は増えない
- chapter4b／jointReasoning: 物語は私のものだあの唄は土地で採集したものだ
- chapter4b／jointReasoning: 自分が暴く（カード提示）
- chapter4b／jointReasoning: 罪は君たちのものだ手を下したのは君たちだ。私は誰も殺せとは書いていない
- chapter4b／jointReasoning: 自分が暴く（カード提示）
- chapter4b／choice: 「帰り唄」――あの題の意味を、あなたは四十年間、読み違えている

盤の判断数: 17。警告: 0件。

## sokkyou

- prologue／choice: 時刻だけを書き留める
- prologue／choice: 少年の近くに座る
- prologue／choice: 口上を聞き流す
- prologue／choice: 片付けを手伝う
- chapter1／choice: 曖昧に笑って答えを遅らせる
- chapter1／freeAction: 書斎で初版本の痕を読む消し跡か綴じの違いを、明日の少年への言葉にできる。疑惑が10増す｜注目先で追加の変化あり
- chapter1／freeAction: 献辞の頁を光にかざす手掛かり「献辞の消し跡」｜追加の数値変化なし
- chapter1／freeAction: 洗濯室で志津の記憶を聞く明日、志津さんを責める前に、震えの理由を思い出せる。良心が1増す｜注目先で追加の変化あり
- chapter1／freeAction: 震える指先を見る手掛かり・反論札なし｜信頼が5増す
- chapter1／freeAction: 剛蔵の部屋で指示書を盗み見る明日の尋問で、兄さんも珈琲に近づいたと言える。疑惑が6増す、信頼が1下がる｜注目先で追加の変化あり
- chapter1／freeAction: 唄の時刻を照合する手掛かり「他人の計画書」｜疑惑が2下がる
- chapter1／freeAction: 厨房から昨夜の足取りを辿る配膳は明日の尋問に、雨靴の控えは後の足跡の追及に。疑惑が6増す｜注目先で追加の変化あり
- chapter1／freeAction: 配膳の刻限を覚える手掛かり「配膳の当番メモ」／反論札「配膳の当番メモ」／反論札「厨房の献立表」／反論札「夜食の配膳時刻表」｜追加の数値変化なし
- chapter2／choice: 黙って下がる
- chapter2／rebuttal: 反証: 厨房の献立表第一・第二章・厨房の当番欄で得た札 ／ 効き目：逆効果（悟郎の確信が上がる）
- chapter2／rebuttal: 反証: 配膳の当番メモ第一章・厨房で得た札 ／ 効き目：強力
- chapter2／rebuttal: 反証: 食後の後片付けプロローグ・片付けを手伝うで得た札 ／ 効き目：強力
- chapter2／freeAction: 安置室で死者の手を確かめる手は死者の名を疑う根拠に、繊維は後の凶器の追及への備えに。疑惑が9増す、知りすぎが1増す｜注目先で追加の変化あり
- chapter2／freeAction: 左手の筆だこを見る手掛かり「死体のペンだこ」／反論札「死体のペンだこ」｜追加の数値変化なし
- chapter2／freeAction: 佐伯の部屋で歯型の記録を問う控えか証言を持てば、後で死者の名を決めた照合を問い直せる。疑惑が5増す｜注目先で追加の変化あり
- chapter2／freeAction: 複写紙の端を覚える手掛かり「控えカルテ」／反論札「控えカルテ」／反論札「診察時刻の控え」｜追加の数値変化なし
- chapter2／freeAction: 厨房で夜食と余った茶を調べるこの後、唄と事件を並べるとき、夜食か余った一杯を思い返せる。良心が1増す｜注目先で追加の変化あり
- chapter2／freeAction: 夜食の当番欄を読む手掛かり「配膳の当番メモ」／手掛かり「厨房の献立表」／反論札「厨房の献立表」｜追加の数値変化なし
- chapter2／freeAction: 書斎で恩田の書き込みを辿る消された名は作者を問う根拠に、筆圧は後の計画書の追及への備えに。疑惑が6増す｜注目先で追加の変化あり
- chapter2／freeAction: 余白の鉛筆を追う手掛かり「献辞の消し跡」｜追加の数値変化なし
- chapter3／choice: 無言で会釈する
- chapter3／choice: 左へ――凶器を取る
- chapter3／choice: 無言
- chapter4a／choice: 自室へ戻る
- chapter4a／rebuttal: 反証: 夜食の配膳時刻表第一章・厨房で配膳の刻限を覚えるで得た札 ／ 効き目：強力 ／ 露見時：疑い +8 ／ 使うと配膳時刻を自分でずらしたことが露見する
- chapter4a／rebuttal: 沈黙: 足跡の話を聞き流す効き目：逆効果（悟郎の確信が上がる）
- chapter4a／rebuttal: 沈黙: 繊維の話には答えない効き目：逆効果（悟郎の確信が上がる）
- chapter4a／rebuttal: 沈黙: 被害者の恐怖を否定しない効き目：逆効果（悟郎の確信が上がる）
- chapter4a／rebuttal: 転嫁: 計画書三通の差異第二章・計画書の照合で得た札 ／ 効き目：手応えあり ／ 🕯 良心を削る ／ 露見時：疑い +8 ／ 使うと共犯者ごとの偽の頁を作っていたことが露見する
- chapter4a／rebuttal: 沈黙: 旧道の名を口にしない効き目：悟郎の確信は変わらない
- chapter4a／rebuttal: 反証: 診察時刻の控え第二章・控えカルテの時刻を読むで得た札 ／ 効き目：強力 ／ 露見時：疑い +10 ／ 使うと死因を知る時刻を自分でずらしたことが露見する
- chapter4a／choice: 挙手して割り込む
- chapter4a／choice: 悟郎の問いを正面から受ける

盤の判断数: 3。警告: 0件。

## ura

- prologue／choice: 雨と館の様子も書く
- prologue／choice: 暖炉から遠い席に座る
- prologue／choice: 指先まで注視する
- prologue／choice: 片付けを手伝う
- chapter1／choice: 曖昧に笑って答えを遅らせる
- chapter1／freeAction: 二階廊下から壁と裏道を探る壁の空白は館内の退路に、旧道は館を離れる足掛かりに。疑惑が5増す｜注目先で追加の変化あり
- chapter1／freeAction: 笹の向こうの旧道を見る手掛かり「三里先の旧道」｜疑惑が3増す
- chapter1／freeAction: 談話室で探偵の手順を覚える明日の尋問で、沈黙が通る順序か、少年が疑う答えを読める。疑惑が4増す、警戒が1増す｜注目先で追加の変化あり
- chapter1／freeAction: 悟郎の聞く順番を数える手掛かり・反論札なし｜追加の数値変化なし
- chapter1／freeAction: 剛蔵の部屋で指示書を盗み見る明日の尋問で、兄さんも珈琲に近づいたと言える。疑惑が6増す、信頼が1下がる｜注目先で追加の変化あり
- chapter1／freeAction: 唄の時刻を照合する手掛かり「他人の計画書」｜疑惑が2下がる
- chapter1／freeAction: 厨房から昨夜の足取りを辿る配膳は明日の尋問に、雨靴の控えは後の足跡の追及に。疑惑が6増す｜注目先で追加の変化あり
- chapter1／freeAction: 配膳の刻限を覚える手掛かり「配膳の当番メモ」／反論札「配膳の当番メモ」／反論札「厨房の献立表」／反論札「夜食の配膳時刻表」｜追加の数値変化なし
- chapter2／choice: 黙って下がる
- chapter2／rebuttal: 転嫁: 珈琲なら誰でも触れたはず観察で知った悟郎の手順：運び手を先に問えば、確信をさらに3下げられる。 ／ 効き目：手応えあり
- chapter2／rebuttal: 転嫁: 剛蔵兄さんが後からポットに近づいた効き目：強力 ／ 🤝 誰かの信頼を失う ／ 兄へ疑いを向けて追及をそらす
- chapter2／rebuttal: 沈黙: 沈黙する観察で知った悟郎の手順：運び手の推理は崩した。ここは黙っても確信が増さない。 ／ 効き目：悟郎の確信は変わらない
- chapter2／freeAction: 談話室で昨日の証言を整える後の尋問で知りすぎを疑われる危険を薄め、信頼か疑いを整える。良心が1下がる｜注目先で追加の変化あり
- chapter2／freeAction: 蘭子と昨日の動線を確かめる手掛かり・反論札なし｜知りすぎが1下がる、信頼が5増す
- chapter2／freeAction: 旧道の道標と五番の唄を照合する道筋は館を離れる足掛かりに、目撃の控えは後の追及への備えに。疑惑が3増す｜注目先で追加の変化あり
- chapter2／freeAction: 赤鉛筆の山道を辿る手掛かり「三里先の旧道」／反論札「猟師の目撃メモ」｜疑惑が1増す
- chapter2／freeAction: 安置室で死者の手を確かめる手は死者の名を疑う根拠に、繊維は後の凶器の追及への備えに。疑惑が9増す、知りすぎが1増す｜注目先で追加の変化あり
- chapter2／freeAction: 爪の根元の黒さを読む反論札「替え布の繊維鑑定」｜警戒が1増す
- chapter2／freeAction: 書斎で恩田の書き込みを辿る消された名は作者を問う根拠に、筆圧は後の計画書の追及への備えに。疑惑が6増す｜注目先で追加の変化あり
- chapter2／freeAction: 最終章の紙を撫で比べる反論札「筆圧比較メモ」｜警戒が1増す
- chapter3／choice: ……あなたたちが来なければよかったのに
- chapter3／choice: 左へ――凶器を取る
- chapter3／choice: あなたこそ、歯型のカルテに何をしたの
- chapter4a／choice: 階段の下を見る
- chapter4a／rebuttal: 沈黙: 時刻だけは争わない効き目：悟郎の確信は変わらない
- chapter4a／rebuttal: 転嫁: 藤乃の濡れた裾を証言する効き目：強力 ／ 🕯 良心を削る
- chapter4a／rebuttal: 沈黙: 繊維の話には答えない効き目：逆効果（悟郎の確信が上がる）
- chapter4a／rebuttal: 沈黙: 被害者の恐怖を否定しない効き目：逆効果（悟郎の確信が上がる）
- chapter4a／rebuttal: 沈黙: ペンを握った手を隠す効き目：逆効果（悟郎の確信が上がる）
- chapter4a／rebuttal: 沈黙: 旧道の名を口にしない効き目：悟郎の確信は変わらない
- chapter4a／rebuttal: 沈黙: 死因の名を繰り返さない効き目：逆効果（悟郎の確信が上がる）
- chapter4a／choice: 黙って耐える
- chapter4a／choice: 自分が選ばなかった頁として見る

盤の判断数: 3。警告: 0件。

## toubou

- prologue／choice: 雨と館の様子も書く
- prologue／choice: 少年の近くに座る
- prologue／choice: 口上を聞き流す
- prologue／choice: 自室へ戻る
- chapter1／choice: 曖昧に笑って答えを遅らせる
- chapter1／freeAction: 二階廊下から壁と裏道を探る壁の空白は館内の退路に、旧道は館を離れる足掛かりに。疑惑が5増す｜注目先で追加の変化あり
- chapter1／freeAction: 笹の向こうの旧道を見る手掛かり「三里先の旧道」｜疑惑が3増す
- chapter1／freeAction: 洗濯室で志津の記憶を聞く明日、志津さんを責める前に、震えの理由を思い出せる。良心が1増す｜注目先で追加の変化あり
- chapter1／freeAction: 震える指先を見る手掛かり・反論札なし｜信頼が5増す
- chapter1／freeAction: 談話室で探偵の手順を覚える明日の尋問で、沈黙が通る順序か、少年が疑う答えを読める。疑惑が4増す、警戒が1増す｜注目先で追加の変化あり
- chapter1／freeAction: 悟郎の聞く順番を数える手掛かり・反論札なし｜追加の数値変化なし
- chapter1／freeAction: 厨房から昨夜の足取りを辿る配膳は明日の尋問に、雨靴の控えは後の足跡の追及に。疑惑が6増す｜注目先で追加の変化あり
- chapter1／freeAction: 配膳の刻限を覚える手掛かり「配膳の当番メモ」／反論札「配膳の当番メモ」／反論札「厨房の献立表」／反論札「夜食の配膳時刻表」｜追加の数値変化なし
- chapter2／choice: 黙って下がる
- chapter2／rebuttal: 沈黙: 沈黙する効き目：悟郎の確信は変わらない
- chapter2／rebuttal: 沈黙: 沈黙する効き目：逆効果（悟郎の確信が上がる）
- chapter2／rebuttal: 沈黙: 沈黙する観察で知った悟郎の手順：運び手の推理が残っている。ここで黙ると確信が増す。 ／ 効き目：逆効果（悟郎の確信が上がる）
- chapter2／freeAction: 旧道の道標と五番の唄を照合する道筋は館を離れる足掛かりに、目撃の控えは後の追及への備えに。疑惑が3増す｜注目先で追加の変化あり
- chapter2／freeAction: 唄の距離を数える手掛かり「三里先の旧道」｜疑惑が2下がる
- chapter2／freeAction: 厨房で夜食と余った茶を調べるこの後、唄と事件を並べるとき、夜食か余った一杯を思い返せる。良心が1増す｜注目先で追加の変化あり
- chapter2／freeAction: 余った朝の茶葉を嗅ぐ手掛かり・反論札なし｜良心が1増す、信頼が3増す
- chapter2／freeAction: 談話室で昨日の証言を整える後の尋問で知りすぎを疑われる危険を薄め、信頼か疑いを整える。良心が1下がる｜注目先で追加の変化あり
- chapter2／freeAction: 悟郎の聞き取り順に答え直す手掛かり・反論札なし｜知りすぎが1下がる、疑惑が5下がる、警戒が3増す
- chapter2／freeAction: 佐伯の部屋で歯型の記録を問う控えか証言を持てば、後で死者の名を決めた照合を問い直せる。疑惑が5増す｜注目先で追加の変化あり
- chapter2／freeAction: 複写紙の端を覚える手掛かり「控えカルテ」／反論札「控えカルテ」／反論札「診察時刻の控え」｜追加の数値変化なし
- chapter3／choice: 無言で会釈する
- chapter3／choice: 左へ――凶器を取る
- chapter3／choice: 無言
- chapter4a／choice: 自室へ戻る
- chapter4a／rebuttal: 沈黙: 時刻だけは争わない効き目：悟郎の確信は変わらない
- chapter4a／rebuttal: 沈黙: 足跡の話を聞き流す効き目：逆効果（悟郎の確信が上がる）
- chapter4a／rebuttal: 沈黙: 繊維の話には答えない効き目：逆効果（悟郎の確信が上がる）
- chapter4a／rebuttal: 沈黙: 被害者の恐怖を否定しない効き目：逆効果（悟郎の確信が上がる）
- chapter4a／rebuttal: 沈黙: ペンを握った手を隠す効き目：逆効果（悟郎の確信が上がる）
- chapter4a／rebuttal: 沈黙: 旧道の名を口にしない効き目：悟郎の確信は変わらない
- chapter4a／rebuttal: 沈黙: 死因の名を繰り返さない効き目：逆効果（悟郎の確信が上がる）
- chapter4a／choice: 隙を見て館を出る
- chapter4a／choice: 足跡を消しながら旧道を下る

盤の判断数: 5。警告: 0件。

## ayatsuri

- prologue／choice: 時刻だけを書き留める
- prologue／choice: 少年の近くに座る
- prologue／choice: 口上を聞き流す
- prologue／choice: 自室へ戻る
- chapter1／choice: 白湯を取りに行った、と答える
- chapter1／freeAction: 書斎で初版本の痕を読む消し跡か綴じの違いを、明日の少年への言葉にできる。疑惑が10増す｜注目先で追加の変化あり
- chapter1／freeAction: 献辞の頁を光にかざす手掛かり「献辞の消し跡」｜追加の数値変化なし
- chapter1／freeAction: 洗濯室で志津の記憶を聞く明日、志津さんを責める前に、震えの理由を思い出せる。良心が1増す｜注目先で追加の変化あり
- chapter1／freeAction: 震える指先を見る手掛かり・反論札なし｜信頼が5増す
- chapter1／freeAction: 剛蔵の部屋で指示書を盗み見る明日の尋問で、兄さんも珈琲に近づいたと言える。疑惑が6増す、信頼が1下がる｜注目先で追加の変化あり
- chapter1／freeAction: 唄の時刻を照合する手掛かり「他人の計画書」｜疑惑が2下がる
- chapter1／freeAction: 厨房から昨夜の足取りを辿る配膳は明日の尋問に、雨靴の控えは後の足跡の追及に。疑惑が6増す｜注目先で追加の変化あり
- chapter1／freeAction: 配膳の刻限を覚える手掛かり「配膳の当番メモ」／反論札「配膳の当番メモ」／反論札「厨房の献立表」／反論札「夜食の配膳時刻表」｜追加の数値変化なし
- chapter2／choice: 黙って下がる
- chapter2／rebuttal: 反証: 厨房の献立表第一・第二章・厨房の当番欄で得た札 ／ 効き目：逆効果（悟郎の確信が上がる）
- chapter2／rebuttal: 反証: 配膳の当番メモ第一章・厨房で得た札 ／ 効き目：強力
- chapter2／rebuttal: 反証: 手袋をしていれば指紋など…効き目：強力 ／ 👁 知りすぎを疑われる ／ 疑いが濃くなる
- chapter2／freeAction: 安置室で死者の手を確かめる手は死者の名を疑う根拠に、繊維は後の凶器の追及への備えに。疑惑が9増す、知りすぎが1増す｜注目先で追加の変化あり
- chapter2／freeAction: 左手の筆だこを見る手掛かり「死体のペンだこ」／反論札「死体のペンだこ」｜追加の数値変化なし
- chapter2／freeAction: 佐伯の部屋で歯型の記録を問う控えか証言を持てば、後で死者の名を決めた照合を問い直せる。疑惑が5増す｜注目先で追加の変化あり
- chapter2／freeAction: 複写紙の端を覚える手掛かり「控えカルテ」／反論札「控えカルテ」／反論札「診察時刻の控え」｜追加の数値変化なし
- chapter2／freeAction: 厨房で夜食と余った茶を調べるこの後、唄と事件を並べるとき、夜食か余った一杯を思い返せる。良心が1増す｜注目先で追加の変化あり
- chapter2／freeAction: 夜食の当番欄を読む手掛かり「配膳の当番メモ」／手掛かり「厨房の献立表」／反論札「厨房の献立表」｜追加の数値変化なし
- chapter2／freeAction: 書斎で恩田の書き込みを辿る消された名は作者を問う根拠に、筆圧は後の計画書の追及への備えに。疑惑が6増す｜注目先で追加の変化あり
- chapter2／freeAction: 余白の鉛筆を追う手掛かり「献辞の消し跡」｜追加の数値変化なし
- chapter3／choice: ありがとう。あなたは優しいのね
- chapter3／choice: 左へ――凶器を取る
- chapter3／choice: どういう意味？
- chapter4a／choice: 自室へ戻る
- chapter4a／rebuttal: 反証: 夜食の配膳時刻表第一章・厨房で配膳の刻限を覚えるで得た札 ／ 効き目：強力 ／ 露見時：疑い +8 ／ 使うと配膳時刻を自分でずらしたことが露見する
- chapter4a／rebuttal: 沈黙: 足跡の話を聞き流す効き目：逆効果（悟郎の確信が上がる）
- chapter4a／rebuttal: 沈黙: 繊維の話には答えない効き目：逆効果（悟郎の確信が上がる）
- chapter4a／rebuttal: 沈黙: 被害者の恐怖を否定しない効き目：逆効果（悟郎の確信が上がる）
- chapter4a／rebuttal: 転嫁: 計画書三通の差異第二章・計画書の照合で得た札 ／ 効き目：手応えあり ／ 🕯 良心を削る ／ 露見時：疑い +8 ／ 使うと共犯者ごとの偽の頁を作っていたことが露見する
- chapter4a／rebuttal: 沈黙: 旧道の名を口にしない効き目：悟郎の確信は変わらない
- chapter4a／rebuttal: 沈黙: 死因の名を繰り返さない効き目：逆効果（悟郎の確信が上がる）
- chapter4a／choice: 挙手して割り込む
- chapter4a／choice: 悟郎の問いを正面から受ける

盤の判断数: 3。警告: 0件。

## gyakuten

- prologue／choice: 時刻だけを書き留める
- prologue／choice: 暖炉から遠い席に座る
- prologue／choice: 口上を聞き流す
- prologue／choice: 片付けを手伝う
- chapter1／choice: 白湯を取りに行った、と答える
- chapter1／freeAction: 書斎で初版本の痕を読む消し跡か綴じの違いを、明日の少年への言葉にできる。疑惑が10増す｜注目先で追加の変化あり
- chapter1／freeAction: 献辞の頁を光にかざす手掛かり「献辞の消し跡」｜追加の数値変化なし
- chapter1／freeAction: 剛蔵の部屋で指示書を盗み見る明日の尋問で、兄さんも珈琲に近づいたと言える。疑惑が6増す、信頼が1下がる｜注目先で追加の変化あり
- chapter1／freeAction: 余白の注記まで読む手掛かり「他人の計画書」／反論札「脅迫状の消印控え」｜警戒が1増す
- chapter1／freeAction: 洗濯室で志津の記憶を聞く明日、志津さんを責める前に、震えの理由を思い出せる。良心が1増す｜注目先で追加の変化あり
- chapter1／freeAction: 地下の音をたずねる手掛かり「地下の物音」｜警戒が1増す
- chapter1／freeAction: 厨房から昨夜の足取りを辿る配膳は明日の尋問に、雨靴の控えは後の足跡の追及に。疑惑が6増す｜注目先で追加の変化あり
- chapter1／freeAction: 配膳の刻限を覚える手掛かり「配膳の当番メモ」／反論札「配膳の当番メモ」／反論札「厨房の献立表」／反論札「夜食の配膳時刻表」｜追加の数値変化なし
- chapter2／choice: 手元を見る
- chapter2／rebuttal: 反証: 厨房の献立表第一・第二章・厨房の当番欄で得た札 ／ 効き目：逆効果（悟郎の確信が上がる）
- chapter2／rebuttal: 反証: 配膳の当番メモ第一章・厨房で得た札 ／ 効き目：強力
- chapter2／rebuttal: 反証: 食後の後片付けプロローグ・片付けを手伝うで得た札 ／ 効き目：強力
- chapter2／freeAction: 佐伯の部屋で歯型の記録を問う控えか証言を持てば、後で死者の名を決めた照合を問い直せる。疑惑が5増す｜注目先で追加の変化あり
- chapter2／freeAction: 複写紙の端を覚える手掛かり「控えカルテ」／反論札「控えカルテ」／反論札「診察時刻の控え」｜追加の数値変化なし
- chapter2／freeAction: 厨房で夜食と余った茶を調べるこの後、唄と事件を並べるとき、夜食か余った一杯を思い返せる。良心が1増す｜注目先で追加の変化あり
- chapter2／freeAction: 夜食の当番欄を読む手掛かり「配膳の当番メモ」／手掛かり「厨房の献立表」／反論札「厨房の献立表」｜追加の数値変化なし
- chapter2／freeAction: 書斎で恩田の書き込みを辿る消された名は作者を問う根拠に、筆圧は後の計画書の追及への備えに。疑惑が6増す｜注目先で追加の変化あり
- chapter2／freeAction: 余白の鉛筆を追う手掛かり「献辞の消し跡」｜追加の数値変化なし
- chapter2／freeAction: 安置室で死者の手を確かめる手は死者の名を疑う根拠に、繊維は後の凶器の追及への備えに。疑惑が9増す、知りすぎが1増す｜注目先で追加の変化あり
- chapter2／freeAction: 左手の筆だこを見る手掛かり「死体のペンだこ」／反論札「死体のペンだこ」｜追加の数値変化なし
- chapter3／choice: ……あなたたちが来なければよかったのに
- chapter3／choice: 左へ――凶器を取る
- chapter3／choice: あなたこそ、歯型のカルテに何をしたの
- chapter4a／choice: 階段の下を見る
- chapter4a／rebuttal: 反証: 夜食の配膳時刻表第一章・厨房で配膳の刻限を覚えるで得た札 ／ 効き目：強力 ／ 露見時：疑い +8 ／ 使うと配膳時刻を自分でずらしたことが露見する
- chapter4a／rebuttal: 転嫁: 藤乃の濡れた裾を証言する効き目：強力 ／ 🕯 良心を削る
- chapter4a／rebuttal: 反証: 凶器の傷の向きを言い当てる効き目：強力 ／ 👁 知りすぎを疑われる ／ 疑いが濃くなる ／ 知りすぎを承知で決定打を出す
- chapter4a／rebuttal: 反証: 脅迫状の消印控え第一章・剛蔵の部屋で指示書の注記を読むで得た札 ／ 効き目：強力 ／ 露見時：疑い +8 ／ 使うと脅迫状の消印を自分で整えたことが露見する
- chapter4a／rebuttal: 転嫁: 計画書三通の差異第二章・計画書の照合で得た札 ／ 効き目：手応えあり ／ 🕯 良心を削る ／ 露見時：疑い +8 ／ 使うと共犯者ごとの偽の頁を作っていたことが露見する
- chapter4a／rebuttal: 反証: 崩れた柵の内側の足跡を語る効き目：強力 ／ 👁 知りすぎを疑われる ／ 疑いが濃くなる
- chapter4a／rebuttal: 反証: 診察時刻の控え第二章・控えカルテの時刻を読むで得た札 ／ 効き目：強力 ／ 露見時：疑い +10 ／ 使うと死因を知る時刻を自分でずらしたことが露見する
- chapter4a／choice: 挙手して割り込む
- chapter4a／choice: 悟郎の声を遮って読み上げる
- chapter4a／jointReasoning: 私は死んでいた君たちは私の死体を見た。全員がだ
- chapter4a／jointReasoning: コウナンに任せる主張は崩せる／動揺は増えない

盤の判断数: 19。警告: 0件。

## mikiri

- prologue／choice: 時刻だけを書き留める
- prologue／choice: 暖炉から遠い席に座る
- prologue／choice: 指先まで注視する
- prologue／choice: 片付けを手伝う
- chapter1／choice: 白湯を取りに行った、と答える
- chapter1／freeAction: 厨房から昨夜の足取りを辿る配膳は明日の尋問に、雨靴の控えは後の足跡の追及に。疑惑が6増す｜注目先で追加の変化あり
- chapter1／freeAction: 配膳の刻限を覚える手掛かり「配膳の当番メモ」／反論札「配膳の当番メモ」／反論札「厨房の献立表」／反論札「夜食の配膳時刻表」｜追加の数値変化なし
- chapter1／freeAction: 洗濯室で志津の記憶を聞く明日、志津さんを責める前に、震えの理由を思い出せる。良心が1増す｜注目先で追加の変化あり
- chapter1／freeAction: 地下の音をたずねる手掛かり「地下の物音」｜警戒が1増す
- chapter1／freeAction: 二階廊下から壁と裏道を探る壁の空白は館内の退路に、旧道は館を離れる足掛かりに。疑惑が5増す｜注目先で追加の変化あり
- chapter1／freeAction: 壁の寸法を測る手掛かり「寸法の不一致」｜追加の数値変化なし
- chapter1／freeAction: 剛蔵の部屋で指示書を盗み見る明日の尋問で、兄さんも珈琲に近づいたと言える。疑惑が6増す、信頼が1下がる｜注目先で追加の変化あり
- chapter1／freeAction: 唄の時刻を照合する手掛かり「他人の計画書」｜疑惑が2下がる
- chapter2／choice: 黙って下がる
- chapter2／rebuttal: 転嫁: 珈琲なら誰でも触れたはず効き目：手応えあり
- chapter2／rebuttal: 転嫁: 剛蔵兄さんが後からポットに近づいた効き目：強力 ／ 🤝 誰かの信頼を失う ／ 兄へ疑いを向けて追及をそらす
- chapter2／rebuttal: 沈黙: 沈黙する効き目：悟郎の確信は変わらない
- chapter2／freeAction: 談話室で昨日の証言を整える後の尋問で知りすぎを疑われる危険を薄め、信頼か疑いを整える。良心が1下がる｜注目先で追加の変化あり
- chapter2／freeAction: 蘭子と昨日の動線を確かめる手掛かり・反論札なし｜知りすぎが1下がる、信頼が5増す
- chapter2／freeAction: 旧道の道標と五番の唄を照合する道筋は館を離れる足掛かりに、目撃の控えは後の追及への備えに。疑惑が3増す｜注目先で追加の変化あり
- chapter2／freeAction: 赤鉛筆の山道を辿る手掛かり「三里先の旧道」／反論札「猟師の目撃メモ」｜疑惑が1増す
- chapter2／freeAction: 安置室で死者の手を確かめる手は死者の名を疑う根拠に、繊維は後の凶器の追及への備えに。疑惑が9増す、知りすぎが1増す｜注目先で追加の変化あり
- chapter2／freeAction: 爪の根元の黒さを読む反論札「替え布の繊維鑑定」｜警戒が1増す
- chapter2／freeAction: 厨房で夜食と余った茶を調べるこの後、唄と事件を並べるとき、夜食か余った一杯を思い返せる。良心が1増す｜注目先で追加の変化あり
- chapter2／freeAction: 余った朝の茶葉を嗅ぐ手掛かり・反論札なし｜良心が1増す、信頼が3増す
- chapter3／choice: ……あなたたちが来なければよかったのに
- chapter3／choice: 右へ――少年の部屋の扉を叩く
- chapter3／choice: このまま扉を叩く
- chapter3／choice: あの唄を書いた人に、会ってみたくなったの
- chapter4b／choice: 部屋に籠る
- chapter4b／choice: 危険を承知で扉を開ける
- chapter4b／rebuttal: 転嫁: 私だけを消す理由を問う効き目：手応えあり
- chapter4b／rebuttal: 沈黙: 目をそらす効き目：逆効果（悟郎の確信が上がる）
- chapter4b／rebuttal: 沈黙: 宇野の目を待つ効き目：逆効果（悟郎の確信が上がる）
- chapter4b／choice: コウ君へ原稿を投げる

盤の判断数: 17。警告: 0件。

## shoshinsha

- prologue／choice: 時刻だけを書き留める
- prologue／choice: 少年の近くに座る
- prologue／choice: 口上を聞き流す
- prologue／choice: 片付けを手伝う
- chapter1／choice: 白湯を取りに行った、と答える
- chapter1／freeAction: 談話室で探偵の手順を覚える明日の尋問で、沈黙が通る順序か、少年が疑う答えを読める。疑惑が4増す、警戒が1増す｜注目先で追加の変化あり
- chapter1／freeAction: 悟郎の聞く順番を数える手掛かり・反論札なし｜追加の数値変化なし
- chapter1／freeAction: 洗濯室で志津の記憶を聞く明日、志津さんを責める前に、震えの理由を思い出せる。良心が1増す｜注目先で追加の変化あり
- chapter1／freeAction: 震える指先を見る手掛かり・反論札なし｜信頼が5増す
- chapter1／freeAction: 剛蔵の部屋で指示書を盗み見る明日の尋問で、兄さんも珈琲に近づいたと言える。疑惑が6増す、信頼が1下がる｜注目先で追加の変化あり
- chapter1／freeAction: 余白の注記まで読む手掛かり「他人の計画書」／反論札「脅迫状の消印控え」｜警戒が1増す
- chapter1／freeAction: 書斎で初版本の痕を読む消し跡か綴じの違いを、明日の少年への言葉にできる。疑惑が10増す｜注目先で追加の変化あり
- chapter1／freeAction: 最終章の綴じを見る手掛かり・反論札なし｜知りすぎが1増す、信頼が3増す
- chapter2／choice: 手元を見る
- chapter2／rebuttal: 転嫁: 珈琲なら誰でも触れたはず観察で知った悟郎の手順：運び手を先に問えば、確信をさらに3下げられる。 ／ 効き目：手応えあり
- chapter2／rebuttal: 沈黙: 沈黙する効き目：逆効果（悟郎の確信が上がる）
- chapter2／rebuttal: 反証: 食後の後片付けプロローグ・片付けを手伝うで得た札 ／ 効き目：強力
- chapter2／freeAction: 談話室で昨日の証言を整える後の尋問で知りすぎを疑われる危険を薄め、信頼か疑いを整える。良心が1下がる｜注目先で追加の変化あり
- chapter2／freeAction: 悟郎の聞き取り順に答え直す手掛かり・反論札なし｜知りすぎが1下がる、疑惑が5下がる、警戒が3増す
- chapter2／freeAction: 佐伯の部屋で歯型の記録を問う控えか証言を持てば、後で死者の名を決めた照合を問い直せる。疑惑が5増す｜注目先で追加の変化あり
- chapter2／freeAction: 佐伯先生の言いよどみを読む手掛かり「カルテ改ざんの証言」｜疑惑が3増す
- chapter2／freeAction: 書斎で恩田の書き込みを辿る消された名は作者を問う根拠に、筆圧は後の計画書の追及への備えに。疑惑が6増す｜注目先で追加の変化あり
- chapter2／freeAction: 余白の鉛筆を追う手掛かり「献辞の消し跡」｜追加の数値変化なし
- chapter2／freeAction: 厨房で夜食と余った茶を調べるこの後、唄と事件を並べるとき、夜食か余った一杯を思い返せる。良心が1増す｜注目先で追加の変化あり
- chapter2／freeAction: 余った朝の茶葉を嗅ぐ手掛かり・反論札なし｜良心が1増す、信頼が3増す
- chapter3／choice: 無言で会釈する
- chapter3／choice: 右へ――少年の部屋の扉を叩く
- chapter3／choice: 本にメモを挟む
- chapter3／choice: 明日の私は、もう別の人間だもの
- chapter4b／choice: コウナンの側を離れない
- chapter4b／jointReasoning: あの男は存在しない食事の件はもう答えた。管理人に聞けばいい
- chapter4b／jointReasoning: コウナンに任せる主張は崩せる／動揺は増えない
- chapter4b／jointReasoning: 私は死んでいた君たちは私の死体を見た。全員がだ
- chapter4b／jointReasoning: コウナンに任せる主張は崩せる／動揺は増えない
- chapter4b／jointReasoning: 私は死んでいた歯型の照合は済んでいる。医学が私の死を証明した
- chapter4b／jointReasoning: コウナンに任せる主張は崩せる／動揺は増えない
- chapter4b／jointReasoning: 私は死んでいた生きた私はどこにいた？ 三日間、誰も私を見ていない
- chapter4b／jointReasoning: コウナンに任せる主張は崩せる／動揺は増えない
- chapter4b／jointReasoning: 物語は私のものだ原稿は私の直筆だ。筆跡鑑定でもするかね
- chapter4b／jointReasoning: コウナンに任せる主張は崩せる／動揺は増えない
- chapter4b／jointReasoning: あの男は存在しない霧原律？ 四十年前に谷へ落ちた男だろう
- chapter4b／jointReasoning: コウナンに任せる主張は崩せる／動揺は増えない
- chapter4b／jointReasoning: あの男は存在しない地下室？ あれはただの物置だ
- chapter4b／jointReasoning: 自分が暴く（カード提示）
- chapter4b／jointReasoning: 物語は私のものだあの唄は土地で採集したものだ
- chapter4b／jointReasoning: コウナンに任せる主張は崩せる／動揺は増えない
- chapter4b／jointReasoning: 物語は私のものだ最終章の改稿は推敲だ。結末を書き直すのも作者の権利だよ
- chapter4b／jointReasoning: コウナンに任せる主張は崩せる／動揺は増えない
- chapter4b／jointReasoning: 物語は私のものだでは、作者は誰だと言うのだ。名前が、あるのか
- chapter4b／jointReasoning: 自分が暴く（カード提示）
- chapter4b／jointReasoning: 罪は君たちのものだ手を下したのは君たちだ。私は誰も殺せとは書いていない
- chapter4b／jointReasoning: 自分が暴く（カード提示）
- chapter4b／choice: 何も言えない

盤の判断数: 38。警告: 0件。

## danzai

- prologue／choice: 時刻だけを書き留める
- prologue／choice: 暖炉から遠い席に座る
- prologue／choice: 指先まで注視する
- prologue／choice: 片付けを手伝う
- chapter1／choice: 曖昧に笑って答えを遅らせる
- chapter1／freeAction: 洗濯室で志津の記憶を聞く明日、志津さんを責める前に、震えの理由を思い出せる。良心が1増す｜注目先で追加の変化あり
- chapter1／freeAction: 地下の音をたずねる手掛かり「地下の物音」｜警戒が1増す
- chapter1／freeAction: 談話室で探偵の手順を覚える明日の尋問で、沈黙が通る順序か、少年が疑う答えを読める。疑惑が4増す、警戒が1増す｜注目先で追加の変化あり
- chapter1／freeAction: コウ君の靴の読み方を見る手掛かり・反論札なし｜警戒が1増す
- chapter1／freeAction: 二階廊下から壁と裏道を探る壁の空白は館内の退路に、旧道は館を離れる足掛かりに。疑惑が5増す｜注目先で追加の変化あり
- chapter1／freeAction: 笹の向こうの旧道を見る手掛かり「三里先の旧道」｜疑惑が3増す
- chapter1／freeAction: 書斎で初版本の痕を読む消し跡か綴じの違いを、明日の少年への言葉にできる。疑惑が10増す｜注目先で追加の変化あり
- chapter1／freeAction: 献辞の頁を光にかざす手掛かり「献辞の消し跡」｜追加の数値変化なし
- chapter2／choice: 黙って下がる
- chapter2／rebuttal: 反証: 毒は寝酒の方では？観察で知ったコウ君の読み方：言い方を整え、疑惑の増加を3抑える。それでも手口を知りすぎていることは隠せない。 ／ 効き目：強力 ／ 👁 知りすぎを疑われる ／ 疑いが濃くなる ／ 詳細を知りすぎる危険な切り返し
- chapter2／rebuttal: 沈黙: 沈黙する効き目：逆効果（悟郎の確信が上がる）
- chapter2／rebuttal: 沈黙: 沈黙する効き目：逆効果（悟郎の確信が上がる）
- chapter2／freeAction: 旧道の道標と五番の唄を照合する道筋は館を離れる足掛かりに、目撃の控えは後の追及への備えに。疑惑が3増す｜注目先で追加の変化あり
- chapter2／freeAction: 赤鉛筆の山道を辿る手掛かり「三里先の旧道」／反論札「猟師の目撃メモ」｜疑惑が1増す
- chapter2／freeAction: 談話室で昨日の証言を整える後の尋問で知りすぎを疑われる危険を薄め、信頼か疑いを整える。良心が1下がる｜注目先で追加の変化あり
- chapter2／freeAction: 悟郎の聞き取り順に答え直す手掛かり・反論札なし｜知りすぎが1下がる、疑惑が5下がる、警戒が3増す
- chapter2／freeAction: 書斎で恩田の書き込みを辿る消された名は作者を問う根拠に、筆圧は後の計画書の追及への備えに。疑惑が6増す｜注目先で追加の変化あり
- chapter2／freeAction: 最終章の紙を撫で比べる反論札「筆圧比較メモ」｜警戒が1増す
- chapter2／freeAction: 佐伯の部屋で歯型の記録を問う控えか証言を持てば、後で死者の名を決めた照合を問い直せる。疑惑が5増す｜注目先で追加の変化あり
- chapter2／freeAction: 複写紙の端を覚える手掛かり「控えカルテ」／反論札「控えカルテ」／反論札「診察時刻の控え」｜追加の数値変化なし
- chapter3／choice: ……あなたたちが来なければよかったのに
- chapter3／choice: 右へ――少年の部屋の扉を叩く
- chapter3／choice: このまま扉を叩く
- chapter3／choice: あの唄を書いた人に、会ってみたくなったの
- chapter4b／choice: 共犯者のふりをして準備を続ける
- chapter4b／jointReasoning: 罪は君たちのものだ手を下したのは君たちだ。私は誰も殺せとは書いていない
- chapter4b／jointReasoning: 証明を終えずに対峙を閉じる
- chapter4b／choice: あなたを絶対に許さない

盤の判断数: 3。警告: 0件。
