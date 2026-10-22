import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base = process.env.CTF_TEST_URL || 'http://127.0.0.1:3000';
await mkdir('test-results', { recursive: true });
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      ...(engine === chromium ? { permissions: ['clipboard-read', 'clipboard-write'] } : {}),
    });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const { mission, attr, detail, codes } of [
      {
        mission: 5,
        attr: 'device',
        detail: '#device-detail',
        codes: [
          ['C', 'CHARLIE'],
          ['A', 'ALPHA'],
          ['B', 'BRAVO'],
        ],
      },
      {
        mission: 6,
        attr: 'record',
        detail: '#record-detail',
        codes: [
          ['A03', 'ROCK'],
          ['A01', 'PINE'],
          ['A02', 'TRACE'],
        ],
      },
    ]) {
      const [firstId, firstCode] = codes[0];
      await page.goto(`${base}/#mission-${mission}`);
      // Hash navigation retains navigator; clear simulated clipboard failures.
      await page.reload();
      await page.locator(`[data-${attr}="${firstId}"]`).waitFor();
      const copy = page.getByRole('button', { name: '選んだコードをコピー', exact: true });
      assert.equal(await copy.count(), 1, 'copy control is discoverable before choosing a device');
      assert.ok(await copy.isDisabled());
      const input = page.locator('#flag-input');
      for (const [id, code] of codes) {
        await page.locator(`[data-${attr}="${id}"]`).click();
        assert.ok(await copy.isEnabled());
        assert.equal(
          await page.locator('#copy-code-status').textContent(),
          '下の入力欄に貼り付けて使えます。',
        );
        await copy.click();
        await page.waitForFunction(() =>
          document.querySelector('#copy-code-status').textContent.includes('コピーしました'),
        );
        assert.ok((await page.locator('#copy-code-status').textContent()).includes(code));
        // Windows headless WebKit cannot paste from its isolated clipboard.
        if (engine === chromium) {
          await input.fill('');
          await input.focus();
          await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
          assert.equal(await input.inputValue(), code, 'paste contains only the selected code');
        }
      }
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        const control = await copy.boundingBox();
        const detailBox = await page.locator(detail).boundingBox();
        assert.ok(control.width >= 44 && control.height >= 44);
        assert.ok(
          control.y >= detailBox.y + detailBox.height &&
            control.y - detailBox.y - detailBox.height < 40,
        );
        assert.ok(control.x >= 0 && control.x + control.width <= width);
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        );
        if (width === 390 || width === 1440)
          await page
            .locator('#mission-material')
            .screenshot({ path: `test-results/copy-${mission}-${engine.name()}-${width}.png` });
      }
      for (const mode of ['denied', 'unavailable']) {
        await page.reload();
        await page.locator(`[data-${attr}="${firstId}"]`).click();
        await input.fill('KEEP');
        // Only the browser permission/availability boundary is simulated.
        await page.evaluate((mode) => {
          Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value:
              mode === 'unavailable'
                ? undefined
                : {
                    writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')),
                  },
          });
        }, mode);
        await copy.click();
        await page.waitForFunction(() =>
          document
            .querySelector('#copy-code-status')
            .textContent.includes('コピーできませんでした'),
        );
        assert.ok((await page.locator(detail).textContent()).includes(firstCode));
        assert.ok(await copy.isEnabled(), 'copy can be retried after failure');
        assert.equal(await input.inputValue(), 'KEEP', 'failed copy preserves entered text');
      }
    }
    assert.deepEqual(errors, []);
    console.log(
      `PASS ${engine.name()}: logs and records copy feedback, selection changes, responsive layout, denied/unavailable clipboard${engine === chromium ? ', native paste verified' : ''}`,
    );
  } finally {
    await browser.close();
  }
}
