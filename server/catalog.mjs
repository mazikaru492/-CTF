import { fetchMicrocmsQuestions } from './microcms.mjs';
import { fromMicrocmsQuestions } from './microcms-catalog.mjs';

export function createCatalogLoader({
  env = process.env,
  fetchQuestions = fetchMicrocmsQuestions,
  now = Date.now,
} = {}) {
  let snapshot;
  let expires = 0;
  let retryAfter = 0;
  let pending;
  return async function loadCatalog() {
    if (snapshot && now() < expires) return snapshot;
    if (now() < retryAfter) throw new Error('microCMSの問題を読み込めません。');
    pending ??= (async () => {
      try {
        const catalog = fromMicrocmsQuestions(await fetchQuestions({ env }), {
          versionKey: env.CTF_SESSION_SECRET,
        });
        snapshot = catalog;
        expires = now() + 30_000;
        return snapshot;
      } catch {
        retryAfter = now() + 5_000;
        throw new Error('microCMSの問題を読み込めません。入力項目と公開状態を確認してください。');
      }
    })();
    try {
      return await pending;
    } finally {
      pending = undefined;
    }
  };
}

export const getCatalog = createCatalogLoader();
