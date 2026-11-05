import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createCatalogLoader } from '../server/catalog.mjs';

test('the default loader uses CMS without a local source switch', async () => {
  let calls = 0;
  const load = createCatalogLoader({
    env: { CTF_SESSION_SECRET: randomBytes(32).toString('hex') },
    fetchQuestions: async () => {
      calls++;
      return [
        {
          id: 'test',
          questionNumber: 1,
          title: '確認用',
          category: '暗号',
          subtitle: '確認',
          instruction: '確認',
          answer: 'TEST',
          hint1: '確認1',
          hint2: '確認2',
          explanation: '確認',
          learning: '確認',
          publishedAt: '2026-11-05T00:00:00Z',
          material: [{ fieldId: 'cipher', cipher: 'UFTU' }],
        },
      ];
    },
  });
  const result = await load();
  assert.equal(calls, 1);
  assert.equal(result.questions[0].title, '確認用');
});

test('runtime source files do not depend on local problem text or test fixtures', async () => {
  for (const path of [
    'server/catalog.mjs',
    'server/challenges.mjs',
    'server/microcms-catalog.mjs',
    'scripts/check.mjs',
  ]) {
    const source = await readFile(new URL('../' + path, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /content\/questions\.json|tests\/fixtures/);
  }
});
