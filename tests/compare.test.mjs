import test from 'node:test';
import assert from 'node:assert/strict';
import { challenges } from '../server/challenges.mjs';

test('comparison evidence requires finding changed codes among unchanged cards', () => {
  const question = challenges.find((c) => c.id === 4);
  const [before, after] = question.material.textDetail.split('変更後：');
  const readCodes = (text) =>
    new Map([...text.matchAll(/ID(\d{2})=([A-Z])/g)].map((m) => [m[1], m[2]]));
  const oldCodes = readCodes(before);
  const newCodes = readCodes(after || '');
  assert.equal(oldCodes.size, 6, 'all six before codes are available as equivalent text evidence');
  assert.equal(newCodes.size, 6);
  const changed = [...newCodes].filter(([id, code]) => oldCodes.get(id) !== code);
  assert.equal(changed.length, 3, 'unchanged cards require comparing both images');
  assert.equal(
    changed
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, code]) => code)
      .join(''),
    question.answer,
  );
  assert.notEqual(
    [...newCodes.values()].join(''),
    question.answer,
    'the after image alone is not the flag',
  );
  for (const text of [
    question.material.textDetail,
    question.material.beforeAlt,
    question.material.afterAlt,
  ])
    assert.ok(!text?.includes(question.answer), 'alternative text must preserve the puzzle');
});
