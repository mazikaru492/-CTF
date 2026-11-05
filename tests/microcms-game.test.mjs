import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import local from './fixtures/questions.json' with { type: 'json' };
import { createGameHandler, encodeState, decodeState } from '../server/game.mjs';

process.env.CTF_SESSION_SECRET = randomBytes(32).toString('hex');
async function request(handler, body, cookie = '') {
  const req = Readable.from(body ? [JSON.stringify(body)] : []);
  req.method = body ? 'POST' : 'GET';
  req.headers = {
    host: 'localhost',
    cookie,
    ...(body ? { 'content-type': 'application/json' } : {}),
  };
  const result = { headers: {} };
  await handler(req, {
    setHeader(name, value) {
      result.headers[name] = value;
    },
    end(value) {
      result.status = this.statusCode;
      result.body = JSON.parse(value);
    },
  });
  result.cookie = result.headers['Set-Cookie']?.split(';')[0] || '';
  return result;
}

test('game uses one CMS snapshot for both rendering and grading without sending secrets', async () => {
  const catalog = structuredClone(local);
  catalog.progressVersion = 100;
  catalog.questions[0].title = 'CMSの問題';
  catalog.questions[0].answer = 'REMOTE';
  let calls = 0;
  const handler = createGameHandler(async () => {
    calls++;
    return catalog;
  });
  const initial = await request(handler);
  assert.equal(initial.body.challenges[0].title, 'CMSの問題');
  assert.equal(initial.body.catalogVersion, 100);
  assert.ok(!JSON.stringify(initial.body).includes('REMOTE'));
  assert.ok(!('hints' in initial.body.challenges[0]));
  assert.equal(calls, 1);
  const solved = await request(
    handler,
    { action: 'answer', id: 1, answer: 'REMOTE', catalogVersion: 100 },
    initial.cookie,
  );
  assert.equal(solved.body.correct, true);
  assert.deepEqual(solved.body.progress.solved, [1]);
  assert.equal(calls, 2);
});

test('editing a catalog invalidates old solves and rejects answers from the previous screen', async () => {
  const catalog = { ...structuredClone(local), progressVersion: 100 };
  const handler = createGameHandler(async () => catalog);
  const oldState = {
    v: 2,
    sid: 'old-catalog',
    exp: Date.now() + 10000,
    last: 0,
    solved: [1],
    learned: [],
    viewed: [1],
    hints: Array(8).fill(0),
  };
  const cookie = `ctf_progress=${encodeState(oldState)}`;
  const refreshed = await request(handler, undefined, cookie);
  assert.deepEqual(refreshed.body.progress.solved, []);
  assert.equal(decodeState(refreshed.cookie.split('=')[1], Date.now(), catalog).v, 100);
  const stale = await request(
    handler,
    { action: 'answer', id: 1, answer: 'CAT', catalogVersion: 2 },
    cookie,
  );
  assert.equal(stale.status, 409);
  assert.match(stale.body.error, /再読み込み/);
  assert.equal(stale.cookie, '');
});

test('CMS failure returns a generic error without leaking data or using local questions', async (t) => {
  const logs = [];
  t.mock.method(console, 'error', (...args) => logs.push(args.join(' ')));
  const handler = createGameHandler(async () => {
    throw Error('private-upstream');
  });
  const response = await request(handler);
  assert.equal(response.status, 503);
  assert.equal(response.body.challenges, undefined);
  assert.ok(!JSON.stringify(response).includes('private-upstream'));
  assert.ok(!logs.join(' ').includes('private-upstream'));
});

test('a submission without the catalog version is rejected before grading', async () => {
  const handler = createGameHandler(async () => local);
  const response = await request(handler, {
    action: 'answer',
    id: 1,
    answer: local.questions[0].answer,
  });
  assert.equal(response.status, 409);
  assert.equal(response.body.correct, undefined);
  assert.equal(response.cookie, '');
});
