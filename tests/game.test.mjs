import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { randomBytes } from 'node:crypto';
import handler, { encodeState, decodeState } from '../server/game.mjs';
import { challenges, publicChallenges, normalizeAnswer } from '../server/challenges.mjs';
process.env.CTF_SESSION_SECRET = randomBytes(32).toString('hex');

async function request({ method = 'GET', body, cookie = '', headers = {} } = {}) {
  const req = Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
  req.method = method; req.headers = { host: 'localhost:3000', ...(body !== undefined ? { 'content-type': 'application/json' } : {}), cookie, ...headers };
  const result = { headers: {} };
  const res = { setHeader(k, v) { result.headers[k.toLowerCase()] = v; }, end(value) { result.status = this.statusCode; result.body = JSON.parse(value); } };
  await handler(req, res);
  result.cookie = (result.headers['set-cookie'] || '').split(';')[0];
  return result;
}
test('public challenge data excludes final answers, hints and explanations', () => {
  assert.equal(publicChallenges().length, 8);
  for (const c of publicChallenges()) { assert.ok(!('answer' in c)); assert.ok(!('explanation' in c)); assert.ok(!('hints' in c)); }
});
test('input normalization accepts Japanese-width letters, spaces and optional flag wrapper', () => {
  assert.equal(normalizeAnswer(' ｃａｔ '), 'CAT');
  assert.equal(normalizeAnswer('flag{cat}'), 'CAT');
  assert.notEqual(normalizeAnswer('C AT'), 'CAT');
});
test('session signatures reject tampering and expire after the deadline', () => {
  const state = { v: 1, sid: 'test', exp: Date.now() + 10000, last: 0, solved: [1], learned: [], viewed: [], hints: Array(8).fill(0) };
  const encoded = encodeState(state);
  assert.deepEqual(decodeState(encoded), state);
  assert.equal(decodeState(encoded.replace(/.$/, encoded.endsWith('a') ? 'b' : 'a')), null);
  assert.equal(decodeState(encoded, state.exp), null);
});
test('wrong answer is rejected; correct answer is recorded once and restored', async () => {
  const initial = await request();
  const wrong = await request({ method: 'POST', body: { action: 'answer', id: 1, answer: 'DOG' }, cookie: initial.cookie });
  assert.equal(wrong.body.correct, false); assert.deepEqual(wrong.body.progress.solved, []);
  const waitState = decodeState(wrong.cookie.split('=')[1]); waitState.last = 0;
  const right = await request({ method: 'POST', body: { action: 'answer', id: 1, answer: 'cat' }, cookie: `ctf_progress=${encodeState(waitState)}` });
  assert.equal(right.body.correct, true); assert.deepEqual(right.body.progress.solved, [1]);
  const state = decodeState(right.cookie.split('=')[1]); state.last = 0;
  const repeat = await request({ method: 'POST', body: { action: 'answer', id: 1, answer: 'CAT' }, cookie: `ctf_progress=${encodeState(state)}` });
  assert.deepEqual(repeat.body.progress.solved, [1]);
  const restored = await request({ method: 'POST', body: { action: 'restore', id: 1 }, cookie: repeat.cookie });
  assert.equal(restored.body.answer, 'CAT');
});
test('viewing an explanation cannot later inflate independently solved count', async () => {
  const initial = await request();
  const explained = await request({ method: 'POST', body: { action: 'explanation', id: 2 }, cookie: initial.cookie });
  assert.deepEqual(explained.body.progress.learned, [2]);
  const answer = await request({ method: 'POST', body: { action: 'answer', id: 2, answer: 'CYBER' }, cookie: explained.cookie });
  assert.equal(answer.body.correct, true); assert.equal(answer.body.assisted, true);
  assert.deepEqual(answer.body.progress.solved, []);
});
test('hints are revealed in two stages and capped', async () => {
  let response = await request();
  for (const expected of [1, 2, 2]) {
    response = await request({ method: 'POST', body: { action: 'hint', id: 1 }, cookie: response.cookie });
    assert.equal(response.body.hints.length, expected);
  }
});
test('all eight authored answers match and every question has two hints and a learning explanation', async () => {
  for (const c of challenges) {
    assert.equal(c.hints.length, 2); assert.ok(c.learning);
    const initial = await request();
    const result = await request({ method: 'POST', body: { action: 'answer', id: c.id, answer: c.answer }, cookie: initial.cookie });
    assert.equal(result.body.correct, true); assert.equal(result.body.progress.solved.length, 1);
  }
  assert.equal(String.fromCharCode(67, 89, 66, 69, 82), 'CYBER');
  assert.equal([...challenges[7].material.cipher].map(c => String.fromCharCode((c.charCodeAt(0) - 65 - 2 + 26) % 26 + 65)).join(''), 'SAFE');
});
test('cross-origin writes, malformed input, invalid ids and oversized answers are rejected', async () => {
  assert.equal((await request({ method: 'POST', body: { action: 'view', id: 1 }, headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await request({ method: 'POST', body: [] })).status, 400);
  assert.equal((await request({ method: 'POST', body: { action: 'answer', id: 99, answer: 'CAT' } })).status, 400);
  assert.equal((await request({ method: 'POST', body: { action: 'answer', id: 1, answer: 'x'.repeat(101) } })).status, 400);
});
test('rapid resubmissions are limited and reset clears progress', async () => {
  const first = await request({ method: 'POST', body: { action: 'answer', id: 1, answer: 'CAT' } });
  const rapid = await request({ method: 'POST', body: { action: 'answer', id: 1, answer: 'CAT' }, cookie: first.cookie });
  assert.equal(rapid.status, 429);
  const reset = await request({ method: 'POST', body: { action: 'reset' }, cookie: first.cookie });
  assert.deepEqual(reset.body.progress.solved, []);
});
