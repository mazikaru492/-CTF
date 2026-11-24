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
    assert.equal(await page.locator('#flag-input').count(), 0);
    const choice = (id) => page.getByRole('checkbox', { name: id, exact: true });
    assert.equal(await choice('A').evaluate((el) => getComputedStyle(el).appearance), 'auto');
    const submit = page.locator('#submit-answer');
    const feedback = page.locator('#feedback');
    assert.deepEqual(
      await page
        .locator('[name="email"]')
        .evaluateAll((inputs) => inputs.map((input) => input.value)),
      ['A', 'B', 'C', 'D'],
    );
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
    const answers = [];
    page.on('request', (request) => {
      const body = request.postDataJSON();
      if (body?.action === 'answer') answers.push(body.answer);
    });
    for (const ids of [[], ['A'], ['A', 'B', 'C'], ['A', 'B', 'C', 'D']]) {
      for (const id of ['A', 'B', 'C', 'D']) await choice(id).setChecked(ids.includes(id));
      await submit.tap();
      assert.match(await feedback.textContent(), /2件選んで/);
      assert.deepEqual(answers, []);
    }
    await choice('B').uncheck();
    await choice('D').uncheck();
    await submit.tap();
    await page.locator('.feedback.retry').waitFor();
    assert.equal(await page.locator('.email-answer').getAttribute('aria-invalid'), 'true');
    await page.waitForTimeout(800);
    await choice('A').uncheck();
    await choice('C').uncheck();
    await choice('D').press('Space');
    await choice('B').check();
    assert.ok(await choice('D').isChecked());
    assert.equal(await feedback.textContent(), '');
    await page
      .locator('#answer-form')
      .screenshot({ path: `test-results/phishing-filled-answer-${engine.name()}.png` });
    await submit.tap();
    await page.locator('.result-visual.is-correct').waitFor();
    assert.deepEqual(answers, ['AC', 'BD']);
    assert.equal(await page.locator('.email-answer').getAttribute('aria-invalid'), null);
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
      `PASS ${engine.name()}: 6 phone/tablet sizes, exactly two selections, keyboard, grading and restoration, two hints`,
    );
  } finally {
    await browser.close();
  }
}
