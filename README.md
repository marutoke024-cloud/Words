# 言の葉帖 — Phrase Stock

会議やYouTubeで見聞きした「良い言い回し・話法・相槌」を、思考を止めずにキャプチャし、
和紙調のギャラリーとして蓄積、間隔反復で再提示して定着させるPWA。

Onyx Folio(画像ギャラリー+色参照)の**言語版**という位置づけ。

## 差別化ポイント

1. **キャプチャの入力コストを限界まで下げる** — 必須入力はフレーズ本文の一言だけ。YouTube経由なら動画情報は全自動取得
2. **忘れた頃に自動で再提示** — 「使ったかどうか」のフィードバックを回して、読むだけで終わらせない

## 使い方

### セットアップ(GitHub Pages)

`.github/workflows/pages.yml` により、ブランチへのpushで自動的にGitHub Pagesへデプロイされる
(初回実行時にPagesの有効化も自動で行う)。

- **スマホ**: 公開URLをAndroidのChromeで開き、「ホーム画面に追加」でPWAとしてインストール。
  インストール後、**YouTubeアプリの共有メニューに「言の葉帖」が現れる**(Web Share Target)
- **PC**: そのままブラウザで利用可能。880px以上ではヘッダーナビ+ワイドレイアウトに切り替わる

### キャプチャ(1画面1入力)

キャプチャ画面は**フレーズ入力欄ひとつ**だけ。書いたら Enter(スマホは「拾う」)で即保存。

- **YouTube経由(メイン導線)**: YouTubeアプリで「共有」→「現在の再生位置を共有」にチェック → 言の葉帖を選択。
  URLの `?t=123s` からタイムスタンプを抽出し、oEmbed APIで動画タイトル・チャンネル名・サムネイルを自動取得。
- **URL貼り付け(PC向け)**: フレーズ欄にYouTube URLを貼ると、**URLは本文から自動で抜き出されて出典化**され、
  上部に動画のサムネイル付きで添付される(× で外せる)。「共有 → URLをコピー」したものをそのまま貼ればOK。
- **出典メモ(任意)**: YouTube以外の出典を残したい時だけ「＋出典メモ」を開いて「会議」等を入力。
- **キーボード**: フレーズ欄は Enter で保存・Shift+Enter で改行(日本語変換の確定Enterは誤送信しない)、
  復習は ←/→ で「まだ未使用/使ってみた」、流し見ビューは Esc で閉じる。

キャプチャ時はタグ付け不要(`未整理` のまま保存)。

### 仕分けタイム

未整理の一覧をまとめて表示。**Gemini API(gemini-2.5-flash-lite)がタグ候補(話法/例え/相槌など)を自動提案**。
タップで承認/解除して「整理済み」にするだけ。APIキーは ⚙ 設定から登録(端末のlocalStorageにのみ保存)。

### 復習(間隔反復)

登録から **1日後 → 3日後 → 1週間後** の間隔で自動的に再提示対象になる。

- **まだ未使用** → 間隔を維持(最大7日周期で再提示され続ける)
- **使ってみた** → `used_count` 加算。1回目で30日後まで間隔を大きく空け、2回目で復習から卒業

ホームに「ストック中」「使えた」「連続日数」のサマリーを表示。

### ギャラリー

- **通常ビュー**: 和紙調(背景 `#FAF7EF` / 枠線 `#E5DFC8` / 文字 `#3A3324`、明朝体)の
  CSS columnsによる2カラムマソンリー。上部にタグのピル型フィルター(横スクロール)
- **斜めループビュー**(ヘッダーの ◈): カード列全体を傾け、縦方向に無限ループでスクロール。
  ホイール/スワイプ量をtransformに変換して流れを制御。右上に「現在番号 / 総数」カウンター

## データモデル

IndexedDB(`phrase-stock` / store `phrases`)にローカル保存。

| フィールド | 説明 |
|---|---|
| `id` | UUID |
| `text` | フレーズ本文(唯一の必須入力) |
| `source_type` | `youtube` / `manual` |
| `video_title` `channel` `video_url` `thumbnail_url` | YouTube由来の場合のみ |
| `timestamp_seconds` | 共有URLの `?t=Ns` から抽出した動画内時刻 |
| `source_note` | 手動入力時の出典メモ |
| `tags[]` | 可変長。`話法/切り返し` のようにスラッシュで階層化可 |
| `status` | `未整理` / `整理済み` |
| `created_at` | 登録日時 (epoch ms) |
| `used_count` | 「使ってみた」を押した回数 |
| `next_review_at` | 次回再提示予定日時 (null = 卒業) |
| `srs_step` | 内部: 現在の再提示間隔の段階 |

設定画面からJSONの書き出し/読み込み(バックアップ)が可能。

## 技術スタック

- ビルド不要のバニラJS(ES Modules)PWA — GitHub Pagesにそのまま置ける
- Web Share Target API(`manifest.json` の `share_target`、GETメソッド)
- IndexedDB でローカル永続化
- YouTube oEmbed API(動画メタデータ取得、失敗時は `i.ytimg.com` のサムネイル規則にフォールバック)
- Gemini API(タグ自動提案、キーはユーザー持ち込み)
- Service Worker によるオフラインキャッシュ(stale-while-revalidate)

## ファイル構成

```
index.html        アプリシェル(SPA・ハッシュルーティング)
manifest.json     PWAマニフェスト + share_target
sw.js             Service Worker
css/style.css     和紙調テーマ
js/app.js         ルーター・各画面・斜めループビュー
js/db.js          IndexedDB層
js/youtube.js     共有URL解析・oEmbed
js/srs.js         間隔反復ロジック
js/gemini.js      タグ自動提案
icons/            PWAアイコン
```

---

## 同梱アプリ: Knowledge Room（`room/`）

Global会議用のビジネス英語フレーズを、ローポリの自室に置いた家具（テレビ／本棚／水槽）に
しまっていく3Dの記録アプリ。公開後は `/room/` で開けます。詳細は [`room/README.md`](room/README.md)。
