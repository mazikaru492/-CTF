import test from 'node:test';
import assert from 'node:assert/strict';
import { challenges } from './fixtures/catalog.mjs';
import { validateCatalog } from '../server/validate-content.mjs';
import { material } from '../public/scripts/materials.js';

const question = {
  id: 1,
  kind: 'phishing',
  category: '総合',
  title: 'メール調査',
  subtitle: '比較する',
  instruction: '不審なメールのIDを提出',
  answer: 'B',
  hints: ['送信元を確認', 'リンク先を確認'],
  explanation: 'Bのリンク先が異なる',
  learning: 'ドメインを照合する',
  material: {
    officialDomain: 'ctf.example',
    emails: [
      { id: 'A', sender: 'info@ctf.example', url: 'https://ctf.example/entry' },
      {
        id: 'B',
        sender: 'info@ctf.example',
        url: 'https://ctf.example.account-check.example/entry',
      },
    ],
  },
};

test('phishing materials validate addresses and render full non-clickable evidence', () => {
  assert.doesNotThrow(() => validateCatalog({ progressVersion: 2, questions: [question] }));
  const html = material(question);
  for (const mail of question.material.emails) {
    assert.ok(html.includes(mail.sender));
    assert.ok(html.includes(mail.url), 'full hostname must remain available for comparison');
  }
  assert.ok(!html.includes('href='), 'training links do not navigate to another site');
  for (const mutate of [
    (q) => {
      q.material.emails[0].sender = '';
    },
    (q) => {
      q.material.emails[1].id = 'A';
    },
    (q) => {
      q.material.emails[0].url = 'javascript:alert(1)';
    },
    (q) => {
      q.material.emails[0].url = 'https://real-site.com/';
    },
    (q) => {
      q.material.officialDomain = 'ctf.example/entry';
    },
  ]) {
    const copy = structuredClone(question);
    mutate(copy);
    assert.throws(() => validateCatalog({ progressVersion: 2, questions: [copy] }));
  }
});

test('question eight is solved by checking sender and link hostnames', () => {
  const last = challenges.find((c) => c.id === 8);
  assert.equal(last.kind, 'phishing');
  const suspicious = last.material.emails.filter(
    (mail) =>
      mail.sender.split('@')[1] !== last.material.officialDomain ||
      new URL(mail.url).hostname !== last.material.officialDomain,
  );
  assert.equal(suspicious.length, 2);
  assert.equal(
    suspicious
      .map((mail) => mail.id)
      .sort()
      .join(''),
    last.answer,
  );
  assert.equal(last.answer, 'BD');
});
