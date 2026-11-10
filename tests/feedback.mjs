import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { challenges, challengeCount } from './live-catalog.mjs';
import { mkdir } from 'node:fs/promises';

const base = process.env.CTF_TEST_URL || 'http://127.0.0.1:3000';
await mkdir('test-results', { recursive: true });
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const theme of ['light', 'dark'])
      for (const reducedMotion of ['no-preference', 'reduce']) {
        const page = await browser.newPage({
          viewport: { width: 390, height: 844 },
          reducedMotion,
          colorScheme: theme,
        });
        page.setDefaultTimeout(12000);
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.addInitScript((savedTheme) => {
          // Legacy dark preferences must not override the fixed white background.
          localStorage.setItem('ctf-background-theme', savedTheme);
          window.resultAnimationCount = 0;
          const animate = Element.prototype.animate;
          Element.prototype.animate = function (...args) {
            window.resultAnimationCount++;
            return animate.apply(this, args);
          };
        }, theme);
        await page.goto(`${base}/#home`);
        await page.locator('.mascot-duo').waitFor();
        assert.equal(await page.locator('#theme-toggle').count(), 0);
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
        assert.equal(
          await page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor),
          'rgb(255, 255, 255)',
        );
        const asset = await page.request.get(`${base}/assets/rai-rii-cutout.png`);
        assert.equal(asset.status(), 200);
        assert.match(asset.headers()['content-type'], /image\/png/);
        if (engine === chromium && theme === 'light' && reducedMotion === 'no-preference') {
          await page.screenshot({ path: 'test-results/mascot-home.png', fullPage: true });
        }
        await page.locator('.hero-actions a').first().click();
        await page.locator('#flag-input').fill(challenges[0].answer + '_WRONG');
        await page.locator('#submit-answer').click();
        await page.locator('.feedback.retry').waitFor();
        assert.match(
          await page
            .locator('.feedback.retry .mascot')
            .evaluate((el) => getComputedStyle(el).backgroundImage),
          /rii-retry\.png/,
        );
        assert.equal(await page.locator('#flag-input').getAttribute('aria-invalid'), 'true');
        assert.match(await page.locator('#feedback').textContent(), /不正解/);
        const retryAnimations = await page.evaluate(() => window.resultAnimationCount);
        assert.equal(retryAnimations, reducedMotion === 'reduce' ? 0 : 1);
        if (engine === chromium && theme === 'light' && reducedMotion === 'no-preference') {
          await page.locator('#feedback').screenshot({ path: 'test-results/answer-retry.png' });
        }
        // The game intentionally rate-limits answers submitted within 750 ms.
        await page.waitForTimeout(800);
        await page.locator('#flag-input').fill(challenges[0].answer);
        await page.locator('#submit-answer').click();
        await page.locator('.result-visual.is-correct').waitFor();
        assert.match(
          await page.locator('.is-correct .character-art').getAttribute('src'),
          /rai-smile-jump\.png/,
        );
        assert.equal(await page.locator('#header-score').textContent(), `1 / ${challengeCount}`);
        assert.equal(await page.locator('#flag-input').getAttribute('aria-invalid'), null);
        assert.ok((await page.locator('.feedback.retry').count()) === 0);
        assert.equal(
          await page.evaluate(() => window.resultAnimationCount),
          reducedMotion === 'reduce' ? 0 : 3,
        );
        assert.equal(await page.locator('.confetti').isVisible(), reducedMotion !== 'reduce');
        for (const width of [320, 390, 768, 1440]) {
          await page.setViewportSize({ width, height: 844 });
          assert.ok(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          );
        }
        await page.setViewportSize({ width: 390, height: 844 });
        if (engine === chromium && reducedMotion === 'no-preference') {
          await page
            .locator('#explanation')
            .screenshot({ path: `test-results/answer-correct-${theme}.png` });
        }
        await page.reload();
        await page.locator('.result-visual.is-correct').waitFor();
        assert.equal(
          await page.evaluate(() => window.resultAnimationCount),
          0,
          'restored progress must not replay celebration',
        );
        assert.equal(await page.locator('.confetti').count(), 0);
        await page.goto(`${base}/#mission-2`);
        await page.locator('#explanation-button').click();
        await page.locator('#confirm-ok').click();
        await page.locator('.result-visual.is-learned').waitFor();
        assert.equal(await page.locator('.is-learned .mascot-success').count(), 0);
        assert.equal(await page.locator('#header-score').textContent(), `1 / ${challengeCount}`);
        assert.equal(
          await page.locator('.confetti').count(),
          0,
          'assisted learning is distinct from correct answer',
        );
        assert.deepEqual(errors, []);
        console.log(
          `PASS ${engine.name()} saved-${theme} ${reducedMotion}: white background, no switch, wrong/correct, motion, restore, assisted learning, layout`,
        );
        await page.close();
      }
  } finally {
    await browser.close();
  }
}
