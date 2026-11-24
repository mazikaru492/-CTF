import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { official } from '../public/scripts/pages.js';

const base = process.env.CTF_TEST_URL || 'http://127.0.0.1:3000';
const cooldownMs = 45_000;
const intelligenceHome = 'https://www.mod.go.jp/dih/';
await mkdir('test-results', { recursive: true });

function scrollToFraction(page, fraction) {
  return page.evaluate(async (fraction) => {
    await new Promise(requestAnimationFrame);
    const top = Math.ceil((document.documentElement.scrollHeight - innerHeight) * fraction);
    window.scrollTo({ top, behavior: 'instant' });
    await new Promise(requestAnimationFrame);
    return top;
  }, fraction);
}

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const method of [
      'close',
      'close-redirect',
      'backdrop',
      'escape',
      'cta',
      'fallback',
      'bottom-close',
      'bottom-redirect',
    ]) {
      const bottomPlacement = method.startsWith('bottom-');
      const destination = bottomPlacement ? intelligenceHome : official;
      const width =
        method === 'cta' ? 1440 : method === 'escape' ? 844 : method === 'backdrop' ? 320 : 390;
      const height = method === 'escape' ? 390 : 844;
      const context = await browser.newContext({
        viewport: { width, height },
        reducedMotion: method === 'escape' ? 'reduce' : 'no-preference',
      });
      const page = await context.newPage();
      try {
        const firstShownAt = new Date('2026-11-24T00:00:00Z');
        if (method === 'escape')
          await page.clock.setFixedTime(new Date(firstShownAt.getTime() - 1));
        await page.route(destination, (route) => route.fulfill({ body: 'Official destination' }));
        if (method === 'fallback')
          await page.addInitScript(() => {
            HTMLDialogElement.prototype.showModal = undefined;
            HTMLDialogElement.prototype.close = undefined;
          });
        await page.goto(`${base}/#result`);
        await page.locator('.result-hero').waitFor();
        const dialog = page.locator('#contest-promo');
        assert.ok(await dialog.isHidden());
        assert.equal(
          await dialog.getByRole('button', { name: '今回は見送る', includeHidden: true }).count(),
          0,
        );
        const before = await scrollToFraction(page, 0.49);
        await page.waitForFunction((top) => Math.abs(scrollY - top) <= 1, before);
        assert.ok(await dialog.isHidden());

        if (method === 'escape') {
          const legacyExpiry = firstShownAt.getTime() - cooldownMs + 30 * 60 * 1000;
          await page.evaluate(
            (expiry) => localStorage.setItem('ctf-contest-promo-next-at', String(expiry)),
            legacyExpiry,
          );
          await scrollToFraction(page, 0.5);
          assert.ok(
            await dialog.isHidden(),
            'the previously saved display is still within 45 seconds',
          );
          await scrollToFraction(page, 0.49);
          await page.clock.setFixedTime(firstShownAt);
        }
        const midpoint = await scrollToFraction(page, 0.5);
        await page.locator('#contest-promo.is-visible').waitFor();
        let openedAt = midpoint;
        if (bottomPlacement) {
          assert.equal(await dialog.locator('.contest-promo-cta').getAttribute('href'), official);
          await page.keyboard.press('Escape');
          await dialog.waitFor({ state: 'hidden' });
          await scrollToFraction(page, 0.99);
          assert.ok(await dialog.isHidden(), 'the bottom promotion waits for the end of the page');
          openedAt = await scrollToFraction(page, 1);
          await page.locator('#contest-promo.is-visible').waitFor();
        }
        assert.equal(await dialog.locator('.contest-promo-cta').getAttribute('href'), destination);
        const card = dialog.locator('.contest-promo-card');
        assert.equal(
          await card.evaluate((el) => getComputedStyle(el).transitionDuration),
          method === 'escape' ? '0s' : '0.3s, 0.3s',
        );
        assert.equal(
          await dialog.evaluate(
            (el) =>
              getComputedStyle(
                el,
                el.classList.contains('dialog-fallback') ? '::before' : '::backdrop',
              ).backdropFilter,
          ),
          'blur(4px)',
        );
        await page.waitForFunction(
          () => document.querySelector('.contest-promo-art img').naturalWidth > 0,
        );
        assert.equal(
          await page.locator('body').evaluate((el) => parseInt(el.style.top, 10)),
          -openedAt,
        );
        assert.equal(await dialog.evaluate((el) => el.contains(document.activeElement)), true);
        await card.evaluate((el) =>
          Promise.all(el.getAnimations().map((animation) => animation.finished)),
        );
        const bounds = await card.boundingBox();
        assert.equal(Math.round(bounds.width), Math.min(470, width * 0.9));
        assert.equal(Math.round(bounds.x + bounds.width / 2), width / 2);
        assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= height);
        if (method === 'close' || method === 'cta')
          await card.screenshot({
            path: `test-results/contest-promo-${engine.name()}-${width}.png`,
          });

        const close = dialog.locator('.contest-promo-close');
        if (method === 'close') {
          await page.keyboard.press('Shift+Tab');
          assert.equal(
            await dialog
              .locator('.contest-promo-cta')
              .evaluate((el) => el === document.activeElement),
            true,
          );
          await page.keyboard.press('Tab');
          assert.equal(await close.evaluate((el) => el === document.activeElement), true);
        }
        if (['close', 'close-redirect', 'bottom-close', 'bottom-redirect'].includes(method)) {
          await page.evaluate(
            (randomValue) => {
              Math.random = () => randomValue;
            },
            method.endsWith('redirect') ? 0.03 : 0.029999,
          );
        }
        if (method.endsWith('redirect') || method === 'cta') {
          const action = method === 'cta' ? dialog.locator('.contest-promo-cta') : close;
          await Promise.all([page.waitForURL(destination), action.click()]);
          assert.equal(page.context().pages().length, 1);
          continue;
        }
        if (method === 'backdrop' || method === 'fallback') {
          const lockedAt = await page.evaluate(() => scrollY);
          await page.mouse.move(5, 5);
          await page.mouse.wheel(0, 400);
          await page.evaluate(() => new Promise(requestAnimationFrame));
          assert.equal(await page.evaluate(() => scrollY), lockedAt);
          await page.mouse.click(5, 5);
        } else if (method === 'close' || method === 'bottom-close') await close.click();
        else await page.keyboard.press('Escape');

        await dialog.waitFor({ state: 'hidden' });
        assert.equal(
          await page.locator('body').evaluate((el) => el.classList.contains('is-modal-open')),
          false,
        );
        assert.ok(Math.abs((await page.evaluate(() => scrollY)) - openedAt) <= 1);
        assert.equal(new URL(page.url()).hash, '#result');
        const bottom = await scrollToFraction(page, 0.9);
        await page.waitForFunction((top) => Math.abs(scrollY - top) <= 1, bottom);
        assert.ok(await dialog.isHidden());
        if (method === 'bottom-close') {
          await page.reload();
          await page.locator('.result-hero').waitFor();
          await scrollToFraction(page, 1);
          assert.ok(await dialog.isHidden(), 'the bottom promotion has its own cooldown');
        }
        if (method === 'escape') {
          const expiresAt = firstShownAt.getTime() + cooldownMs;
          const justBefore = new Date(expiresAt - 1);
          await page.clock.setFixedTime(justBefore);
          await page.reload();
          await page.locator('.result-hero').waitFor();
          await scrollToFraction(page, 0.9);
          assert.ok(await dialog.isHidden(), 'cooldown persists after reload');

          const otherTab = await page.context().newPage();
          try {
            await otherTab.clock.setFixedTime(justBefore);
            await otherTab.goto(`${base}/#result`);
            await otherTab.locator('.result-hero').waitFor();
            await scrollToFraction(otherTab, 0.9);
            assert.ok(
              await otherTab.locator('#contest-promo').isHidden(),
              'cooldown applies in another tab',
            );
          } finally {
            await otherTab.close();
          }

          await page.clock.setFixedTime(new Date(expiresAt));
          await scrollToFraction(page, 0.49);
          assert.ok(await dialog.isHidden());
          await scrollToFraction(page, 0.5);
          await dialog.waitFor();
          await page.clock.setFixedTime(new Date(expiresAt + cooldownMs));
          await page.keyboard.press('Escape');
          await dialog.waitFor({ state: 'hidden' });
          await scrollToFraction(page, 0.9);
          assert.ok(await dialog.isHidden(), 'restoring scroll must not reopen the dialog');
        }
      } finally {
        await context.close();
      }
    }
    console.log(
      `PASS ${engine.name()}: midpoint and bottom placements, close probability boundary, destinations and cooldowns`,
    );
  } finally {
    await browser.close();
  }
}
