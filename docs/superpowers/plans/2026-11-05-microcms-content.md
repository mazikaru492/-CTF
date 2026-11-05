# microCMS問題管理 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. No commit, push, deployment, or permission expansion is authorized by this plan.

**Goal:** 既存8問をフォームで管理するmicroCMS用データと、安全な読み取り連携を構築する。

**Architecture:** 取得・変換・検証をサーバーで完結し、各リクエストは1つの問題カタログを使用する。移行完了前はローカル版を維持し、明示的な設定で切り替える。

**Tech Stack:** Node.js 24、既存のJavaScript/CSS、microCMS REST API。追加依存なし。

**Spec:** 本会話で説明済みの構成と、ユーザーの「変更はあなたがしてください」「セキュリティを第一」の依頼。

## Global Constraints

- 実行用キーは対象APIのGETのみ。ブラウザ・ログ・生成物へキーを出さない。
- 既存問題と進捗の互換性を保ち、別内容への変更時は旧進捗を無効化する。
- CMSの不正・未完成・過大データを配信しない。管理画面や権限を実際に変更できない場合は区別して報告する。
- 設定変更は今回の対象のみ。公開環境へ自動デプロイしない。

## Review Focus

- CMS全件取得の打ち切りで問題が欠落しないこと。
- カスタムフィールドの不明な項目や内部情報が問題素材に混入しないこと。
- 外部画像URLで任意ホストへの通信を許さないこと。
- 編集前の画面からの送信で別版の問題を採点しないこと。
- CMS障害時に、無検証の内容やローカルの別問題へ自動切り替えしないこと。

## Tasks

- [x] 1. `server/microcms.mjs` を共通の制限付き取得処理へ整理し、最大32問の全件取得を追加する。先に公開データ・過大データ・途中取得のテストを追加して実行する。
- [x] 2. `server/microcms-catalog.mjs` に `fromMicrocmsQuestions(contents)`、`server/catalog.mjs` に `createCatalogLoader()` を追加する。フォームの素材を既存形式に変換し、既存の検証で確認する。未知情報の除去、未完成データ拒否、版変更、キャッシュ・障害のテストを先に追加する。
- [x] 3. `server/game.mjs` と `public/app.js` を1リクエスト1カタログに対応させ、版が異なる送信は再読み込みを案内する。APIのGET・採点・旧Cookie・版不一致を検証する。
- [x] 4. `server/validate-content.mjs`、`scripts/check.mjs`、`vercel.json` に正規画像ホストへの対応だけを追加する。不正URLの拒否をテストする。
- [x] 5. `scripts/prepare-microcms.mjs` で入力項目JSONと既存問題CSVを `migration/` に生成する。カスタムフィールドを使い、素材をJSONで手入力させない。往復変換で既存問題が一致することを確認する。
- [x] 6. 管理画面で適用可能か確認し、可能なら入力項目・問題データを反映する。不可の場合は必要最小限の操作を具体化し、読み取りキーの権限を勝手に拡大しない。
- [x] 7. `npm test`、`npm run check`、`npm run build`、整形・差分検査、実サービスの接続を確認する。CMS適用後のみ実データの採点・画像表示も確認して切り替える。

## Verification status

2026-11-05。既存APIへ入力項目と13種類のカスタムフィールドを反映し、8問を公開登録。実サービスから取得した8問が元データと完全一致することを確認。ローカルのCTF_CONTENT_SOURCEをmicrocmsに切替済み。

自動テスト44件、問題設定チェック、ビルド、整形・差分検査、実サービスの問題設定検証が成功。Chromeのスマホ幅390pxで全8問を正答し、誤答・ヒント・解説・画像表示・150%拡大・結果・再読み込み後の進捗保存を確認。ブラウザー警告・エラーなし。配信ファイル28個と公開問題レスポンスにAPIキー・セッション秘密情報なし。問題一覧に答え・ヒント・解説・学習内容を含めないことを確認。

画像は既存のローカル素材を参照する移行方式を採用。新規画像をmicroCMSへアップロードした後の実表示は未検証。APIキーの権限拡大なし。コミット・プッシュ・公開環境への反映は未実施。確認用サーバーは http://127.0.0.1:3107 で起動中。
