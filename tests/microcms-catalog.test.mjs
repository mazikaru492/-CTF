import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import local from './fixtures/questions.json' with { type: 'json' };
import { fromMicrocmsQuestions } from '../server/microcms-catalog.mjs';
import { createCatalogLoader } from '../server/catalog.mjs';
import { toMicrocmsQuestion } from './fixtures/microcms.mjs';
import { validateCatalog } from '../server/validate-content.mjs';

process.env.CTF_SESSION_SECRET = randomBytes(32).toString('hex');

const published = (question) => ({
  ...toMicrocmsQuestion(question),
  publishedAt: '2026-11-05T01:00:00.000Z',
});
const sample = () => ({
  id: 'question-01',
  questionNumber: 1,
  title: 'テスト問題',
  category: '暗号',
  subtitle: '調査',
  instruction: '１文字戻す',
  answer: 'CAT',
  hint1: '規則を探す',
  hint2: '前に戻す',
  explanation: 'CATになる',
  learning: '暗号を学ぶ',
  publishedAt: '2026-11-05T01:00:00.000Z',
  material: [{ fieldId: 'cipher', cipher: 'DBU', privateNote: 'must-not-leak' }],
  privateNote: 'must-not-leak',
});

test('CMS material is converted by allowlist and internal fields never become public material', () => {
  const catalog = fromMicrocmsQuestions([sample()]);
  assert.deepEqual(catalog.questions[0], {
    id: 1,
    category: '暗号',
    kind: 'cipher',
    title: 'テスト問題',
    subtitle: '調査',
    instruction: '１文字戻す',
    material: { cipher: 'DBU' },
    answer: 'CAT',
    hints: ['規則を探す', '前に戻す'],
    explanation: 'CATになる',
    learning: '暗号を学ぶ',
  });
  assert.ok(!JSON.stringify(catalog).includes('must-not-leak'));
});

test('all existing problems survive form migration exactly and preserve current progress version', () => {
  const catalog = fromMicrocmsQuestions(local.questions.map(published).reverse());
  assert.deepEqual(catalog.questions, local.questions);
  assert.equal(catalog.progressVersion, 2);
  validateCatalog(catalog);
});

test('editing content creates a stable new progress version while metadata does not', () => {
  const records = local.questions.map(published);
  const before = fromMicrocmsQuestions(records);
  records[0].answer = 'DOG';
  const edited = fromMicrocmsQuestions(records);
  assert.notEqual(edited.progressVersion, before.progressVersion);
  records[0].updatedAt = '2026-11-05T02:00:00Z';
  assert.equal(fromMicrocmsQuestions(records).progressVersion, edited.progressVersion);
});

test('public catalog versions are keyed so they cannot verify offline guesses of secret answers', () => {
  const a = fromMicrocmsQuestions([sample()], { versionKey: 'a'.repeat(32) });
  const b = fromMicrocmsQuestions([sample()], { versionKey: 'b'.repeat(32) });
  assert.notEqual(a.progressVersion, b.progressVersion);
  assert.throws(() => fromMicrocmsQuestions([sample()], { versionKey: '' }));
});

test('empty, draft, duplicate, missing, and unknown material types fail closed', () => {
  for (const change of [
    () => [],
    (items) => {
      delete items[0].publishedAt;
      return items;
    },
    (items) => {
      items[0].questionNumber = 2;
      return items;
    },
    (items) => {
      items[0].material = [];
      return items;
    },
    (items) => {
      items[0].material[0].fieldId = 'unknown';
      return items;
    },
    (items) => {
      delete items[0].hint2;
      return items;
    },
    (items) => [items[0], structuredClone(items[0])],
    () => Array.from({ length: 33 }, () => sample()),
  ])
    assert.throws(() => fromMicrocmsQuestions(change([sample()])));
});

test('only exact HTTPS microCMS image assets are accepted', () => {
  const record = published(local.questions[2]);
  delete record.material[0].imagePath;
  record.material[0].image = {
    url: 'https://images.microcms-assets.io/assets/service/image/evidence.png',
    width: 1200,
    height: 900,
  };
  const result = fromMicrocmsQuestions([{ ...record, questionNumber: 1 }]);
  assert.equal(result.questions[0].material.image, record.material[0].image.url);
  for (const url of [
    'javascript:alert(1)',
    'data:image/svg+xml,test',
    'https://evil.example/a.png',
    'https://images.microcms-assets.io.evil.example/assets/a/b/x.png',
    'https://images.microcms-assets.io@evil.example/assets/a/b/x.png',
    'http://images.microcms-assets.io/assets/a/b/x.png',
    'https://images.microcms-assets.io:444/assets/a/b/x.png',
    'https://images.microcms-assets.io/assets/a/b/x.svg',
    'https://images.microcms-assets.io/assets/a/b/x.png?redirect=evil',
    'https://images.microcms-assets.io/assets/a/b/../../x.png',
  ]) {
    record.material[0].image.url = url;
    assert.throws(() => fromMicrocmsQuestions([{ ...record, questionNumber: 1 }]));
  }
});

test('CMS loading reuses a validated snapshot for 30 seconds and coalesces requests', async () => {
  let calls = 0;
  let time = 100;
  const load = createCatalogLoader({
    env: { CTF_SESSION_SECRET: process.env.CTF_SESSION_SECRET },
    now: () => time,
    fetchQuestions: async () => {
      calls++;
      return [sample()];
    },
  });
  const [a, b] = await Promise.all([load(), load()]);
  assert.equal(a, b);
  assert.equal(calls, 1);
  time = 29_000;
  await load();
  assert.equal(calls, 1);
  time = 31_000;
  await load();
  assert.equal(calls, 2);
});

test('CMS outage never falls back to different local questions and errors do not leak', async () => {
  let calls = 0;
  let time = 0;
  const load = createCatalogLoader({
    env: { CTF_SESSION_SECRET: process.env.CTF_SESSION_SECRET },
    now: () => time,
    fetchQuestions: async () => {
      calls++;
      if (calls === 1) return [sample()];
      throw Error('private-key');
    },
  });
  await load();
  time = 31_000;
  await assert.rejects(load(), (error) => !error.message.includes('private-key'));
  await assert.rejects(load());
  assert.equal(calls, 2);
});
