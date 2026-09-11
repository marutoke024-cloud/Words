# Thinkubator — Global Meeting Phrase Room

Global会議で「いつか使いたい」と思ったビジネス英語フレーズを、**ローポリの自室**に
しまっておくための個人用アプリ。学習アプリではなく **記録簿（ログ）** なので、
ドリル・スコア・テストの類は一切ありません。

公開URL（本ブランチをマージ後、Pagesデプロイで有効になります）:
`https://marutoke024-cloud.github.io/Words/room/`

## 体験の中心：3Dルーム

トップページは三人称視点のローポリの部屋そのものです。UIラベルは最小限で、
「タップして発見する」ことが操作の主体になります。

| オブジェクト | カテゴリ | 挙動 |
|---|---|---|
| テレビ | Small Talk（雑談） | カメラが寄り、ボトムシートにフレーズ一覧 |
| 本棚 | Formal（フォーマルな発言） | 同上 |
| 水槽 | Favorites（お気に入り） | カメラが寄り、**魚1匹＝フレーズ1件**。魚をタップするとそのフレーズが開く |

- ドラッグで部屋を見回し、ピンチ（PCはホイール）で寄り引き
- 緑の恐竜は環境演出として部屋を自律的に歩き回ります（成長・レベルアップ要素なし）
- 家具とカテゴリは**IDだけで疎結合**。カテゴリを増やすときは
  `js/data/categories.js` に1行足し、家具グループに `userData.categoryId` を付けるだけです

## 機能

### フレーズ登録
`+` から本文（英語）を入力し、家具のグリフでカテゴリを選ぶだけ。
フレーズ全体の和訳フィールドはありません（仕様どおり実装していません）。

### 単語タップ辞書
フレーズ内の**任意の単語**がタップできます。

- 意味を登録済みの単語 → アイコンと意味がふわっとフェードインするポップアップ
- 未登録の単語 → その場で意味とアイコン（絵文字）を登録できる小さなエディタ

単語と意味の組は、登録時（プレビュー）でも閲覧時（カード）でも追加・編集・削除できます。

### 今日の一句
起動時に、曜日と時間帯（深夜/朝/昼/夜の4区分）をシードにして保存済みフレーズから
1件をランダムに選び、操作を妨げないトースト表示で提示します。タップでそのフレーズを開きます。
プッシュ通知APIは未使用ですが、選定ロジック（`js/ui/toast.js` の `pickOfTheMoment`）は
そのまま将来のプッシュ配信に流用できる形にしてあります。

## データ

```
Phrase { id, text, category: "tv"|"bookshelf"|"aquarium", createdAt, words: WordNote[] }
WordNote { word, meaning, icon }
```

ブラウザ内の IndexedDB（DB名 `phrase-room` / store `phrases`）に保存します。
永続化は `js/data/indexedDbAdapter.js` に閉じ込めてあり、`js/data/store.js` が公開する
`all / byCategory / get / put / remove` のインターフェースを満たす別実装（Firebase等）に
差し替えれば、UI・3D側を触らずに同期対応へ移行できます。

初回起動時のみ、部屋が空にならないようサンプルフレーズ9件を投入します。

## 技術構成

ビルド不要のバニラ ES Modules（GitHub Pages にそのまま置ける構成）。

```
index.html              アプリシェル
manifest.webmanifest    PWAマニフェスト
sw.js                   Service Worker（シェルをキャッシュしオフライン起動）
css/style.css           夜の紫〜藍のテーマ
js/app.js               画面の配線
js/data/                categories / store / indexedDbAdapter / seed
js/scene/               room（描画ループ・ヒットテスト）/ build / furniture /
                        mascot / fish / controls / palette
js/ui/                  sheet / editor / detail / phraseView / wordPopup / toast / dom
vendor/three.module.js  Three.js r169（MITライセンス、同梱）
```

- 3D: Three.js。モデルは外部アセットではなく**プリミティブから生成**しているため、
  リポジトリに重いglTFを持ちません（ポスター類はCanvasで手続き的に描画）
- アニメーション: CSSトランジション／キーフレームと `requestAnimationFrame`
- ライティング: 半球光＋方向光（影付き）＋各所のポイントライト。
  ブルームの代わりに加算合成のスプライトでにじみを表現しています

## スマホへのインストール

AndroidのChromeで公開URLを開き、メニューから「ホーム画面に追加」。
`display: standalone` なのでアドレスバーなしの単体アプリとして起動します。
バックグラウンドで開き直したときはレンダリングを止め、復帰時に再開します。
