import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = process.env.CTF_TEST_URL || 'http://127.0.0.1:3000';
await mkdir('test-results', { recursive: true });
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(5000);
    const errors = [];
    let requests = 0;
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (request.postDataJSON()?.action === 'hint') requests++;
    });
    await page.goto(`${base}/#mission-1`);
    await page.locator('#hint-button').click();
    await page.locator('.hint-item').waitFor();

    async function toggleHint(index) {
      const item = page.locator('.hint-item').nth(index);
      const close = item.getByRole('button', { name: `ヒント ${index + 1}を閉じる` });
      const open = item.locator('.hint-reopen');
      const card = item.locator('.hint-card');
      const before = requests;
      await close.focus();
      await close.press('Enter');
      assert.ok(await card.isHidden());
      assert.ok(await open.evaluate((button) => button === document.activeElement));
      assert.equal(await open.getAttribute('aria-expanded'), 'false');
      await open.press('Space');
      assert.ok(await card.isVisible());
      assert.ok(await close.evaluate((button) => button === document.activeElement));
      assert.equal(await open.getAttribute('aria-expanded'), 'true');
      const bounds = await close.boundingBox();
      assert.ok(bounds.width >= 43.9 && bounds.height >= 43.9, JSON.stringify(bounds));
      assert.equal(requests, before, 'toggling must not request another hint');
    }

    await toggleHint(0);
    await page.getByRole('button', { name: 'ヒント 1を閉じる' }).click();
    await page.locator('#hint-button').click();
    await page.waitForFunction(() => document.querySelectorAll('.hint-item').length === 2);
    assert.ok(await page.locator('.hint-card').first().isHidden());
    assert.ok(await page.locator('.hint-card').nth(1).isVisible());
    assert.ok(await page.locator('#hint-button').isDisabled());
    assert.ok(await page.locator('#hint-button').isHidden());
    assert.ok(!(await page.locator('.hints-panel').textContent()).includes('すべてのヒント'));
    await page.getByRole('button', { name: 'ヒント 1を開く' }).click();
    await toggleHint(0);
    await toggleHint(1);
    await page.getByRole('button', { name: 'ヒント 2を閉じる' }).click();
    assert.ok(await page.locator('.hint-card').first().isVisible());
    await page.getByRole('button', { name: 'ヒント 1を閉じる' }).click();
    assert.ok(await page.locator('.hint-card').first().isHidden());
    await page.getByRole('button', { name: 'ヒント 2を開く' }).click();
    assert.ok(await page.locator('.hint-card').first().isHidden());
    await page.getByRole('button', { name: 'ヒント 1を開く' }).click();
    await page
      .locator('.hints-panel')
      .screenshot({ path: `test-results/hints-${engine.name()}.png`, animations: 'disabled' });
    await page.getByRole('button', { name: 'ヒント 1を閉じる' }).click();
    await page.locator('.hints-panel').screenshot({
      path: `test-results/hints-closed-${engine.name()}.png`,
      animations: 'disabled',
    });
    await page.reload();
    await page.locator('.hint-item').first().waitFor();
    assert.equal(await page.locator('.hint-item').count(), 2);
    assert.equal(await page.locator('.hint-card:not(.hidden)').count(), 0);
    assert.equal(await page.getByRole('button', { name: /ヒント [12]を開く/ }).count(), 2);
    await page.locator('.hints-panel').screenshot({
      path: `test-results/hints-default-closed-${engine.name()}.png`,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'ヒント 1を開く' }).click();
    await page.getByRole('button', { name: 'ヒント 2を開く' }).click();
    await toggleHint(0);
    await toggleHint(1);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await toggleHint(0);
      await toggleHint(1);
    }
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${engine.name()}: independent hint cards, focus, keyboard, touch targets, restoration, no extra requests, five viewport widths`,
    );
  } finally {
    await browser.close();
  }
}
