import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { request } from 'node:http';
import { once } from 'node:events';

test('malformed URLs do not terminate the server, private files stay private, and cookie replay is limited over HTTP', async () => {
  const listener = createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  const child = spawn(process.execPath, ['scripts/dev.mjs'], {
    windowsHide: true,
    env: {
      ...process.env,
      VERCEL: '',
      NODE_ENV: 'test',
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
      CTF_PUBLIC_ORIGIN: '',
      PORT: String(port),
      CTF_SESSION_SECRET: randomBytes(32).toString('hex'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let errors = '';
  child.stdout.on('data', () => {});
  child.stderr.on('data', (chunk) => {
    errors += chunk;
  });
  const exit = once(child, 'exit');
  const base = `http://127.0.0.1:${port}`;
  const getRaw = (path) =>
    new Promise((resolve, reject) => {
      const call = request({ hostname: '127.0.0.1', port, path, timeout: 2000 }, (response) => {
        response.resume();
        response.on('end', () => resolve(response.statusCode));
      });
      call.on('error', reject);
      call.on('timeout', () => call.destroy(new Error('Request timed out')));
      call.end();
    });
  try {
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        if ((await fetch(base, { signal: AbortSignal.timeout(300) })).ok) break;
      } catch {
        /* The isolated server is still starting. */
      }
      if (child.exitCode !== null || attempt === 39) throw new Error('Test server did not start');
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    for (const path of ['/%', '/%E0%A4%A', '/assets/%00', '/assets/%7f']) {
      assert.equal(await getRaw(path), 400, path);
      assert.equal((await fetch(base + '/api/game')).status, 200);
      assert.equal(child.exitCode, null);
    }
    for (const path of [
      '/.env.local',
      '/.git/config',
      '/content/questions.json',
      '/server/game.mjs',
      '/server/rate-limit.mjs',
      '/package.json',
      '/vercel.json',
    ]) {
      assert.equal(await getRaw(path), 404, path);
    }
    assert.equal(await getRaw('/%2e%2e%2f.env.local'), 403);
    assert.equal((await fetch(base + '/styles.css', { method: 'POST' })).status, 405);
    const initial = await fetch(base + '/api/game');
    const cookie = initial.headers.get('set-cookie').split(';')[0];
    const options = {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ action: 'answer', id: 1, answer: 'SECURITY_TEST_WRONG' }),
    };
    assert.equal((await fetch(base + '/api/game', options)).status, 200);
    for (let i = 0; i < 3; i++) {
      const response = await fetch(base + '/api/game', options);
      assert.equal(response.status, 429);
      assert.equal(response.headers.get('retry-after'), '1');
    }
    assert.ok(!errors.includes('URIError'));
  } finally {
    child.kill();
    await exit;
  }
});
