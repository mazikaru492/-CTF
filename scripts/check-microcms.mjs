import { checkMicrocmsConnection } from '../server/microcms.mjs';

try {
  const { totalCount } = await checkMicrocmsConnection();
  console.log(`microCMS接続OK：公開コンテンツ${totalCount}件。問題の内容・APIキーは表示しません。`);
} catch (error) {
  console.error(`microCMS接続確認：${error.message}`);
  process.exitCode = 1;
}
