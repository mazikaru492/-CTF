import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { challenges, challengeCount } from './live-catalog.mjs';

const base = process.env.CTF_TEST_URL || 'http://127.0.0.1:3000';
await mkdir('test-results', { recursive: true });

async function checkResultImage(page, complete) {
  await page.locator('.result-characters img').waitFor();
  await page.waitForFunction(
    () => document.querySelector('.result-characters img').naturalWidth > 0,
  );
  assert.equal(await page.locator('.result-hero.is-complete').count(), complete ? 1 : 0);
  assert.match(
    await page.locator('.result-characters img').getAttribute('src'),
    complete ? /duo-clear\.png/ : /rai-rii-laptop\.png/,
  );
  assert.ok(await page.locator('.result-characters img').getAttribute('alt'));
}

async function visitMission(page, id) {
  await page.goto(`${base}/#mission-${id}`);
  await page
    .locator('.challenge-number')
    .filter({ hasText: `問題 ${id} /` })
    .waitFor();
}

async function checkCharacterLayout(page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll('img.character-art')].every((image) => {
      const box = image.getBoundingClientRect();
      return (
        !box.height ||
        box.top >= innerHeight ||
        box.bottom <= 0 ||
        (image.complete && image.naturalWidth > 0)
      );
    }),
  );
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  const guide = page.locator('.hint-guide img');
  if (await guide.count()) {
    const image = await guide.boundingBox();
    const button = await page.locator('#hint-button').boundingBox();
    assert.ok(
      image.x + image.width <= button.x + 1 || image.y + image.height <= button.y + 1,
      'the guide must not cover the hint button',
    );
    assert.equal(await page.locator('#mission-material .character-art').count(), 0);
  }
}

const engines = process.argv.includes('--webkit')
  ? [webkit]
  : process.argv.includes('--chromium')
    ? [chromium]
    : [chromium, webkit];
for (const engine of engines) {
  const browser = await engine.launch();
  try {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('response', (response) => {
        if (response.url().includes('/assets/mascots/') && response.status() >= 400)
          errors.push(`asset ${response.status()}: ${response.url()}`);
      });
      await page.goto(`${base}/#home`);
      await page.locator('.mascot-welcome').waitFor();
      assert.equal(
        await page.locator('.mascot-duo img').count(),
        2,
        'both mascots welcome visitors',
      );
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await checkCharacterLayout(page);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      if (engine === chromium && reducedMotion === 'reduce') {
        await page.locator('.hero').screenshot({ path: 'test-results/mascot-welcome-390.png' });
        await page
          .locator('.intro-strip')
          .screenshot({ path: 'test-results/mascot-howto-390.png' });
      }
      await page.goto(`${base}/#mission-${challenges[0].id}`);
      await page.locator('.hints-panel').waitFor();
      assert.match(
        await page.locator('.hint-guide img').getAttribute('src'),
        /rii-guide-pointer\.png/,
      );
      await page.locator('#hint-button').click();
      await page.locator('.hint-item').first().waitFor();
      assert.ok(await page.locator('#hint-button').isEnabled(), 'character does not block hints');
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await checkCharacterLayout(page);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      if (engine === chromium && reducedMotion === 'reduce')
        await page
          .locator('.hints-panel')
          .screenshot({ path: 'test-results/mascot-guide-390.png' });
      await page.goto(`${base}/#result`);
      await checkResultImage(page, false);
      assert.equal(await page.locator('.result-characters .confetti').count(), 0);

      const celebrationImages = new Set();
      for (const [index, question] of challenges.entries()) {
        await visitMission(page, question.id);
        await page.locator('#flag-input').fill(question.answer);
        // Match the server's answer rate limit while using the real submit flow.
        if (index) await page.waitForTimeout(800);
        const response = page.waitForResponse(
          (response) =>
            response.url().endsWith('/api/game') &&
            response.request().method() === 'POST' &&
            response.request().postDataJSON()?.action === 'answer',
        );
        await page.locator('#submit-answer').click();
        const answerResponse = await response;
        const result = await answerResponse.json();
        assert.equal(
          answerResponse.status(),
          200,
          `${engine.name()} ${question.id}: ${result.error}`,
        );
        assert.equal(result.correct, true, `${engine.name()} ${question.id}: answer rejected`);
        await page.locator('.result-visual.is-correct .mascot-success').waitFor();
        celebrationImages.add(await page.locator('.mascot-success').getAttribute('src'));
        if (
          engine === chromium &&
          reducedMotion === 'reduce' &&
          [0, 1, challengeCount - 1].includes(index)
        )
          await page.locator('.result-visual').screenshot({
            path: `test-results/mascot-correct-${index + 1}-390.png`,
            animations: 'disabled',
          });
        if (index === 0) {
          await page.goto(`${base}/#result`);
          await checkResultImage(page, false);
        }
      }
      if (challengeCount >= 3)
        assert.ok(celebrationImages.size >= 3, 'Rai, Rii and the duo celebrate');
      await page.locator('#explanation .next-actions .primary').click();
      await checkResultImage(page, true);
      assert.match(
        await page.locator('.result-score').textContent(),
        new RegExp(`${challengeCount}\\s*/\\s*${challengeCount}`),
      );
      assert.match(await page.locator('.result-cheer').textContent(), /全問正解、おめでとう/);
      assert.equal(
        await page.locator('.result-characters .confetti').isVisible(),
        reducedMotion !== 'reduce',
      );
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          `${engine.name()} ${width}px overflow`,
        );
        const image = await page.locator('.result-characters img').boundingBox();
        const copy = await page.locator('.result-copy').boundingBox();
        assert.ok(image.width >= 240, 'both expressions remain readable');
        assert.ok(
          image.x + image.width <= copy.x + 1 || image.y + image.height <= copy.y + 1,
          'characters and result text do not overlap',
        );
        if (engine === chromium && reducedMotion === 'reduce' && [390, 1440].includes(width))
          await page.screenshot({
            path: `test-results/mascot-complete-${width}.png`,
            fullPage: true,
          });
      }
      await page.reload();
      await checkResultImage(page, true);
      assert.deepEqual(errors, []);
      await page.close();
      console.log(
        `PASS ${engine.name()} ${reducedMotion}: empty/partial/all-correct results, real answers, images, layout, restore`,
      );
    }

    const assisted = await browser.newPage();
    for (const question of challenges) {
      await visitMission(assisted, question.id);
      await assisted.locator('#explanation-button').click();
      await assisted.locator('#confirm-ok').click();
      await assisted.locator('.result-visual.is-learned').waitFor();
      assert.match(
        await assisted.locator('.is-learned img.character-art').getAttribute('src'),
        /rii-wave\.png/,
      );
    }
    await assisted.goto(`${base}/#result`);
    await checkResultImage(assisted, false);
    assert.equal(await assisted.locator('.result-characters .confetti').count(), 0);
    assert.match(
      await assisted.locator('.result-score').textContent(),
      new RegExp(`0\\s*/\\s*${challengeCount}`),
    );
    await assisted.close();
    console.log(
      `PASS ${engine.name()}: assisted learning does not trigger all-correct celebration`,
    );
  } finally {
    await browser.close();
  }
}
