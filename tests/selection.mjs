import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { challenges, challengeCount } from './live-catalog.mjs';

const base = process.env.CTF_TEST_URL || 'http://127.0.0.1:3000';
const questions = [
  { kind: 'logs', attr: 'device', items: 'devices' },
  { kind: 'records', attr: 'record', items: 'backup' },
];

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const { kind, attr, items } of questions) {
      const question = challenges.find((item) => item.kind === kind);
      const choices = question.material[items];
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      try {
        await page.goto(`${base}/#mission-${question.id}`);
        const input = page.locator('#flag-input');
        await input.waitFor();
        assert.equal(await input.inputValue(), '');
        for (const { id, code } of choices) {
          await page.locator(`[data-${attr}="${id}"]`).click();
          assert.equal(await input.inputValue(), code);
          assert.equal(
            await page.locator(`[data-${attr}][aria-pressed="true"]`).getAttribute(`data-${attr}`),
            id,
          );
        }
        assert.equal(await page.locator('#feedback').textContent(), '');
        assert.equal(await page.locator('#header-score').textContent(), `0 / ${challengeCount}`);

        const wrong = choices.find(({ code }) => code !== question.answer);
        await page.locator(`[data-${attr}="${wrong.id}"]`).click();
        await page.locator('#submit-answer').click();
        await page.locator('#feedback.retry').waitFor();
        // The game rate-limits submissions within 750 ms.
        await page.waitForTimeout(800);

        const correct = choices.find(({ code }) => code === question.answer);
        await page.locator(`[data-${attr}="${correct.id}"]`).click();
        await page.locator('#submit-answer').click();
        await page.locator('.result-visual.is-correct').waitFor();
        assert.equal(await page.locator('#header-score').textContent(), `1 / ${challengeCount}`);
        console.log(
          `PASS ${engine.name()} mission ${question.id}: selection, submission and grading`,
        );
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}
