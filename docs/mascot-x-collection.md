# ライ・リイ：公開投稿の画像収集

2026年11月10日、ユーザー指定の「ログインせず公開範囲で収集」に基づき、防衛省公式X `@ModJapan_jp` と作品公式X `@efp_official` の関連投稿を調査した。

- 検索結果のページ送り、年別検索、キャラクター名・大会ハッシュタグ検索、投稿内の引用・参照先の追跡で、候補投稿119件を確認。
- 静止画・動画サムネイル172件を取得し、重複を除く168点を目視確認。ライ・リイが写っている52点を保存した。これらは37投稿・53添付画像に対応する。同じ画像の再投稿は保存ファイルを共用する。
- 既存分を含め、公式サイトの原本7点と合わせて公式画像は59ファイル。今回の収集で既存分から47ファイル増えた。
- 保存先：`public/assets/mascots/official/x/`。原本は切り抜き・縮小・文字削除をせずに保存。説明文、公式の二次創作ガイドライン画像、コラボの他作品キャラクターが含まれる画像も、そのまま保存した。
- メタデータ：[画像と出典の一覧](mascot-source-manifest.json)、[検索・投稿・画像確認の記録](mascot-collection-audit.json)。投稿日時はXの公開投稿データで確認した値を使用し、検索結果の推定日付は採用していない。

## 確認範囲の限界

Xの検索ページとメディア一覧はログイン画面に遷移し、ログインなしで全タイムラインの終端までは確認できなかった。公開検索のページ送りと参照リンクを辿って見つかった候補をすべて確認したが、検索に出ない投稿、削除・非公開の投稿、画像本文だけでキャラクターに言及する未発見の投稿が残る可能性がある。「公式アカウントの全投稿を確認済み」という意味ではない。

候補の公開投稿データは2022年7月5日〜2026年11月10日。保存したマスコット画像の掲載投稿は2025年12月26日〜2026年11月10日。動画はサムネイルを確認し、全フレームの収集は行っていない。今回追加した画像は素材としての保存で、体験画面への新たな組み込み・公開反映はしていない。

## 画像をまとめて確認

プレビューは一覧確認用の縮小表示で、保存した原本とは別ファイル。

![収集画像一覧・前半](mascot-previews/official-x-1.jpg)

![収集画像一覧・後半](mascot-previews/official-x-2.jpg)

## 保存画像と投稿

表の日付は日本時間。ファイルを開くと原本を確認できる。

| No. | JST date   | Image                                                                                                                | Source post                                                                                  | Size        |
| --- | ---------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------- |
| 01  | 2025-12-26 | [modjapan_jp-2004382943301787930-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2004382943301787930-1.jpg)   | [@ModJapan_jp / 2004382943301787930](https://x.com/ModJapan_jp/status/2004382943301787930)   | 1040 x 720  |
| 02  | 2025-12-26 | [modjapan_jp-2004483430478909660-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2004483430478909660-1.jpg)   | [@ModJapan_jp / 2004483430478909660](https://x.com/ModJapan_jp/status/2004483430478909660)   | 1040 x 720  |
| 03  | 2025-12-26 | [modjapan_jp-2004484782055669831-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2004484782055669831-1.jpg)   | [@ModJapan_jp / 2004484782055669831](https://x.com/ModJapan_jp/status/2004484782055669831)   | 1040 x 720  |
| 04  | 2026-01-05 | [modjapan_jp-2008006591778595103-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2008006591778595103-1.jpg)   | [@ModJapan_jp / 2008006591778595103](https://x.com/ModJapan_jp/status/2008006591778595103)   | 637 x 899   |
| 05  | 2026-01-05 | [modjapan_jp-2008011419573530745-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2008011419573530745-1.jpg)   | [@ModJapan_jp / 2008011419573530745](https://x.com/ModJapan_jp/status/2008011419573530745)   | 1040 x 720  |
| 06  | 2026-01-09 | [modjapan_jp-2009467589622419731-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2009467589622419731-1.jpg)   | [@ModJapan_jp / 2009467589622419731](https://x.com/ModJapan_jp/status/2009467589622419731)   | 1040 x 720  |
| 07  | 2026-01-09 | [modjapan_jp-2009467589622419731-2.jpg](../public/assets/mascots/official/x/modjapan_jp-2009467589622419731-2.jpg)   | [@ModJapan_jp / 2009467589622419731](https://x.com/ModJapan_jp/status/2009467589622419731)   | 1040 x 720  |
| 08  | 2026-01-09 | [modjapan_jp-2009467589622419731-3.jpg](../public/assets/mascots/official/x/modjapan_jp-2009467589622419731-3.jpg)   | [@ModJapan_jp / 2009467589622419731](https://x.com/ModJapan_jp/status/2009467589622419731)   | 1040 x 720  |
| 09  | 2026-01-09 | [modjapan_jp-2009540351204446587-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2009540351204446587-1.jpg)   | [@ModJapan_jp / 2009540351204446587](https://x.com/ModJapan_jp/status/2009540351204446587)   | 720 x 1040  |
| 10  | 2026-01-13 | [modjapan_jp-2011027073494892753-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2011027073494892753-1.jpg)   | [@ModJapan_jp / 2011027073494892753](https://x.com/ModJapan_jp/status/2011027073494892753)   | 1040 x 720  |
| 11  | 2026-01-14 | [modjapan_jp-2011305213190394177-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2011305213190394177-1.jpg)   | [@ModJapan_jp / 2011305213190394177](https://x.com/ModJapan_jp/status/2011305213190394177)   | 1040 x 720  |
| 12  | 2026-01-14 | [modjapan_jp-2011386157943439619-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2011386157943439619-1.jpg)   | [@ModJapan_jp / 2011386157943439619](https://x.com/ModJapan_jp/status/2011386157943439619)   | 1040 x 720  |
| 13  | 2026-01-14 | [modjapan_jp-2011386157943439619-2.jpg](../public/assets/mascots/official/x/modjapan_jp-2011386157943439619-2.jpg)   | [@ModJapan_jp / 2011386157943439619](https://x.com/ModJapan_jp/status/2011386157943439619)   | 1040 x 720  |
| 14  | 2026-01-14 | [modjapan_jp-2011386157943439619-3.jpg](../public/assets/mascots/official/x/modjapan_jp-2011386157943439619-3.jpg)   | [@ModJapan_jp / 2011386157943439619](https://x.com/ModJapan_jp/status/2011386157943439619)   | 1040 x 720  |
| 15  | 2026-09-15 | [modjapan_jp-2099682866359644667-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2099682866359644667-1.jpg)   | [@ModJapan_jp / 2099682866359644667](https://x.com/ModJapan_jp/status/2099682866359644667)   | 1040 x 720  |
| 16  | 2026-09-16 | [modjapan_jp-2100045254129074687-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2100045254129074687-1.jpg)   | [@ModJapan_jp / 2100045254129074687](https://x.com/ModJapan_jp/status/2100045254129074687)   | 1040 x 720  |
| 17  | 2026-09-17 | [modjapan_jp-2100407642179166379-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2100407642179166379-1.jpg)   | [@ModJapan_jp / 2100407642179166379](https://x.com/ModJapan_jp/status/2100407642179166379)   | 1040 x 720  |
| 18  | 2026-09-18 | [modjapan_jp-2100770029818228921-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2100770029818228921-1.jpg)   | [@ModJapan_jp / 2100770029818228921](https://x.com/ModJapan_jp/status/2100770029818228921)   | 1040 x 720  |
| 19  | 2026-09-19 | [efp_official-2101122100182294554-1.jpg](../public/assets/mascots/official/x/efp_official-2101122100182294554-1.jpg) | [@efp_official / 2101122100182294554](https://x.com/efp_official/status/2101122100182294554) | 849 x 1200  |
| 20  | 2026-09-19 | [efp_official-2101122855044030835-1.jpg](../public/assets/mascots/official/x/efp_official-2101122855044030835-1.jpg) | [@efp_official / 2101122855044030835](https://x.com/efp_official/status/2101122855044030835) | 1200 x 1200 |
| 21  | 2026-09-19 | [modjapan_jp-2101132417893380582-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2101132417893380582-1.jpg)   | [@ModJapan_jp / 2101132417893380582](https://x.com/ModJapan_jp/status/2101132417893380582)   | 1450 x 2048 |
| 22  | 2026-09-24 | [modjapan_jp-2102944357179674943-2.jpg](../public/assets/mascots/official/x/modjapan_jp-2102944357179674943-2.jpg)   | [@ModJapan_jp / 2102944357179674943](https://x.com/ModJapan_jp/status/2102944357179674943)   | 1040 x 720  |
| 23  | 2026-09-24 | [modjapan_jp-2102944357179674943-3.jpg](../public/assets/mascots/official/x/modjapan_jp-2102944357179674943-3.jpg)   | [@ModJapan_jp / 2102944357179674943](https://x.com/ModJapan_jp/status/2102944357179674943)   | 1040 x 720  |
| 24  | 2026-09-25 | [modjapan_jp-2103306745179255009-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2103306745179255009-1.jpg)   | [@ModJapan_jp / 2103306745179255009](https://x.com/ModJapan_jp/status/2103306745179255009)   | 1040 x 720  |
| 25  | 2026-10-01 | [modjapan_jp-2105481072435970332-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2105481072435970332-1.jpg)   | [@ModJapan_jp / 2105481072435970332](https://x.com/ModJapan_jp/status/2105481072435970332)   | 1040 x 720  |
| 26  | 2026-10-01 | [modjapan_jp-2105481072435970332-2.jpg](../public/assets/mascots/official/x/modjapan_jp-2105481072435970332-2.jpg)   | [@ModJapan_jp / 2105481072435970332](https://x.com/ModJapan_jp/status/2105481072435970332)   | 1040 x 720  |
| 27  | 2026-10-05 | [modjapan_jp-2106930624141615357-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2106930624141615357-1.jpg)   | [@ModJapan_jp / 2106930624141615357](https://x.com/ModJapan_jp/status/2106930624141615357)   | 1040 x 720  |
| 28  | 2026-10-16 | [modjapan_jp-2110916891065622624-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2110916891065622624-1.jpg)   | [@ModJapan_jp / 2110916891065622624](https://x.com/ModJapan_jp/status/2110916891065622624)   | 1040 x 720  |
| 29  | 2026-10-19 | [modjapan_jp-2112004053681275143-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2112004053681275143-1.jpg)   | [@ModJapan_jp / 2112004053681275143](https://x.com/ModJapan_jp/status/2112004053681275143)   | 1040 x 720  |
| 30  | 2026-10-20 | [modjapan_jp-2112366441617879477-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2112366441617879477-1.jpg)   | [@ModJapan_jp / 2112366441617879477](https://x.com/ModJapan_jp/status/2112366441617879477)   | 1040 x 720  |
| 31  | 2026-10-21 | [modjapan_jp-2112728829605433530-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2112728829605433530-1.jpg)   | [@ModJapan_jp / 2112728829605433530](https://x.com/ModJapan_jp/status/2112728829605433530)   | 1040 x 720  |
| 32  | 2026-10-21 | [modjapan_jp-2112728829605433530-2.jpg](../public/assets/mascots/official/x/modjapan_jp-2112728829605433530-2.jpg)   | [@ModJapan_jp / 2112728829605433530](https://x.com/ModJapan_jp/status/2112728829605433530)   | 1040 x 720  |
| 33  | 2026-10-22 | [modjapan_jp-2113091217424863510-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2113091217424863510-1.jpg)   | [@ModJapan_jp / 2113091217424863510](https://x.com/ModJapan_jp/status/2113091217424863510)   | 1040 x 720  |
| 34  | 2026-10-23 | [modjapan_jp-2113453605219160373-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2113453605219160373-1.jpg)   | [@ModJapan_jp / 2113453605219160373](https://x.com/ModJapan_jp/status/2113453605219160373)   | 1040 x 720  |
| 35  | 2026-10-26 | [modjapan_jp-2114540768874688945-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2114540768874688945-1.jpg)   | [@ModJapan_jp / 2114540768874688945](https://x.com/ModJapan_jp/status/2114540768874688945)   | 1040 x 720  |
| 36  | 2026-10-28 | [modjapan_jp-2115265544731676921-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2115265544731676921-1.jpg)   | [@ModJapan_jp / 2115265544731676921](https://x.com/ModJapan_jp/status/2115265544731676921)   | 1040 x 720  |
| 37  | 2026-10-29 | [modjapan_jp-2115627932400209929-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2115627932400209929-1.jpg)   | [@ModJapan_jp / 2115627932400209929](https://x.com/ModJapan_jp/status/2115627932400209929)   | 1040 x 720  |
| 38  | 2026-10-30 | [modjapan_jp-2115990320383226046-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2115990320383226046-1.jpg)   | [@ModJapan_jp / 2115990320383226046](https://x.com/ModJapan_jp/status/2115990320383226046)   | 1040 x 720  |
| 39  | 2026-10-30 | [modjapan_jp-2115990320383226046-2.jpg](../public/assets/mascots/official/x/modjapan_jp-2115990320383226046-2.jpg)   | [@ModJapan_jp / 2115990320383226046](https://x.com/ModJapan_jp/status/2115990320383226046)   | 1040 x 720  |
| 40  | 2026-11-04 | [modjapan_jp-2117802259744694422-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2117802259744694422-1.jpg)   | [@ModJapan_jp / 2117802259744694422](https://x.com/ModJapan_jp/status/2117802259744694422)   | 1040 x 720  |
| 41  | 2026-11-04 | [modjapan_jp-2117802259744694422-2.jpg](../public/assets/mascots/official/x/modjapan_jp-2117802259744694422-2.jpg)   | [@ModJapan_jp / 2117802259744694422](https://x.com/ModJapan_jp/status/2117802259744694422)   | 1040 x 720  |
| 42  | 2026-11-05 | [modjapan_jp-2118164647534600421-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2118164647534600421-1.jpg)   | [@ModJapan_jp / 2118164647534600421](https://x.com/ModJapan_jp/status/2118164647534600421)   | 1040 x 720  |
| 43  | 2026-11-05 | [modjapan_jp-2118164647534600421-2.jpg](../public/assets/mascots/official/x/modjapan_jp-2118164647534600421-2.jpg)   | [@ModJapan_jp / 2118164647534600421](https://x.com/ModJapan_jp/status/2118164647534600421)   | 1040 x 720  |
| 44  | 2026-11-05 | [modjapan_jp-2118164647534600421-3.jpg](../public/assets/mascots/official/x/modjapan_jp-2118164647534600421-3.jpg)   | [@ModJapan_jp / 2118164647534600421](https://x.com/ModJapan_jp/status/2118164647534600421)   | 1450 x 2048 |
| 45  | 2026-11-06 | [modjapan_jp-2118527035391791585-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2118527035391791585-1.jpg)   | [@ModJapan_jp / 2118527035391791585](https://x.com/ModJapan_jp/status/2118527035391791585)   | 1040 x 720  |
| 46  | 2026-11-06 | [modjapan_jp-2118527035391791585-2.jpg](../public/assets/mascots/official/x/modjapan_jp-2118527035391791585-2.jpg)   | [@ModJapan_jp / 2118527035391791585](https://x.com/ModJapan_jp/status/2118527035391791585)   | 1040 x 720  |
| 47  | 2026-11-09 | [modjapan_jp-2119614252394889636-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2119614252394889636-1.jpg)   | [@ModJapan_jp / 2119614252394889636](https://x.com/ModJapan_jp/status/2119614252394889636)   | 1040 x 720  |
| 48  | 2026-11-09 | [modjapan_jp-2119614252394889636-2.jpg](../public/assets/mascots/official/x/modjapan_jp-2119614252394889636-2.jpg)   | [@ModJapan_jp / 2119614252394889636](https://x.com/ModJapan_jp/status/2119614252394889636)   | 1040 x 720  |
| 49  | 2026-11-09 | [modjapan_jp-2119614252394889636-3.jpg](../public/assets/mascots/official/x/modjapan_jp-2119614252394889636-3.jpg)   | [@ModJapan_jp / 2119614252394889636](https://x.com/ModJapan_jp/status/2119614252394889636)   | 1040 x 720  |
| 50  | 2026-11-10 | [modjapan_jp-2119976586984255870-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2119976586984255870-1.jpg)   | [@ModJapan_jp / 2119976586984255870](https://x.com/ModJapan_jp/status/2119976586984255870)   | 1040 x 720  |
| 51  | 2026-11-10 | [modjapan_jp-2119976586984255870-2.jpg](../public/assets/mascots/official/x/modjapan_jp-2119976586984255870-2.jpg)   | [@ModJapan_jp / 2119976586984255870](https://x.com/ModJapan_jp/status/2119976586984255870)   | 1040 x 720  |
| 52  | 2026-11-10 | [modjapan_jp-2120115753852825966-1.jpg](../public/assets/mascots/official/x/modjapan_jp-2120115753852825966-1.jpg)   | [@ModJapan_jp / 2120115753852825966](https://x.com/ModJapan_jp/status/2120115753852825966)   | 1040 x 720  |
