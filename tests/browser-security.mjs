import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { challengeCount } from '../server/challenges.mjs';

const base = process.env.CTF_TEST_URL || 'http://127.0.0.1:3000';
const report = { date: new Date().toISOString(), base, engines: [] };
for (const [name, engine] of [
  ['chromium', chromium],
  ['webkit', webkit],
]) {
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const route of [
      '#home',
      '#about',
      '#result',
      ...Array.from({ length: challengeCount }, (_, i) => `#mission-${i + 1}`),
    ]) {
      await page.goto(`${base}/${route}`);
      await page.locator('#main h1').waitFor();
      assert.equal(await page.locator('#retry').count(), 0, route);
      assert.equal(await page.locator('iframe').count(), 0, route);
    }
    await page.goto(`${base}/#mission-1%22%3E%3Cimg%20src=x%20onerror=alert(1)%3E`);
    await page.locator('.hero').waitFor();
    assert.equal(await page.locator('img[src="x"]').count(), 0);
    await page.goto(`${base}/#mission-1`);
    await page.locator('#flag-input').fill('<img src=x onerror=alert(1)>');
    await page.locator('#submit-answer').click();
    await page.locator('#feedback.retry').waitFor();
    assert.equal(await page.locator('#feedback img').count(), 0);
    await page.locator('#hint-button').click();
    await page.locator('#hint-items .hint-item').nth(0).waitFor();
    await page.locator('#hint-button').click();
    await page.locator('#hint-items .hint-item').nth(1).waitFor();
    await page.locator('#explanation-button').click();
    await page.locator('#confirm-ok').click();
    await page.locator('#explanation:not(.hidden)').waitFor();
    await page.reload();
    await page.locator('#explanation:not(.hidden)').waitFor();
    await page.goto(`${base}/#result`);
    await page.locator('#reset-progress').click();
    await page.locator('#confirm-ok').click();
    await page.waitForFunction(() =>
      document.querySelector('#header-score')?.textContent?.startsWith('0 /'),
    );
    assert.deepEqual(errors, []);
    report.engines.push({
      name,
      routes: challengeCount + 3,
      maliciousHashSafe: true,
      maliciousAnswerSafe: true,
      hintsExplanationRestoreReset: true,
      pageErrors: errors,
    });
  } finally {
    await browser.close();
  }
}
await mkdir('test-results', { recursive: true });
await writeFile('test-results/browser-security.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
