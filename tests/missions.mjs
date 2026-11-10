import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';

const base = process.env.CTF_TEST_URL || 'http://127.0.0.1:3000';
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    page.setDefaultTimeout(5000);
    const errors = [];
    const requests = [];
    page.on('request', (request) => {
      const body = request.postDataJSON();
      if (body?.action === 'hint') requests.push({ action: body.action, id: body.id });
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.missionEntrances = 0;
      document.addEventListener('animationstart', (event) => {
        if (event.animationName === 'mission-enter') window.missionEntrances++;
      });
    });
    const { challenges } = await (await page.request.get(`${base}/api/game`)).json();
    await page.goto(`${base}/#mission-${challenges[0].id}`);
    for (const [index, question] of challenges.entries()) {
      if (index > 0) {
        await page.locator(`.mission-nav-row a[href="#mission-${question.id}"]`).tap();
      }
      await page.waitForFunction(
        (id) => document.querySelector('.challenge-number')?.textContent.includes(`問題 ${id} /`),
        question.id,
      );
      await page.waitForFunction((count) => window.missionEntrances === count, index + 1);
      assert.equal(
        await page.locator('.challenge').evaluate((el) => getComputedStyle(el).animationName),
        'mission-enter',
      );
      await page.locator('#hint-button').tap();
      await page.locator('.hint-card').first().waitFor();
      await page.locator('#hint-button').tap();
      await page
        .locator('.hint-card')
        .nth(1)
        .waitFor()
        .catch(async (error) => {
          error.stack += JSON.stringify({
            engine: engine.name(),
            questionId: question.id,
            requests,
            state: await page.evaluate(() => ({
              hash: location.hash,
              items: document.querySelectorAll('.hint-item').length,
              button: document.querySelector('#hint-button')?.textContent,
              disabled: document.querySelector('#hint-button')?.disabled,
              feedback: document.querySelector('#hint-feedback')?.textContent,
              active: document.activeElement?.outerHTML.slice(0, 300),
            })),
          });
          throw error;
        });
    }
    for (const question of challenges) {
      await page.goto(`${base}/#mission-${question.id}`);
      await page.locator('.hint-reopen').first().waitFor();
      assert.equal(await page.locator('.hint-card:not(.hidden)').count(), 0);
      assert.equal(await page.getByRole('button', { name: /ヒント [12]を開く/ }).count(), 2);
      await page.getByRole('button', { name: 'ヒント 1を開く' }).tap();
      await page.locator('.hint-card').first().waitFor();
      assert.ok(await page.locator('.hint-card').first().isVisible());
      assert.ok(await page.locator('.hint-card').nth(1).isHidden());
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await page.locator('.hint-reopen').first().waitFor();
    assert.equal(
      await page.locator('.challenge').evaluate((el) => getComputedStyle(el).animationName),
      'none',
    );
    assert.equal(await page.evaluate(() => window.missionEntrances), 0);
    assert.ok(await page.locator('#flag-input').isVisible());
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${engine.name()}: all ${challenges.length} missions animate on navigation, restored hints start closed, reduced motion supported`,
    );
  } finally {
    await browser.close();
  }
}
