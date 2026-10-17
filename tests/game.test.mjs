import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { randomBytes } from 'node:crypto';
import handler, { encodeState, decodeState } from '../server/game.mjs';
import {
  challenges,
  challengeCount,
  progressVersion,
  publicChallenges,
  normalizeAnswer,
} from '../server/challenges.mjs';
process.env.CTF_SESSION_SECRET = randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';
for (const name of [
  'VERCEL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'CTF_PUBLIC_ORIGIN',
])
  delete process.env[name];
const realNow = Date.now;
let testTime = realNow();
Date.now = () => testTime;
beforeEach(() => {
  testTime += 60001;
});
after(() => {
  Date.now = realNow;
});

async function request({ method = 'GET', body, cookie = '', headers = {}, advance = 1000 } = {}) {
  testTime += advance;
  const req = Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
  req.method = method;
  req.socket = { remoteAddress: '127.0.0.1' };
  req.headers = {
    host: 'localhost:3000',
    ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    cookie,
    ...headers,
  };
  const result = { headers: {} };
  const res = {
    setHeader(k, v) {
      result.headers[k.toLowerCase()] = v;
    },
    end(value) {
      result.status = this.statusCode;
      result.body = JSON.parse(value);
    },
  };
  await handler(req, res);
  result.cookie = (result.headers['set-cookie'] || '').split(';')[0];
  return result;
}
test('public challenge data excludes final answers, hints and explanations', () => {
  assert.equal(publicChallenges().length, challengeCount);
  for (const c of publicChallenges()) {
    assert.ok(!('answer' in c));
    assert.ok(!('explanation' in c));
    assert.ok(!('hints' in c));
  }
});
test('input normalization accepts Japanese-width letters, spaces and optional flag wrapper', () => {
  assert.equal(normalizeAnswer(' ｃａｔ '), 'CAT');
  assert.equal(normalizeAnswer('flag{cat}'), 'CAT');
  assert.notEqual(normalizeAnswer('C AT'), 'CAT');
});
test('session signatures reject tampering and expire after the deadline', () => {
  const state = {
    v: progressVersion,
    sid: 'test',
    exp: Date.now() + 10000,
    last: 0,
    solved: [1],
    learned: [],
    viewed: [],
    hints: Array(challengeCount).fill(0),
  };
  const encoded = encodeState(state);
  assert.deepEqual(decodeState(encoded), state);
  assert.equal(decodeState(encoded.replace(/.$/, encoded.endsWith('a') ? 'b' : 'a')), null);
  assert.equal(decodeState(encoded, state.exp), null);
});
test('wrong answer is rejected; correct answer is recorded once and restored', async () => {
  const initial = await request();
  const wrong = await request({
    method: 'POST',
    body: { action: 'answer', id: 1, answer: challenges[0].answer + '_WRONG' },
    cookie: initial.cookie,
  });
  assert.equal(wrong.body.correct, false);
  assert.deepEqual(wrong.body.progress.solved, []);
  const right = await request({
    method: 'POST',
    body: { action: 'answer', id: 1, answer: challenges[0].answer.toLowerCase() },
    cookie: wrong.cookie,
  });
  assert.equal(right.body.correct, true);
  assert.deepEqual(right.body.progress.solved, [1]);
  const repeat = await request({
    method: 'POST',
    body: { action: 'answer', id: 1, answer: challenges[0].answer },
    cookie: right.cookie,
  });
  assert.deepEqual(repeat.body.progress.solved, [1]);
  const restored = await request({
    method: 'POST',
    body: { action: 'restore', id: 1 },
    cookie: repeat.cookie,
  });
  assert.equal(restored.body.answer, challenges[0].answer);
});
test('viewing an explanation cannot later inflate independently solved count', async () => {
  const initial = await request();
  const explained = await request({
    method: 'POST',
    body: { action: 'explanation', id: 1 },
    cookie: initial.cookie,
  });
  assert.deepEqual(explained.body.progress.learned, [1]);
  const answer = await request({
    method: 'POST',
    body: { action: 'answer', id: 1, answer: challenges[0].answer },
    cookie: explained.cookie,
  });
  assert.equal(answer.body.correct, true);
  assert.equal(answer.body.assisted, true);
  assert.deepEqual(answer.body.progress.solved, []);
});
test('hints are revealed in two stages and capped', async () => {
  let response = await request();
  for (const expected of [1, 2, 2]) {
    response = await request({
      method: 'POST',
      body: { action: 'hint', id: 1 },
      cookie: response.cookie,
    });
    assert.equal(response.body.hints.length, expected);
  }
});
test('all configured answers match and every question has two hints and a learning explanation', async () => {
  for (const c of challenges) {
    assert.equal(c.hints.length, 2);
    assert.ok(c.learning);
    const initial = await request();
    const result = await request({
      method: 'POST',
      body: { action: 'answer', id: c.id, answer: c.answer },
      cookie: initial.cookie,
    });
    assert.equal(result.body.correct, true);
    assert.equal(result.body.progress.solved.length, 1);
  }
});
test('cross-origin writes, malformed input, invalid ids and oversized answers are rejected', async () => {
  assert.equal(
    (
      await request({
        method: 'POST',
        body: { action: 'view', id: 1 },
        headers: { origin: 'https://evil.example' },
      })
    ).status,
    403,
  );
  assert.equal((await request({ method: 'POST', body: [] })).status, 400);
  assert.equal(
    (
      await request({
        method: 'POST',
        body: { action: 'answer', id: 99, answer: challenges[0].answer },
      })
    ).status,
    400,
  );
  assert.equal(
    (await request({ method: 'POST', body: { action: 'answer', id: 1, answer: 'x'.repeat(101) } }))
      .status,
    400,
  );
});
test('rapid resubmissions are limited and reset clears progress', async () => {
  const first = await request({
    method: 'POST',
    body: { action: 'answer', id: 1, answer: challenges[0].answer },
  });
  const rapid = await request({
    method: 'POST',
    body: { action: 'answer', id: 1, answer: challenges[0].answer },
    cookie: first.cookie,
    advance: 0,
  });
  assert.equal(rapid.status, 429);
  const reset = await request({ method: 'POST', body: { action: 'reset' }, cookie: first.cookie });
  assert.deepEqual(reset.body.progress.solved, []);
});
