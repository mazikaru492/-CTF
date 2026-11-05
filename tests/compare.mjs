import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { challenges } from './live-catalog.mjs';

const base = process.env.CTF_TEST_URL || 'http://127.0.0.1:3000';
const question = challenges.find((c) => c.id === 4);
await mkdir('test-results', { recursive: true });
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${base}/#mission-4`);
    await page.locator('.segmented').waitFor();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      let beforeSize;
      for (const state of ['before', 'after']) {
        await page.locator(`[data-compare="${state}"]`).tap();
        await page.waitForFunction((source) => {
          const image = document.querySelector('.image-open img');
          return image.complete && image.naturalWidth > 0 && image.getAttribute('src') === source;
        }, question.material[state]);
        const image = page.locator('.image-open img');
        assert.equal(await image.getAttribute('alt'), question.material[`${state}Alt`]);
        const size = await image.evaluate((el) => [el.naturalWidth, el.naturalHeight]);
        assert.ok(size[0] >= 1200, 'photographic evidence is detailed enough to enlarge');
        if (state === 'before') beforeSize = size;
        else assert.deepEqual(size, beforeSize, 'comparison keeps the same framing dimensions');
        assert.ok(
          !(await page.locator('#mission-material').textContent()).includes(question.answer),
        );
        assert.ok(!(await image.getAttribute('alt')).includes(question.answer));
        if ([390, 1440].includes(width))
          await page
            .locator('#mission-material')
            .screenshot({ path: `test-results/compare-${engine.name()}-${width}-${state}.png` });
        await page.locator('.image-open').tap();
        await page.locator('#zoom-in').tap();
        assert.equal(await page.locator('#zoom-label').textContent(), '150%');
        assert.equal(
          await page.locator('#zoom-image').getAttribute('src'),
          question.material[state],
        );
        await page.locator('#close-image').tap();
        assert.ok(await page.locator('#image-dialog').isHidden());
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.text-clue summary').tap();
    assert.equal(await page.locator('.text-clue p').textContent(), question.material.textDetail);
    await page.locator('#flag-input').fill('KSUTNE');
    await page.locator('#submit-answer').tap();
    await page.locator('.feedback.retry').waitFor();
    await page.waitForTimeout(800);
    await page.locator('#flag-input').fill(question.answer);
    await page.locator('#submit-answer').tap();
    await page.locator('.result-visual.is-correct').waitFor();
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${engine.name()}: photo comparison at 4 widths, touch zoom, equivalent text evidence, wrong/correct answer`,
    );
  } finally {
    await browser.close();
  }
}
