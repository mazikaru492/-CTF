import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { challenges } from './live-catalog.mjs';

const base = process.env.CTF_TEST_URL || 'http://127.0.0.1:3000';
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  let release;
  try {
    const first = await context.newPage();
    const second = await context.newPage();
    for (const [page, id] of [
      [first, 1],
      [second, 2],
    ]) {
      page.setDefaultTimeout(12000);
      const restored = page.waitForResponse(
        (response) => response.request().postDataJSON()?.action === 'restore',
      );
      await page.goto(`${base}/#mission-${id}`);
      await (await restored).finished();
    }
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    let seeAnswer;
    const answerSeen = new Promise((resolve) => {
      seeAnswer = resolve;
    });
    await first.route('**/api/game', async (route) => {
      if (route.request().postDataJSON()?.action === 'answer') {
        seeAnswer();
        await gate;
      }
      await route.continue();
    });
    await first.locator('#flag-input').fill(challenges[0].answer);
    await first.locator('#submit-answer').click();
    await answerSeen;
    await second.locator('#hint-button').click();
    release();
    await first.locator('.result-visual.is-correct').waitFor();
    await second.locator('.hint-item').waitFor();
    const response = await context.request.get(`${base}/api/game`);
    const state = (await response.json()).progress;
    assert.deepEqual(state.solved, [1], 'the answer from the first tab must remain saved');
    assert.equal(state.hints[1], 1, 'the hint from the second tab must remain saved');
    for (const page of [first, second]) {
      await page.reload();
      await page.waitForFunction(() =>
        document.querySelector('#header-score').textContent.startsWith('1 /'),
      );
    }
    await first.locator('.result-visual.is-correct').waitFor();
    await second.locator('.hint-item').waitFor();
    console.log(
      `PASS ${engine.name()}: simultaneous answer/hint in separate tabs preserve both changes after reload`,
    );
  } finally {
    release?.();
    await context.close();
    await browser.close();
  }
}
