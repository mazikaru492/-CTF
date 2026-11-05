import { Buffer } from 'node:buffer';

class ConnectionError extends Error {}

function connectionSettings(env) {
  for (const name of ['MICROCMS_SERVICE_DOMAIN', 'MICROCMS_ENDPOINT', 'MICROCMS_API_KEY']) {
    if (typeof env[name] !== 'string' || !env[name])
      throw new ConnectionError(`${name}を設定してください。`);
  }
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(env.MICROCMS_SERVICE_DOMAIN))
    throw new ConnectionError('MICROCMS_SERVICE_DOMAINはURLではなくサービスIDを指定してください。');
  if (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(env.MICROCMS_ENDPOINT))
    throw new ConnectionError('MICROCMS_ENDPOINTはAPIのエンドポイント名を指定してください。');
  if (!/^[\x21-\x7e]{1,512}$/.test(env.MICROCMS_API_KEY))
    throw new ConnectionError('MICROCMS_API_KEYの形式を確認してください。');
  return {
    url: new URL(
      `https://${env.MICROCMS_SERVICE_DOMAIN}.microcms.io/api/v1/${env.MICROCMS_ENDPOINT}`,
    ),
    key: env.MICROCMS_API_KEY,
  };
}

async function readList({ env = process.env, fetchImpl = fetch }, query, limit, maxBytes) {
  const { url, key } = connectionSettings(env);
  url.search = query;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  let response;
  let reader;
  const cancelBody = () => {
    if (reader) void reader.cancel().catch(() => {});
    else if (response?.body) void response.body.cancel().catch(() => {});
  };
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json', 'X-MICROCMS-API-KEY': key },
      redirect: 'error',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok)
      throw new ConnectionError(
        `microCMS接続失敗（HTTP ${response.status}）。権限・API設定を確認してください。`,
      );
    if (
      response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !==
      'application/json'
    )
      throw new ConnectionError('microCMSからJSON形式の応答を取得できませんでした。');
    reader = response.body.getReader();
    controller.signal.addEventListener('abort', cancelBody, { once: true });
    const chunks = [];
    let size = 0;
    while (true) {
      controller.signal.throwIfAborted();
      const { done, value } = await reader.read();
      controller.signal.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new ConnectionError('microCMSの応答サイズが上限を超えました。');
      chunks.push(value);
    }
    const data = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)),
    );
    if (
      !data ||
      !Array.isArray(data.contents) ||
      data.contents.length > limit ||
      !Number.isSafeInteger(data.totalCount) ||
      data.totalCount < data.contents.length ||
      data.offset !== 0 ||
      data.limit !== limit ||
      data.contents.some((item) => !item || typeof item.id !== 'string' || !item.id)
    )
      throw new ConnectionError(
        'microCMSの応答形式が不正です。リスト形式のAPIか確認してください。',
      );
    return data;
  } catch (error) {
    if (controller.signal.aborted)
      throw new ConnectionError('microCMSへの接続がタイムアウトしました。');
    if (error instanceof ConnectionError) throw error;
    throw new ConnectionError(
      'microCMSとの通信に失敗しました。接続先・通信環境を確認してください。',
    );
  } finally {
    clearTimeout(timeout);
    controller.signal.removeEventListener('abort', cancelBody);
    cancelBody();
  }
}

// Only IDs are requested for diagnostics; never return question content to the command.
export async function checkMicrocmsConnection(options = {}) {
  const { totalCount } = await readList(options, 'limit=1&fields=id&depth=0', 1, 64 * 1024);
  return { totalCount };
}

export async function fetchMicrocmsQuestions(options = {}) {
  const data = await readList(options, 'limit=33&depth=0', 33, 1024 * 1024);
  if (data.totalCount > 32 || data.contents.length !== data.totalCount)
    throw new ConnectionError('問題は32問以内で、全件を取得できる必要があります。');
  return data.contents;
}
