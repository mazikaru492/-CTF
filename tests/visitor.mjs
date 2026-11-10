import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { challenges, challengeCount } from './live-catalog.mjs';

const base = process.env.CTF_TEST_URL || 'http://127.0.0.1:3000';
const label = new URL(base).hostname === '127.0.0.1' ? 'local' : 'published';
await mkdir('test-results', { recursive: true });
const report = {
  base,
  date: new Date().toISOString(),
  physicalDevices: false,
  checks: [],
  errors: [],
};
async function mission(page, id) {
  try {
    await page.waitForFunction(
      (id) => document.querySelector('.challenge-number')?.textContent.includes(`問題 ${id} /`),
      id,
    );
  } catch (error) {
    error.message += JSON.stringify(
      await page.evaluate(() => ({
        hash: location.hash,
        heading: document.querySelector('.challenge-number')?.textContent,
        score: document.querySelector('#header-score')?.textContent,
        feedback: document.querySelector('#feedback')?.textContent,
        next: document.querySelector('#explanation .primary')?.getAttribute('href'),
      })),
    );
    throw error;
  }
}
async function atTop(page) {
  await page.waitForFunction(() => scrollY === 0);
  const bounds = await page.locator('main h1').boundingBox();
  assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= page.viewportSize().height);
}
async function auditMaterials(page, question) {
  const { material: m, kind } = question;
  if (kind === 'cipher') {
    const decoded = [...m.cipher]
      .map((c) => String.fromCharCode(((c.charCodeAt(0) - 66 + 26) % 26) + 65))
      .join('');
    assert.equal(decoded, question.answer);
  }
  if (kind === 'ascii') assert.equal(String.fromCharCode(...m.numbers), question.answer);
  if (kind === 'compare') {
    for (const [name, source] of [
      ['after', m.after],
      ['before', m.before],
      ['after', m.after],
    ]) {
      await page.locator(`[data-compare="${name}"]`).click();
      assert.equal(await page.locator('.image-open img').getAttribute('src'), source);
      assert.equal(
        await page.locator(`[data-compare="${name}"]`).getAttribute('aria-pressed'),
        'true',
      );
      assert.match(
        await page.locator('#compare-caption').textContent(),
        name === 'before' ? /変更前/ : /変更後/,
      );
    }
  }
  if (['image', 'compare', 'final'].includes(kind)) {
    await page.locator('.text-clue summary').click();
    assert.equal(await page.locator('.text-clue p').textContent(), m.textDetail);
    await page.locator('.image-open').click();
    await page.waitForFunction(() => document.querySelector('#zoom-image').naturalWidth > 0);
    assert.equal(await page.locator('#zoom-label').textContent(), '100%');
    assert.ok(await page.locator('#zoom-out').isDisabled());
    for (let i = 0; i < 6; i++) await page.locator('#zoom-in').click();
    assert.equal(await page.locator('#zoom-label').textContent(), '400%');
    assert.ok(await page.locator('#zoom-in').isDisabled());
    assert.ok(
      await page.locator('#image-scroll').evaluate((el) => el.scrollWidth > el.clientWidth),
    );
    await page.locator('#zoom-out').click();
    assert.equal(await page.locator('#zoom-label').textContent(), '350%');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#image-dialog').evaluate((el) => el.open), false);
    assert.equal(
      await page.locator('body').evaluate((el) => el.classList.contains('is-modal-open')),
      false,
    );
    if (!(await page.locator('.image-open').evaluate((el) => el === document.activeElement)))
      report.errors.push(
        `${page.context().browser().browserType().name()} ${page.viewportSize().width}px problem ${question.id}: image dialog did not return focus to its opener`,
      );
  }
  if (kind === 'logs' || kind === 'records') {
    const attr = kind === 'logs' ? 'device' : 'record';
    for (const item of kind === 'logs' ? m.devices : m.backup) {
      await page.locator(`[data-${attr}="${item.id}"]`).click();
      assert.equal(
        await page.locator(`#${attr}-detail`).textContent(),
        `${item.id} のコード：${item.code}`,
      );
      assert.equal(await page.locator(`[data-${attr}][aria-pressed="true"]`).count(), 1);
    }
  }
  if (kind === 'order') {
    const sorted = [...m.cards].sort((a, b) => a.time.localeCompare(b.time));
    for (let target = 0; target < sorted.length; target++) {
      const id = sorted[target].id;
      let position = await page
        .locator('.order-card')
        .evaluateAll(
          (rows, id) =>
            rows.findIndex((row) => row.querySelector('[data-move]').dataset.move === id),
          id,
        );
      while (position > target) {
        const control = page.locator(`[data-move="${id}"][data-dir="up"]`);
        if (page.viewportSize().width === 390) await control.tap();
        else await control.click();
        position--;
        await page.waitForFunction(
          ({ id, position }) =>
            [...document.querySelectorAll('.order-card')].findIndex(
              (row) => row.querySelector('[data-move]').dataset.move === id,
            ) === position,
          { id, position },
        );
      }
    }
    assert.equal(await page.locator('#order-result').textContent(), question.answer);
    assert.ok(await page.locator('.order-card').first().locator('[data-dir="up"]').isDisabled());
    assert.ok(await page.locator('.order-card').last().locator('[data-dir="down"]').isDisabled());
  }
}

for (const engine of process.argv.includes('--webkit') ? [webkit] : [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    for (const width of process.argv.includes('--mobile') ? [390] : [390, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        isMobile: width === 390,
        hasTouch: width === 390,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', (error) =>
        report.errors.push(`${engine.name()} ${width}: ${error.message}`),
      );
      page.on('response', (response) => {
        if (response.status() >= 400)
          report.errors.push(
            `${engine.name()} ${width}: HTTP ${response.status()} ${response.url()}`,
          );
      });
      page.on('console', (message) => {
        if (message.type() === 'error' && /Content Security Policy|Refused to/.test(message.text()))
          report.errors.push(`${engine.name()} ${width}: ${message.text()}`);
      });
      try {
        await page.goto(base);
        await page.locator('.hero').waitFor();
        assert.equal(await page.locator('#header-score').textContent(), `0 / ${challengeCount}`);
        await page.locator('.site-header .brand').click();
        await page.locator('.hero').waitFor();
        await page.locator('.site-footer .footer-brand').click();
        await atTop(page);
        await page
          .locator(
            width === 390
              ? '.hero-actions a[href="#missions"]'
              : '.site-header a[href="#missions"]',
          )
          .click();
        await page.waitForFunction(() => {
          const bounds = document.querySelector('#missions-section').getBoundingClientRect();
          return bounds.top >= 0 && bounds.top < innerHeight;
        });
        assert.equal(await page.locator('.mission-card').count(), challengeCount);
        if (width === 1440) {
          await page.locator('.site-footer').scrollIntoViewIfNeeded();
          await page.locator('.site-header a[href="#missions"]').click();
          await page.waitForFunction(() => {
            const bounds = document.querySelector('#missions-section').getBoundingClientRect();
            return bounds.top >= 0 && bounds.top < innerHeight;
          });
        }
        await page.locator('.mission-card[href="#mission-1"]').click();
        await mission(page, 1);
        await atTop(page);
        if (width === 390) {
          assert.ok(await page.locator('.mission-nav-arrow[disabled]').isDisabled());
          await page.locator('.mission-nav-controls a').click();
          await mission(page, 2);
          await page.locator('.mission-nav-controls a').first().click();
          await mission(page, 1);
          await page.locator('.mission-picker summary').click();
          await page.locator(`.mission-picker a[href="#mission-${challengeCount}"]`).click();
          await mission(page, challengeCount);
        } else {
          await page.locator(`.mission-sidebar a[href="#mission-${challengeCount}"]`).click();
          await mission(page, challengeCount);
        }
        await page
          .locator(
            width === 390 ? '.site-footer a[href="#about"]' : '.site-header a[href="#about"]',
          )
          .click();
        await page.locator('.about').waitFor();
        await atTop(page);
        await page.locator('.site-header a[href="#result"]').click();
        await page.locator('.result-hero').waitFor();
        assert.match(await page.locator('.result-score').textContent(), /^0/);
        await page.locator('.site-footer').scrollIntoViewIfNeeded();
        await page.locator('.site-header a[href="#result"]').click();
        await atTop(page);
        await page.locator('.result-hero .primary').click();
        await mission(page, 1);
        const answerRequests = [];
        page.on('request', (request) => {
          if (request.url().endsWith('/api/game') && request.postDataJSON()?.action === 'answer')
            answerRequests.push(request);
        });
        for (const question of challenges) {
          await mission(page, question.id);
          await auditMaterials(page, question);
          if (width === 390) await page.locator('#hint-button').tap();
          else await page.locator('#hint-button').click();
          await page
            .waitForFunction(() => document.querySelectorAll('.hint-item').length === 1)
            .catch(async (error) => {
              error.stack += JSON.stringify({
                engine: engine.name(),
                width,
                questionId: question.id,
                state: await page.evaluate(() => ({
                  hash: location.hash,
                  hints: document.querySelectorAll('.hint-item').length,
                  button: document.querySelector('#hint-button')?.textContent,
                  feedback: document.querySelector('#hint-feedback')?.textContent,
                })),
              });
              throw error;
            });
          assert.ok((await page.locator('.hint-item').textContent()).includes(question.hints[0]));
          if (question.id === 2) {
            await page.reload();
            await page.waitForFunction(() => document.querySelectorAll('.hint-item').length === 1);
          }
          if (width === 390) await page.locator('#hint-button').tap();
          else await page.locator('#hint-button').click();
          await page.waitForFunction(() => document.querySelectorAll('.hint-item').length === 2);
          assert.ok(await page.locator('#hint-button').isDisabled());
          const input = page.locator('#flag-input');
          if (question.id === 1) {
            const before = answerRequests.length;
            await page.locator('#submit-answer').click();
            assert.equal(await input.evaluate((el) => el.validity.valueMissing), true);
            assert.equal(answerRequests.length, before);
            // Dismiss native validation as a user would before entering another answer.
            if (width === 390) await input.tap();
            else await input.click();
            await input.fill('WRONG');
            await page.locator('#submit-answer').click();
            await page.locator('.feedback.retry').waitFor();
            assert.equal(await input.getAttribute('aria-invalid'), 'true');
          }
          await input.fill(question.answer);
          await page.locator('#material-shortcut').click();
          await page.waitForFunction(() => {
            const bounds = document.querySelector('#mission-material').getBoundingClientRect();
            return bounds.top >= 0 && bounds.top < innerHeight;
          });
          await page.waitForTimeout(800);
          const normalized =
            question.id === 2
              ? ` flag{${question.answer.toLowerCase()}} `
              : question.answer
                  .toLowerCase()
                  .replace(/[a-z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0));
          await input.fill(normalized);
          await page.locator('#submit-answer').click();
          await page.locator('.result-visual.is-correct').waitFor();
          assert.equal(
            await page.locator('#header-score').textContent(),
            `${question.id} / ${challengeCount}`,
          );
          assert.equal(await page.locator('.answer-display').textContent(), question.answer);
          const next = page.locator('#explanation .next-actions .primary');
          assert.equal(
            await next.getAttribute('href'),
            question.id === challengeCount ? '#result' : `#mission-${question.id + 1}`,
          );
          await next.click();
          if (question.id < challengeCount) {
            await mission(page, question.id + 1);
            await atTop(page);
          }
        }
        await page.locator('.result-hero').waitFor();
        await atTop(page);
        assert.equal(
          await page.locator('.result-row .state').filter({ hasText: '✓ 正解' }).count(),
          challengeCount,
        );
        assert.match(await page.locator('.result-hero').textContent(), /未完了：0問/);
        await page.reload();
        await page.locator('.result-hero').waitFor();
        assert.equal(
          await page.locator('#header-score').textContent(),
          `${challengeCount} / ${challengeCount}`,
        );
        if (engine === chromium)
          await page.screenshot({
            path: `test-results/${label}-completed-${width}.png`,
            fullPage: true,
          });
        await page.locator('.result-hero .hero-actions a').click();
        await mission(page, 1);
        await page.locator('.result-visual.is-correct').waitFor();
        assert.equal(await page.locator('.confetti').count(), 0);
        assert.equal(await page.locator('.hint-item').count(), 2);
        await page.goBack();
        await page.locator('.result-hero').waitFor();
        await page.locator('#reset-progress').click();
        await page.keyboard.press('Escape');
        assert.equal(
          await page.locator('#header-score').textContent(),
          `${challengeCount} / ${challengeCount}`,
        );
        await page.locator('#reset-progress').click();
        await page.locator('#confirm-ok').click();
        await page.waitForFunction(
          (count) => document.querySelector('#header-score').textContent === `0 / ${count}`,
          challengeCount,
        );
        assert.equal(
          await page.locator('.result-row .state').filter({ hasText: '未挑戦' }).count(),
          challengeCount,
        );
        await page.reload();
        await page.locator('.result-hero').waitFor();
        assert.equal(await page.locator('#header-score').textContent(), `0 / ${challengeCount}`);
        report.checks.push(
          `${engine.name()} ${width}px: first visit, menus, all ${challengeCount} materials, 16 hints, blank/wrong/normalized answers, all solved, reload, review, back, reset`,
        );
        console.log(`PASS ${report.checks.at(-1)}`);
      } finally {
        await context.close();
      }
    }
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', (error) =>
      report.errors.push(`${engine.name()} recovery: ${error.message}`),
    );
    try {
      let blocked = 'initial';
      await page.route('**/api/game*', async (route) => {
        const action =
          route.request().method() === 'GET' ? 'initial' : route.request().postDataJSON()?.action;
        if (action === blocked) await route.abort('internetdisconnected');
        else await route.continue();
      });
      await page.goto(base);
      await page.locator('#retry').waitFor();
      blocked = '';
      await page.locator('#retry').click();
      await page.locator('.hero').waitFor();
      await page.locator('.hero-actions a').first().click();
      await mission(page, 1);
      blocked = 'hint';
      await page.locator('#hint-button').click();
      await page.waitForFunction(() =>
        document.querySelector('#hint-feedback').textContent.includes('通信環境'),
      );
      assert.ok(await page.locator('#hint-button').isEnabled());
      blocked = '';
      await page.locator('#hint-button').click();
      await page.locator('.hint-item').waitFor();
      blocked = 'explanation';
      await page.locator('#explanation-button').click();
      await page.locator('#confirm-ok').click();
      await page.waitForFunction(() =>
        document.querySelector('#feedback').textContent.includes('通信環境'),
      );
      assert.ok(await page.locator('#explanation').isHidden());
      blocked = '';
      await page.locator('#explanation-button').click();
      await page.locator('#confirm-ok').click();
      await page.locator('.result-visual.is-learned').waitFor();
      await page.locator('.site-header a[href="#result"]').click();
      await page.locator('.result-hero').waitFor();
      blocked = 'reset';
      await page.locator('#reset-progress').click();
      await page.locator('#confirm-ok').click();
      await page.waitForFunction(() =>
        document.querySelector('#reset-message').textContent.includes('通信環境'),
      );
      assert.ok(await page.locator('#reset-progress').isEnabled());
      assert.match(await page.locator('.result-hero').textContent(), /解説で学習：1問/);
      blocked = '';
      await page.locator('#reset-progress').click();
      await page.locator('#confirm-ok').click();
      await page.waitForFunction(() =>
        document.querySelector('.result-hero').textContent.includes('解説で学習：0問'),
      );
      report.checks.push(
        `${engine.name()}: initial load, hint, explanation and reset recover after network failure`,
      );
      console.log(`PASS ${report.checks.at(-1)}`);
    } finally {
      await context.close();
    }
  } catch (error) {
    report.errors.push(error.stack);
    process.exitCode = 1;
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}
await writeFile(`test-results/${label}-visitor-report.json`, JSON.stringify(report, null, 2));
assert.deepEqual(report.errors, [], 'Visitor flow and browser errors');
