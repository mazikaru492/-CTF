import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Readable } from 'node:stream';
import { randomBytes } from 'node:crypto';
import catalog from '../content/questions.json' with { type: 'json' };
import { validateCatalog } from '../server/validate-content.mjs';
import { checkContent } from '../scripts/check.mjs';
import { homePage, missionPage, resultPage } from '../public/scripts/pages.js';

// Keep invalid-input fixtures independent of the questions being authored.
const sampleQuestion = {
  id: 1,
  kind: 'cipher',
  category: '暗号',
  title: 'テスト問題',
  subtitle: '説明',
  instruction: '１文字戻してください。',
  material: { cipher: 'DBU' },
  answer: 'CAT',
  hints: ['１つ目', '２つ目'],
  explanation: '１文字戻す。',
  learning: '暗号の入門。',
};
const sampleCatalog = () => ({
  progressVersion: 1,
  questions: [structuredClone(sampleQuestion), { ...structuredClone(sampleQuestion), id: 2 }],
});

test('all configured questions have valid materials and existing images', async () => {
  assert.deepEqual(await checkContent(), catalog);
});

test('authoring errors identify the question and field', () => {
  for (const [mutate, expected] of [
    [
      (c) => {
        c.questions[1].id = 1;
      },
      /問題2.*id/,
    ],
    [
      (c) => {
        c.questions[0].kind = 'unknown';
      },
      /kind/,
    ],
    [
      (c) => {
        c.questions[0].hints.pop();
      },
      /hints/,
    ],
    [
      (c) => {
        c.questions[0].answer = ' cat ';
      },
      /answer/,
    ],
    [
      (c) => {
        c.questions[0].privateNote = 'secret';
      },
      /privateNote/,
    ],
    [
      (c) => {
        c.questions[0].kind = 'image';
        c.questions[0].material = { image: '/assets/../private.png' };
      },
      /image/,
    ],
    [
      (c) => {
        c.questions[0].kind = 'logs';
        c.questions[0].material = {
          devices: [{ id: 'PC', code: 'A' }],
          logs: [{ time: '09:00', device: 'UNKNOWN', result: '接続' }],
        };
      },
      /device/,
    ],
    [
      (c) => {
        c.questions[0].kind = 'order';
        c.questions[0].material = {
          cards: [{ id: 'A', time: '25:70', event: '接続', letter: 'A' }],
        };
      },
      /time/,
    ],
  ]) {
    const copy = sampleCatalog();
    mutate(copy);
    assert.throws(() => validateCatalog(copy), expected);
  }
});

test('missing image files block validation before building', async () => {
  const copy = sampleCatalog();
  copy.questions[0].kind = 'image';
  copy.questions[0].material = {
    image: '/assets/not-a-real-file.png',
    alt: '画像',
    textClue: '手がかり',
    textDetail: '説明',
  };
  await assert.rejects(checkContent(copy), /問題1.*見つかりません/);
});

test('a ninth question needs no hardcoded counts in UI, API or progress', async () => {
  const copy = {
    progressVersion: 1,
    questions: Array.from({ length: 8 }, (_, index) => ({
      ...structuredClone(sampleQuestion),
      id: index + 1,
    })),
  };
  copy.questions.push({ ...structuredClone(copy.questions[0]), id: 9, title: '追加した問題' });
  validateCatalog(copy);
  const progress = { solved: [], learned: [], viewed: [], hints: Array(9).fill(0) };
  assert.match(homePage(copy.questions, progress), /全9問/);
  assert.match(missionPage(copy.questions[8], copy.questions, progress), /問題 9 \/ 全9問/);
  assert.match(resultPage(copy.questions, progress), /未完了：9問/);

  const directory = await mkdtemp(join(tmpdir(), 'ctf-catalog-'));
  try {
    await cp(new URL('../server/', import.meta.url), join(directory, 'server'), {
      recursive: true,
    });
    await mkdir(join(directory, 'content'));
    await writeFile(join(directory, 'content', 'questions.json'), JSON.stringify(copy));
    process.env.CTF_SESSION_SECRET ||= randomBytes(32).toString('hex');
    const module = await import(pathToFileURL(join(directory, 'server', 'game.mjs')).href);
    const ask = async (body, cookie = '') => {
      const req = Readable.from(body ? [JSON.stringify(body)] : []);
      req.method = body ? 'POST' : 'GET';
      req.headers = {
        host: 'localhost',
        cookie,
        ...(body ? { 'content-type': 'application/json' } : {}),
      };
      const response = { headers: {} };
      await module.default(req, {
        setHeader(k, v) {
          response.headers[k] = v;
        },
        end(value) {
          response.status = this.statusCode;
          response.body = JSON.parse(value);
        },
      });
      response.cookie = response.headers['Set-Cookie']?.split(';')[0];
      return response;
    };
    const initial = await ask();
    assert.equal(initial.body.challenges.length, 9);
    assert.equal(initial.body.progress.hints.length, 9);
    assert.ok(
      initial.body.challenges.every(
        (c) => !('answer' in c) && !('hints' in c) && !('learning' in c),
      ),
    );
    const solved = await ask(
      { action: 'answer', id: 9, answer: copy.questions[8].answer },
      initial.cookie,
    );
    assert.equal(solved.body.correct, true);
    assert.deepEqual(solved.body.progress.solved, [9]);
    const state = module.decodeState(solved.cookie.split('=')[1]);
    assert.equal(state.v, copy.progressVersion);
    assert.equal(
      module.decodeState(module.encodeState({ ...state, v: copy.progressVersion + 1 })),
      null,
    );
  } finally {
    if (
      !resolve(directory).startsWith(resolve(tmpdir()) + sep) ||
      !basename(directory).startsWith('ctf-catalog-')
    )
      throw new Error('Unexpected test temporary directory');
    await rm(directory, { recursive: true, force: true });
  }
});
