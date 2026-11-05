import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { challenges } from './live-catalog.mjs';

const base = process.env.CTF_TEST_URL || 'http://127.0.0.1:3000';
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const action of ['answer', 'explanation']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      page.setDefaultTimeout(12000);
      let releaseView;
      let releaseRestore;
      let seeView;
      let seeRestore;
      const viewGate = new Promise((resolve) => {
        releaseView = resolve;
      });
      const restoreGate = new Promise((resolve) => {
        releaseRestore = resolve;
      });
      const viewSeen = new Promise((resolve) => {
        seeView = resolve;
      });
      const restoreSeen = new Promise((resolve) => {
        seeRestore = resolve;
      });
      const actions = [];
      try {
        await page.route('**/api/game', async (route) => {
          const requestAction = route.request().postDataJSON()?.action;
          if (requestAction) actions.push(requestAction);
          if (requestAction === 'view') {
            seeView();
            await viewGate;
          }
          if (requestAction === 'restore') {
            seeRestore();
            await restoreGate;
          }
          await route.continue();
        });
        await page.goto(`${base}/#mission-1`);
        await viewSeen;
        if (action === 'answer') {
          await page.locator('#flag-input').fill(challenges[0].answer);
          await page.locator('#submit-answer').click();
        } else {
          await page.locator('#explanation-button').click();
          await page.locator('#confirm-ok').click();
        }
        releaseView();
        await restoreSeen;
        assert.deepEqual(
          actions,
          ['view', 'restore'],
          'restore must finish before queued user actions',
        );
        assert.equal(await page.locator('.result-visual').count(), 0);
        releaseRestore();
        await page.locator('.result-visual').waitFor();
        await page.evaluate(() => {
          window.firstResult = document.querySelector('.result-visual');
          document.querySelector('.next-actions .primary').focus({ preventScroll: true });
        });
        await page.evaluate(
          () =>
            new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        );
        assert.ok(
          await page.evaluate(() => firstResult.isConnected),
          'initial restore must not replace the result after a queued action',
        );
        assert.ok(
          await page
            .locator('.next-actions .primary')
            .evaluate((el) => el === document.activeElement),
          'initial restore must not move keyboard focus after a queued action',
        );
        assert.equal(await page.locator('.confetti').count(), action === 'answer' ? 1 : 0);
        await page.locator('.next-actions .primary').click();
        await page.waitForFunction(() =>
          document.querySelector('.challenge-number')?.textContent.includes('問題 2 /'),
        );
        await page.waitForFunction(() => scrollY === 0, undefined, { timeout: 2000 });
        console.log(
          `PASS ${engine.name()} ${action}: restore precedes queued action, result and next navigation remain stable`,
        );
      } finally {
        releaseView();
        releaseRestore();
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}
