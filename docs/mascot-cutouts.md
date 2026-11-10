# ライ・リイの透過素材

2026-11-10作成。公式サイト・公開X投稿から収集した画像をもとに、背景と文字を除き、輪郭をAIで補整した9点です。公式配布の透過原本ではなく、細部に再描画を含む加工素材です。収集した公式原本は変更していません。

サイト用PNGは長辺768px、高解像度版は生成時の解像度です。白・濃紺・市松模様の背景で、通常の表示サイズに縮小して目視確認しました。すべてRGBA形式で、サイト用画像の四隅は完全透過です。髪・耳・手・しっぽの主要輪郭に切れがないことも確認しています。高解像度版には拡大時に微細な縁の粗さが残る場合があります。

| 素材                                 | サイト用PNG                                                                                      | 高解像度版                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| ライ・手を振る                       | [ライ_笑顔_手を振る](../public/assets/mascots/cutouts/rai/rai-smile-wave.png)                    | [高解像度](mascot-cutout-masters/rai/rai-smile-wave.png)            |
| リイ・手を振る                       | [リイ_手を振る](../public/assets/mascots/cutouts/rii/rii-wave.png)                               | [高解像度](mascot-cutout-masters/rii/rii-wave.png)                  |
| 2人・パソコン                        | [ライとリイ_パソコン](../public/assets/mascots/cutouts/rai-rii/rai-rii-laptop.png)               | [高解像度](mascot-cutout-masters/rai-rii/rai-rii-laptop.png)        |
| 2人・ジャンプ                        | [ライとリイ_笑顔_ジャンプ](../public/assets/mascots/cutouts/rai-rii/rai-rii-smile-jump.png)      | [高解像度](mascot-cutout-masters/rai-rii/rai-rii-smile-jump.png)    |
| ライ・ジャンプ                       | [ライ_笑顔_ジャンプ](../public/assets/mascots/cutouts/rai/rai-smile-jump.png)                    | [高解像度](mascot-cutout-masters/rai/rai-smile-jump.png)            |
| リイ・ジャンプ                       | [リイ_ジャンプ](../public/assets/mascots/cutouts/rii/rii-jump.png)                               | [高解像度](mascot-cutout-masters/rii/rii-jump.png)                  |
| リイ・困った表情（上半身）           | [リイ_困った表情_上半身](../public/assets/mascots/cutouts/rii/rii-worried-upper-body.png)        | [高解像度](mascot-cutout-masters/rii/rii-worried-upper-body.png)    |
| リイ・案内する（指示棒付き）         | [リイ_案内_指示棒](../public/assets/mascots/cutouts/rii/rii-guide-pointer.png)                   | [高解像度](mascot-cutout-masters/rii/rii-guide-pointer.png)         |
| ライ・申し訳なさそうな表情（上半身） | [ライ_申し訳ない表情_上半身](../public/assets/mascots/cutouts/rai/rai-apologetic-upper-body.png) | [高解像度](mascot-cutout-masters/rai/rai-apologetic-upper-body.png) |

確認画像：[一覧1](mascot-previews/cutouts-1.jpg)、[一覧2](mascot-previews/cutouts-2.jpg)、[一覧3](mascot-previews/cutouts-3.jpg)。各行は左から白・濃紺・市松模様です。

線画2点は濃色背景で青いにじみが残ったため、完成素材に含めていません。元画像で見切れている人物には足などを描き足さず、上半身として用意しました。パソコンと指示棒はポーズの一部として残しています。

使用したツールは組み込みのimagegen（画像編集モード、`transparent_background: true`）。各素材の元画像・出典URL・編集プロンプト・追加補整プロンプト・寸法・SHA256は[加工記録](mascot-cutouts.json)に保存しています。サイト用の縮小にはSystem.Drawingを使用しました。サイト内での使い分けは[配置方針](mascot-assets.md)を参照してください。

サイトからは `/assets/mascots/cutouts/rai/rai-smile-jump.png` のように参照できます。表示幅と高さを指定し、縦横比を保って使用してください。

管理用のデスクトップ版は「サイト用PNG／高解像度PNG」の下を「ライ／リイ／ライとリイ」に分類し、キャラクター名・表情・ポーズを含む日本語ファイル名にしています。サイト内は `rai`・`rii`・`rai-rii` のフォルダと英字名で同じ分類にそろえています。加工記録の `desktop_file` と `file` で両者を対応付けています。
