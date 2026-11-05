import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = process.env.CTF_TEST_URL || 'http://127.0.0.1:3000';
await mkdir('test-results', { recursive: true });
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    page.setDefaultTimeout(12000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${base}/#mission-8`);
    await page.locator('.email-card').first().waitFor();
    assert.equal(await page.locator('.email-card').count(), 4);
    assert.equal(await page.locator('.email-card a,.cipher,.alphabet,.image-open').count(), 0);
    assert.equal(await page.locator('#flag-input').inputValue(), '');
    assert.equal(await page.locator('#flag-input').getAttribute('placeholder'), '合言葉を入力');
    assert.ok((await page.locator('#input-note').textContent()).includes('入力例'));
    assert.ok((await page.locator('#input-note').textContent()).includes('AC'));
    assert.equal(await page.locator('[data-email-select],#use-email-flag').count(), 0);
    assert.ok(!(await page.locator('#mission-material').textContent()).includes('BD'));
    for (const [width, height] of [
      [320, 640],
      [390, 844],
      [768, 1024],
      [1024, 768],
      [800, 1280],
      [1280, 800],
    ]) {
      await page.setViewportSize({ width, height });
      assert.deepEqual(await page.locator('.email-fields code').allTextContents(), [
        'info@ctf.example',
        'https://ctf.example/entry',
        'info@ctf.example',
        'https://ctf.example.account-check.example/entry',
        'news@ctf.example',
        'https://ctf.example/guide',
        'info@ctf-support.example',
        'https://ctf.example/entry',
      ]);
      const clipped = await page.locator('.email-fields code').evaluateAll((elements) =>
        elements
          .filter((el) => {
            const card = el.closest('.email-card').getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(el);
            return [...range.getClientRects()].some(
              (r) => r.left < card.left - 1 || r.right > card.right + 1,
            );
          })
          .map((el) => el.textContent),
      );
      assert.deepEqual(
        clipped,
        [],
        `${engine.name()} ${width}: full addresses must fit within each card`,
      );
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if ([390, 768, 1024].includes(width))
        await page
          .locator('#mission-material')
          .screenshot({ path: `test-results/phishing-${engine.name()}-${width}.png` });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const wrong of ['SAFE', 'AC']) {
      await page.locator('#flag-input').fill(wrong);
      await page.locator('#submit-answer').tap();
      await page.waitForFunction(
        () => document.querySelector('#submit-answer')?.disabled === false,
      );
      await page.locator('.feedback.retry').waitFor();
      await page.waitForTimeout(800);
    }
    await page.locator('#flag-input').fill('BD');
    assert.equal(await page.locator('#flag-input').inputValue(), 'BD');
    await page
      .locator('#answer-form')
      .screenshot({ path: `test-results/phishing-filled-answer-${engine.name()}.png` });
    await page.locator('#submit-answer').tap();
    await page.locator('.result-visual.is-correct').waitFor();
    assert.equal(await page.locator('#flag-input').getAttribute('aria-invalid'), null);
    await page.reload();
    await page.locator('.result-visual.is-correct').waitFor();
    assert.deepEqual(errors, []);
    await page.context().clearCookies();
    await page.reload();
    await page.locator('#hint-button').tap();
    await page.waitForFunction(() => document.querySelectorAll('.hint-item').length === 1);
    await page.locator('#hint-button').tap();
    await page.waitForFunction(() => document.querySelectorAll('.hint-item').length === 2);
    assert.ok(await page.locator('#hint-button').isDisabled());
    assert.ok(await page.locator('#explanation').isHidden());
    console.log(
      `PASS ${engine.name()}: 6 phone/tablet sizes, direct text entry, sample/old answers rejected, correct answer/restoration, two hints`,
    );
  } finally {
    await browser.close();
  }
}
