import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import handler from '../server/game.mjs';
import {
  createRateLimiter,
  counterScript,
  validateRateLimitConfig,
} from '../server/rate-limit.mjs';

process.env.CTF_SESSION_SECRET = randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';
for (const name of [
  'VERCEL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'CTF_PUBLIC_ORIGIN',
])
  delete process.env[name];
const env = { CTF_SESSION_SECRET: process.env.CTF_SESSION_SECRET };
const req = (address = '192.0.2.1', headers = {}) => ({
  socket: { remoteAddress: address },
  headers,
});
async function ask(body, cookie = '', headers = {}, encrypted = false) {
  const request = Readable.from(body ? [JSON.stringify(body)] : []);
  request.method = body ? 'POST' : 'GET';
  request.url = '/api/game';
  request.socket = { remoteAddress: '192.0.2.100', encrypted };
  request.headers = {
    host: 'localhost:3000',
    cookie,
    'content-type': 'application/json',
    ...headers,
  };
  const response = { headers: {} };
  await handler(request, {
    setHeader(key, value) {
      response.headers[key.toLowerCase()] = value;
    },
    end(value) {
      response.status = this.statusCode;
      response.body = JSON.parse(value);
    },
  });
  response.cookie = response.headers['set-cookie']?.split(';')[0];
  return response;
}

test('saved cookies cannot replay the answer cooldown and response includes Retry-After', async () => {
  const initial = await ask();
  const body = { action: 'answer', id: 1, answer: 'SECURITY_TEST_WRONG' };
  assert.equal((await ask(body, initial.cookie)).status, 200);
  for (let i = 0; i < 3; i++) {
    const replay = await ask(body, initial.cookie);
    assert.equal(replay.status, 429);
    assert.equal(replay.headers['retry-after'], '1');
  }
});

test('local counters survive cookies being omitted or replaced and ignore forwarded-IP spoofing', async () => {
  let time = 1000;
  const limit = createRateLimiter({ env, now: () => time });
  for (let n = 0; n < 600; n++) assert.equal(await limit(req()), 0);
  assert.equal(
    await limit(req('192.0.2.1', { 'x-forwarded-for': '198.51.100.1', cookie: '' })),
    60000,
  );
  assert.equal(
    await limit(req('192.0.2.1', { 'x-forwarded-for': '198.51.100.2', cookie: 'new' })),
    60000,
  );
  assert.equal(await limit(req('192.0.2.2')), 0);
  time += 60000;
  assert.equal(await limit(req()), 0);
});

test('new session IDs cannot evade the per-IP answer quota', async () => {
  const limit = createRateLimiter({ env, now: () => 1000 });
  for (let n = 0; n < 120; n++) assert.equal(await limit(req(), `session-${n}`), 0);
  assert.equal(await limit(req(), 'new-session'), 60000);
});

test('cooldown expires on the server without changing any cookie timestamp', async () => {
  let time = 1000;
  const limit = createRateLimiter({ env, now: () => time });
  assert.equal(await limit(req(), 'session'), 0);
  assert.equal(await limit(req(), 'session'), 750);
  time += 750;
  assert.equal(await limit(req(), 'session'), 0);
});

test('production cannot silently fall back to per-process memory', async () => {
  for (const settings of [{ VERCEL: '1' }, { NODE_ENV: 'production' }]) {
    const limit = createRateLimiter({ env: { ...env, ...settings } });
    await assert.rejects(
      limit(req('127.0.0.1', { 'x-forwarded-for': '192.0.2.1' })),
      /shared rate limit store/,
    );
  }
});

test('deployment configuration is checked before publishing and incomplete or insecure credentials are rejected', () => {
  assert.equal(validateRateLimitConfig({}), null);
  for (const settings of [
    { VERCEL: '1' },
    { UPSTASH_REDIS_REST_URL: 'https://counter.invalid' },
    { UPSTASH_REDIS_REST_TOKEN: 'test-only' },
    { UPSTASH_REDIS_REST_URL: 'http://counter.invalid', UPSTASH_REDIS_REST_TOKEN: 'test-only' },
    {
      UPSTASH_REDIS_REST_URL: 'https://user:password@counter.invalid',
      UPSTASH_REDIS_REST_TOKEN: 'test-only',
    },
  ])
    assert.throws(() => validateRateLimitConfig(settings));
});

test('Vercel requires the platform-provided client address instead of a cookie or socket fallback', async () => {
  const limit = createRateLimiter({ env: { ...env, VERCEL: '1' } });
  await assert.rejects(limit(req()), /Trusted client address/);
  await assert.rejects(
    limit(req('127.0.0.1', { 'x-forwarded-for': 'garbage' })),
    /Trusted client address/,
  );
});

test('two production limiter instances use the same remote keys and atomic counter command', async () => {
  const counters = new Map();
  const calls = [];
  const fetchImpl = async (url, options) => {
    assert.equal(url.href, 'https://counter.invalid/');
    assert.equal(options.redirect, 'error');
    const command = JSON.parse(options.body);
    assert.equal(command[0], 'EVAL');
    assert.equal(command[1], counterScript);
    calls.push(command);
    const count = command[2];
    let retry = 0;
    for (let i = 0; i < count; i++) {
      const key = command[3 + i];
      assert.ok(!key.includes('192.0.2.1') && !key.includes('saved-session'));
      const value = (counters.get(key) || 0) + 1;
      counters.set(key, value);
      if (value > command[3 + count + i * 2]) retry = Math.max(retry, command[4 + count + i * 2]);
    }
    return { ok: true, json: async () => ({ result: retry }) };
  };
  const options = {
    env: {
      ...env,
      VERCEL: '1',
      UPSTASH_REDIS_REST_URL: 'https://counter.invalid',
      UPSTASH_REDIS_REST_TOKEN: 'test-only',
    },
    fetchImpl,
  };
  const first = createRateLimiter(options);
  const second = createRateLimiter(options);
  const request = req('127.0.0.1', { 'x-forwarded-for': '192.0.2.1' });
  assert.equal(await first(request, 'saved-session'), 0);
  assert.equal(await second(request, 'saved-session'), 750);
  assert.deepEqual(calls[0].slice(3), calls[1].slice(3));
});

test('remote counter failures fail closed without echoing upstream details', async () => {
  for (const data of [
    { error: 'sensitive upstream detail' },
    { result: -1 },
    { result: '0' },
    {},
  ]) {
    const limit = createRateLimiter({
      env: {
        ...env,
        VERCEL: '1',
        UPSTASH_REDIS_REST_URL: 'https://counter.invalid',
        UPSTASH_REDIS_REST_TOKEN: 'test-only',
      },
      fetchImpl: async () => ({ ok: true, json: async () => data }),
    });
    await assert.rejects(
      limit(req('127.0.0.1', { 'x-forwarded-for': '192.0.2.1' })),
      /^Error: Rate limit store is unavailable$/,
    );
  }
});

test('unsupported or malformed origins and spoofed forwarded hosts return 403, not 503', async () => {
  for (const origin of [
    'null',
    'not-a-url',
    'https://attacker.invalid',
    'http://user@localhost:3000',
    'http://localhost:3000/path',
    'https://localhost:3000',
  ]) {
    assert.equal((await ask({ action: 'view', id: 1 }, '', { origin })).status, 403);
  }
  assert.equal(
    (
      await ask({ action: 'view', id: 1 }, '', {
        origin: 'https://attacker.invalid',
        'x-forwarded-host': 'attacker.invalid',
      })
    ).status,
    403,
  );
  assert.equal(
    (await ask({ action: 'view', id: 1 }, '', { origin: 'http://localhost:3000' })).status,
    200,
  );
});

test('JSON media type is exact and accepts case, whitespace and charset parameters', async () => {
  for (const contentType of ['application/jsonp', 'application/json-evil', 'text/plain']) {
    assert.equal(
      (await ask({ action: 'view', id: 1 }, '', { 'content-type': contentType })).status,
      415,
    );
  }
  assert.equal(
    (
      await ask({ action: 'view', id: 1 }, '', {
        'content-type': 'Application/JSON ; charset=utf-8',
      })
    ).status,
    200,
  );
});

test('cookie security uses the trusted connection or explicit origin, not forwarded protocol input', async () => {
  const local = await ask(undefined, '', { 'x-forwarded-proto': 'https' });
  assert.ok(!local.headers['set-cookie'].includes('; Secure'));
  const tls = await ask({ action: 'view', id: 1 }, '', { origin: 'https://localhost:3000' }, true);
  assert.equal(tls.status, 200);
  assert.ok(tls.headers['set-cookie'].includes('; Secure'));
  process.env.CTF_PUBLIC_ORIGIN = 'https://ctf.example';
  try {
    const configured = await ask({ action: 'view', id: 1 }, '', { origin: 'https://ctf.example' });
    assert.equal(configured.status, 200);
    assert.ok(configured.headers['set-cookie'].includes('; Secure'));
    assert.equal(
      (await ask({ action: 'view', id: 1 }, '', { origin: 'http://localhost:3000' })).status,
      403,
    );
  } finally {
    delete process.env.CTF_PUBLIC_ORIGIN;
  }
});
