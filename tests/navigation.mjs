import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { challenges } from './live-catalog.mjs';

const base = process.env.CTF_TEST_URL || 'http://127.0.0.1:3000';
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const width of [390, 1440]) {
      for (const reducedMotion of ['no-preference', 'reduce']) {
        const page = await browser.newPage({
          viewport: { width, height: 844 },
          reducedMotion,
        });
        page.setDefaultTimeout(12000);
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        const nextMission = async (id) => {
          const next = page.locator('#explanation .next-actions .primary');
          await next.scrollIntoViewIfNeeded();
          assert.ok(await page.evaluate(() => scrollY > 0), 'start below the problem heading');
          await next.click();
          await page.waitForFunction(
            (id) =>
              document.querySelector('.challenge-number')?.textContent.includes(`問題 ${id} /`),
            id,
          );
          await page.waitForFunction(() => scrollY === 0, undefined, { timeout: 2000 });
          const heading = await page.locator('.challenge-header h1').boundingBox();
          assert.ok(heading.y >= 0 && heading.y + heading.height <= 844, 'show the new heading');
        };
        try {
          await page.goto(`${base}/#mission-1`);
          await page.locator('#flag-input').fill(challenges[0].answer);
          await page.locator('#submit-answer').click();
          await page.locator('.result-visual.is-correct').waitFor();
          await nextMission(2);

          await page.locator('#explanation-button').click();
          await page.locator('#confirm-ok').click();
          await page.locator('.result-visual.is-learned').waitFor();
          await nextMission(3);
          assert.deepEqual(errors, []);
          console.log(
            `PASS ${engine.name()} ${width}px ${reducedMotion}: correct/learned → next problem at top`,
          );
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}
