# 問題４の画像・生成記録

2026-10-22に、内蔵の image_gen ツールで生成した架空の掲示板です。実在の研究室の写真ではありません。

- 変更前：[board-before-photo.png](../public/assets/board-before-photo.png)
- 変更後：[board-after-photo.png](../public/assets/board-after-photo.png)
- どちらも1536 × 1024px。生成されたPNGをそのまま使用しています。

問題３の「拡大して文字を探す」から進み、６枚の同じIDを照合し、変化のある３枚を選んでID順に読む問題です。番号・配置と無変更のカードは両方に残すため、変更後の画像だけでフラグをそのまま読めません。画像が見づらいときの文字資料にも、同じ６組の変更前後の証拠を載せています。

| ID  | 変更前 | 変更後 |
| --- | ------ | ------ |
| 01  | K      | K      |
| 02  | A      | S      |
| 03  | R      | U      |
| 04  | T      | T      |
| 05  | M      | N      |
| 06  | E      | E      |

比較対象は英字コードです。生成画像には紙やコルクの質感に微細な違いがありますが、解答の対象にしません。正解は従来と同じため、進捗はリセットしません。

## 変更前の生成プロンプト

```text
Generate a photorealistic evidence photo for a beginner Japanese CTF spot-the-difference puzzle, landscape 3:2 image, high resolution. Straight-on close photograph of a real tan cork noticeboard with a slim aluminum frame on a neutral off-white research-lab wall, soft natural daylight, no people, no screens, no added captions. Exactly SIX separate matte ivory paper cards pinned with small identical muted blue thumbtacks, arranged in a perfectly clear 2 rows by 3 columns grid. All six cards visible completely, generous space between cards, nearly frontoparallel so text is easily readable when zoomed on a phone. Each card has ONLY a small dark printed identifier at the top and ONE large dark uppercase code letter centered below it. The letters should be normal clean bold printed sans-serif, not handwriting. Exact card layout: top left identifier 'ID 01', code letter 'K'; top middle identifier 'ID 02', code letter 'A'; top right identifier 'ID 03', code letter 'R'; bottom left identifier 'ID 04', code letter 'T'; bottom middle identifier 'ID 05', code letter 'M'; bottom right identifier 'ID 06', code letter 'E'. Make each identifier and letter unambiguously correct, separated clearly. Real physical paper fibers, slight naturally curled paper corners, realistic pin shadows and cork grain, restrained documentary photography. No other letters, words, digits, decorative codes, icons, logos or watermarks. This is the BEFORE evidence photo; do not print the word BEFORE. This is a project asset; save the generated file and return its filesystem path.
```

## 変更後の編集プロンプト

変更前の生成画像を参照画像として指定しました。

```text
Edit this exact photograph to create the AFTER evidence image for a beginner spot-the-difference game. Change ONLY the three large printed code letters specified below: card ID 02 (top middle): A becomes S; card ID 03 (top right): R becomes U; card ID 05 (bottom middle): M becomes N. All other code letters remain exactly unchanged: ID 01 K, ID 04 T, ID 06 E. All six printed ID identifiers must stay unchanged and readable. Keep exactly the same image size, framing, straight-on camera position, corkboard, aluminum frame, wall, lighting, shadows, paper cards, thumbtacks, card positions, textures, perspective and typography as the input. Do not move or add any objects or cards. The three replacement letters should match the original black printed font and size and lie naturally on the existing paper. No highlights, circles, arrows or other marks that reveal which cards changed. No extra text, no caption, no word AFTER, no watermark. Exact final 2 by 3 layout: top row ID 01 K, ID 02 S, ID 03 U; bottom row ID 04 T, ID 05 N, ID 06 E. Photorealistic documentary photograph.
```

## 再確認

```sh
npm test
npm run check
npm run build
npm run test:compare
```

画像内の英字と番号は目視でも確認します。テストは文字資料の差分から正解が導けること、ブラウザで前後の画像と拡大表示を切り替えられること、回答判定を確認します。
