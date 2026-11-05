import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';
import { validateCatalog } from '../server/validate-content.mjs';
import { getCatalog } from '../server/catalog.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

export async function checkContent(catalog) {
  catalog ??= await getCatalog();
  validateCatalog(catalog);
  const publicRoot = resolve(root, 'public');
  for (const question of catalog.questions) {
    for (const field of ['image', 'before', 'after']) {
      const path = question.material[field];
      if (!path) continue;
      if (path.startsWith('https://')) continue;
      const target = resolve(publicRoot, `.${path}`);
      if (!target.startsWith(`${publicRoot}${sep}`))
        throw new Error(`問題${question.id}: 画像はpublic/assets内に配置してください。`);
      try {
        if (!(await stat(target)).isFile()) throw new Error('Not a file');
      } catch {
        throw new Error(`問題${question.id} material.${field}: 画像 ${path} が見つかりません。`);
      }
      if (
        !['.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif'].includes(extname(target).toLowerCase())
      )
        throw new Error(`問題${question.id}: 対応画像はSVG・PNG・JPEG・WebP・AVIFです。`);
    }
  }
  return catalog;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const catalog = await checkContent();
    console.log(
      `問題設定OK: ${catalog.questions.length}問、画像・ヒント・答え・解説の必須項目を確認しました。`,
    );
  } catch (error) {
    console.error(`設定エラー: ${error.message}`);
    process.exitCode = 1;
  }
}
