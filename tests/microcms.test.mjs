import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { checkMicrocmsConnection, fetchMicrocmsQuestions } from '../server/microcms.mjs';

const env = {
  MICROCMS_SERVICE_DOMAIN: 'ctf-test',
  MICROCMS_ENDPOINT: 'questions',
  MICROCMS_API_KEY: 'test-only-key-never-a-real-credential',
};
const reply = (value = { contents: [], totalCount: 0, offset: 0, limit: 1 }) =>
  Response.json(value);

test('connection probe uses only HTTPS GET and returns counts without question data', async () => {
  const result = await checkMicrocmsConnection({
    env,
    fetchImpl: async (url, options) => {
      assert.equal(
        String(url),
        'https://ctf-test.microcms.io/api/v1/questions?limit=1&fields=id&depth=0',
      );
      assert.equal(options.method, 'GET');
      assert.equal(options.redirect, 'error');
      assert.equal(options.cache, 'no-store');
      assert.deepEqual(options.headers, {
        Accept: 'application/json',
        'X-MICROCMS-API-KEY': env.MICROCMS_API_KEY,
      });
      assert.ok(options.signal instanceof AbortSignal);
      return reply({
        contents: [{ id: 'sample', answer: 'SHOULD-NOT-APPEAR' }],
        totalCount: 8,
        offset: 0,
        limit: 1,
      });
    },
  });
  assert.deepEqual(result, { totalCount: 8 });
});

test('an empty API is a successful connection', async () => {
  assert.deepEqual(await checkMicrocmsConnection({ env, fetchImpl: async () => reply() }), {
    totalCount: 0,
  });
});

test('question retrieval includes the full published list without draft or user-selected queries', async () => {
  const items = [{ id: 'question-01', publishedAt: '2026-11-05T01:00:00Z', title: 'sample' }];
  const result = await fetchMicrocmsQuestions({
    env,
    fetchImpl: async (url, options) => {
      assert.equal(String(url), 'https://ctf-test.microcms.io/api/v1/questions?limit=33&depth=0');
      assert.equal(options.method, 'GET');
      assert.equal(options.redirect, 'error');
      return reply({ contents: items, totalCount: 1, offset: 0, limit: 33 });
    },
  });
  assert.deepEqual(result, items);
  for (const data of [
    { contents: items, totalCount: 2, offset: 0, limit: 33 },
    { contents: items, totalCount: 33, offset: 0, limit: 33 },
  ])
    await assert.rejects(fetchMicrocmsQuestions({ env, fetchImpl: async () => reply(data) }));
});

test('missing settings fail before sending a request', async () => {
  for (const name of Object.keys(env)) {
    let called = false;
    await assert.rejects(
      checkMicrocmsConnection({
        env: { ...env, [name]: '' },
        fetchImpl: async () => {
          called = true;
          return reply();
        },
      }),
      new RegExp(name),
    );
    assert.equal(called, false);
  }
});

test('host and endpoint injection are rejected without disclosing invalid values', async () => {
  for (const [name, values] of [
    [
      'MICROCMS_SERVICE_DOMAIN',
      [
        'https://evil.example',
        'ctf.microcms.io',
        'ctf@evil.example',
        '../private',
        'ctf/evil',
        'ctf?key=secret',
        'ctf#fragment',
        '127.0.0.1',
        'localhost:3000',
        '-ctf',
        'ctf-',
        'a'.repeat(64),
      ],
    ],
    [
      'MICROCMS_ENDPOINT',
      ['../private', '/questions', 'questions?draftKey=secret', 'a/b', 'a%2fb', 'a#b'],
    ],
    ['MICROCMS_API_KEY', ['key\r\nX-Evil: true', 'key with spaces', '秘密のキー']],
  ]) {
    for (const value of values) {
      let called = false;
      await assert.rejects(
        checkMicrocmsConnection({
          env: { ...env, [name]: value },
          fetchImpl: async () => {
            called = true;
            return reply();
          },
        }),
        (error) => error.message.includes(name) && !error.message.includes(value),
      );
      assert.equal(called, false);
    }
  }
});

test('HTTP failures do not return upstream bodies or credentials', async () => {
  for (const status of [301, 302, 401, 403, 404, 429, 500]) {
    await assert.rejects(
      checkMicrocmsConnection({
        env,
        fetchImpl: async () => new Response(`private ${env.MICROCMS_API_KEY}`, { status }),
      }),
      (error) =>
        error.message.includes(String(status)) && !error.message.includes(env.MICROCMS_API_KEY),
    );
  }
});

test('network errors are replaced with a safe message and have no sensitive cause', async () => {
  await assert.rejects(
    checkMicrocmsConnection({
      env,
      fetchImpl: async () => {
        throw new Error(`private ${env.MICROCMS_API_KEY}`);
      },
    }),
    (error) => !String(error.stack).includes(env.MICROCMS_API_KEY) && !error.cause,
  );
});

test('invalid JSON, content types, and list metadata fail closed', async () => {
  for (const response of [
    new Response(`{ ${env.MICROCMS_API_KEY}`, { headers: { 'Content-Type': 'application/json' } }),
    new Response('<html>Sign in</html>', { headers: { 'Content-Type': 'text/html' } }),
    reply({ contents: [], totalCount: -1, offset: 0, limit: 1 }),
    reply({ contents: [], totalCount: '8', offset: 0, limit: 1 }),
    reply({ contents: {}, totalCount: 0, offset: 0, limit: 1 }),
    reply({ contents: [], totalCount: 0, offset: 1, limit: 1 }),
    reply({ contents: [], totalCount: 0, offset: 0, limit: 2 }),
    reply({ contents: [{ id: 'a' }, { id: 'b' }], totalCount: 2, offset: 0, limit: 1 }),
    reply({ contents: [{}], totalCount: 1, offset: 0, limit: 1 }),
    reply(null),
  ]) {
    await assert.rejects(
      checkMicrocmsConnection({ env, fetchImpl: async () => response }),
      (error) => !String(error.stack).includes(env.MICROCMS_API_KEY),
    );
  }
});

test('oversized responses are stopped even without Content-Length', async () => {
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) {
      controller.enqueue(new Uint8Array(40_000));
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(
    checkMicrocmsConnection({
      env,
      fetchImpl: async () =>
        new Response(body, { headers: { 'Content-Type': 'application/json' } }),
    }),
    /応答サイズ/,
  );
  assert.equal(cancelled, true);
});

test('connection timeout also covers a response body that never finishes', async () => {
  const keepAlive = setTimeout(() => {}, 10_000);
  let cancelled = false;
  try {
    await assert.rejects(
      checkMicrocmsConnection({
        env,
        fetchImpl: async () =>
          new Response(
            new ReadableStream({
              cancel() {
                cancelled = true;
              },
            }),
            { headers: { 'Content-Type': 'application/json' } },
          ),
      }),
      /タイムアウト/,
    );
    assert.equal(cancelled, true);
  } finally {
    clearTimeout(keepAlive);
  }
});

test('connection command fails safely when unconfigured', async () => {
  await assert.rejects(
    promisify(execFile)(process.execPath, ['scripts/check-microcms.mjs'], {
      env: {
        ...process.env,
        MICROCMS_SERVICE_DOMAIN: '',
        MICROCMS_ENDPOINT: '',
        MICROCMS_API_KEY: '',
      },
    }),
    (error) =>
      error.code === 1 && error.stdout === '' && /MICROCMS_SERVICE_DOMAIN/.test(error.stderr),
  );
});

test('connection command reports success without printing credentials or content', async () => {
  const { stdout, stderr } = await promisify(execFile)(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `globalThis.fetch = async () => Response.json({
      contents: [{ id: 'private-id', answer: 'private-answer' }],
      totalCount: 1, offset: 0, limit: 1
    }); await import('./scripts/check-microcms.mjs');`,
    ],
    { env: { ...process.env, ...env } },
  );
  assert.match(stdout, /microCMS接続OK.*1件/);
  assert.equal(stderr, '');
  for (const value of [env.MICROCMS_API_KEY, 'private-id', 'private-answer'])
    assert.equal(stdout.includes(value), false);
});
