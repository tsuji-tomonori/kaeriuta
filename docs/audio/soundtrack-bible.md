# 『帰り唄 ―手毬唄の館―』音楽設計

親課題は #21。各曲の制作条件と物語上の役割は #22〜#37 に対応する。

## 共通語彙

- 主動機: `D–F–E–C | D–A–G–D`。タイトルと通常場面では終止を避け、B-1 と ED だけで全形を解決する。
- 和声: D minor を館・罪・閉鎖、D Dorian の B natural を真実へ進む微かな光として使う。
- 音色: フェルト／ミュートピアノ、チェロ／ヴィオラ／弦、クラリネット／低音クラリネット／アルトフルート、暖色系パッド、木・皮を想定した柔らかな打音。
- 台詞優先: 中域を密集させず、高域の打鍵アタックと定常ピークを抑える。短い SE の間はランタイム側で BGM と環境音を軽くダッキングする。

## 曲ごとの変形

| Issue | ID | 役割 | 動機 |
|---|---|---|---|
| #23 | `bgm_title` | 雨の館と未読の結末 | 最終音を欠く |
| #24 | `bgm_arrival` | 懐かしさと計画開始 | 断片 |
| #26 | `bgm_mansion` | 館が見ている静けさ | 低音へ隠す |
| #28 | `bgm_storm` | 孤立と被害の圧力 | 圧縮形 |
| #29 | `bgm_inquiry` | 沈黙と観察 | 問いで止める |
| #27 | `bgm_reasoning` | 結合の快感と危険 | 半音変形 |
| #30〜#36 | `bgm_end_*` | 7 種の結末 | 各結末固有の欠落・反転・接近・解決 |
| #37 | `bgm_credits` | 正しい名へ物語を返す | 完全形 |

## 技術契約

- BGM は 48 kHz / stereo / Ogg Vorbis。ED 以外は継ぎ目のあるフェードを使わないループ。
- 通常 BGM は -24 LUFS-I、各 END は -23 LUFS-I、ED は -21 LUFS-I。true peak は -2 dBTP 以下。
- 環境音は -28 LUFS-I 以下、SE は -21 LUFS-I 前後を基準とし、2–5 kHz の細い定常音や無制限な高域クリックを避ける。
- `tools/audio/render.sh [track-id...]` で BGM を再生成し、`tools/音源生成.sh` で全 BGM・環境音・SE を再生成する。
- `python3 tools/audio/check_audio.py` で参照、形式、ラウドネス、ステレオ差、ループ境界を検査する。

## 編集可能な納品物

各曲の `assets/audio/source/<track-id>/` に Standard MIDI と cue sheet を置く。音色は
`tools/audio/render_soundtrack.py` の楽器関数として再現でき、外部サンプルがなくても同一 seed で再生成できる。
MIDI を LMMS などへ読み込めば、Surge XT や任意の SoundFont へ置換可能である。
