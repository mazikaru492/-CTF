import { fetchMicrocmsQuestions } from '../server/microcms.mjs';
import { fromMicrocmsQuestions } from '../server/microcms-catalog.mjs';
import { checkContent } from './check.mjs';

try {
  const catalog = fromMicrocmsQuestions(await fetchMicrocmsQuestions());
  await checkContent(catalog);
  console.log(
    `microCMS問題設定OK：${catalog.questions.length}問。本文・答え・APIキーは表示しません。`,
  );
} catch {
  console.error(
    'microCMS問題設定エラー：入力項目、問題番号、必須項目、素材、公開状態を確認してください。',
  );
  process.exitCode = 1;
}
