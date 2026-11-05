# CYBER FIRST STEP

スマホで体験できる、学生企画・非公式の初心者向けCTFです。現在は８問を公開しています。

## 普段の変更はこの３か所

| 変更したいもの                             | 編集するファイル                       |
| ------------------------------------------ | -------------------------------------- |
| 問題文・答え・ヒント・解説・使用画像       | microCMSの「問題」管理画面             |
| 配色・共通フォント・トップの小見出しサイズ | [public/theme.css](public/theme.css)   |
| 余白・ボタン・スマホの配置                 | [public/styles.css](public/styles.css) |

問題画像はmicroCMSへアップロードします。既存の問題画像は `public/assets/` を参照しています。トップや紹介ページの文章は `public/scripts/pages.js`、ヘッダー・フッターの文章は `public/index.html` です。

詳しい手順と各項目の意味は **[運用・編集ガイド](docs/maintenance.md)** にまとめています。

## 起動

Node.js 24を使用します。初回だけ実行してください。

```sh
npm ci
```

```sh
npm run dev
```

http://127.0.0.1:3000 を開きます。問題設定やサーバーを保存すると自動で再起動します。画面はブラウザで再読み込みしてください。CSSだけの変更はサーバー再起動不要です。

ローカルの進捗用署名鍵は初回に `.env.local` へ保存され、再起動でも維持されます。このファイルはGit・公開対象から除外します。

## microCMSの接続準備

サービス・API・読み取り専用キーの作成手順は [microCMS接続ガイド](docs/microcms.md) を参照してください。
`.env.example` の3項目を `.env.local` に追加し、`npm run check:microcms` で接続を確認できます。
問題データはmicroCMSから取得します。`npm run check:microcms:content` で公開済みの問題を検証できます。起動・設定チェック・ビルドには接続設定が必要です。問題の編集と公開の手順は接続ガイドを参照してください。

## 変更後の確認

```sh
npm run check
npm test
npm run build
```

`check` はIDの重複・必須項目・ヒント数・素材の形式・画像ファイルの存在を確認します。設定が不正ならビルドも停止します。画像内の文字と答えが合っているかは、画面で確認してください。

スマホの操作確認は、サーバーを起動したまま別のターミナルで実行します。

```sh
npx playwright install chromium webkit
npm run test:mobile
npm run test:feedback
```

コードを読みやすくそろえる場合は `npm run format`、整形済みか確認する場合は `npm run format:check` を使います。テスト結果は `test-results/` に出力され、Gitには入りません。

## 構成

```text
public/        ブラウザに配信する画面・CSS・画像
  scripts/     表示、素材操作、ダイアログなどの画面処理
server/        回答判定・Cookie・問題設定の検証
api/           Vercel用の入口
scripts/       起動・設定チェック・ビルド
tests/         自動テスト。fixtures/は配信対象外の回帰確認用データ
docs/          運用資料と検証記録
```

`dist/` はビルド結果です。直接編集しません。問題数は設定から計算されるため、問題の追加時に画面・判定処理の数字を書き換える必要はありません。

## 公開運用

Vercelで `CTF_SESSION_SECRET` に32文字以上の秘密値と、microCMSの接続先・読み取りキーを設定します。問題と答えはサーバーからmicroCMSへ取得し、`public/` や `dist/` へコピーしません。

問題の差し替え・進捗の扱い・公開時の注意点は [運用・編集ガイド](docs/maintenance.md)、素材の出典・計測・運用上の制限は [公開運用の詳細](docs/operations.md) を参照してください。
