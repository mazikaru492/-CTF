import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.CTF_TEST_URL || 'http://127.0.0.1:3000';
await mkdir('test-results', { recursive: true });
const report = { date: new Date().toISOString(), base, physicalDevices: false, checks: [], errors: [] };
const engines = { chromium, webkit };
const profiles = [
  ['android-small', 'chromium', 320, 640], ['android-phone', 'chromium', 360, 800],
  ['android-wide', 'chromium', 430, 932], ['android-landscape', 'chromium', 844, 390],
  ['android-tablet', 'chromium', 800, 1280], ['android-tablet-landscape', 'chromium', 1280, 800],
  ['iphone', 'webkit', 390, 844], ['iphone-landscape', 'webkit', 844, 390],
  ['ipad', 'webkit', 768, 1024], ['ipad-landscape', 'webkit', 1024, 768],
  ['desktop', 'chromium', 1440, 900], ['large-text', 'webkit', 390, 844, 2],
  ['keyboard-height', 'webkit', 390, 320],
];
async function route(page, hash) {
  await page.goto(`${base}/${hash}`);
  if (hash.startsWith('#mission-')) await page.locator('.challenge-number').filter({ hasText: `問題 ${hash.split('-')[1]} / 全8問` }).waitFor();
  else await page.locator(hash === '#about' ? '.about' : hash === '#result' ? '.result-hero' : '.hero').waitFor();
}
async function layout(page, name) {
  const metrics = await page.evaluate(() => {
    const width = innerWidth;
    const offenders = [...document.querySelectorAll('main *, header *, footer *')].filter(el => {
      const r = el.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > width + 1);
    }).map(el => `${el.tagName}.${el.className}`).slice(0, 8);
    return { width, scroll: document.documentElement.scrollWidth, offenders };
  });
  assert.ok(metrics.scroll <= metrics.width + 1, `${name}: horizontal overflow ${JSON.stringify(metrics)}`);
  const undersized = await page.evaluate(() => [...document.querySelectorAll('.btn,.icon-btn,.order-controls button,.device-btn,.segmented button,.mobile-missions>summary')].filter(el => {
    const r = el.getBoundingClientRect(); return r.width && r.height && (r.width < 43 || r.height < 43);
  }).map(el => el.outerHTML.slice(0, 120)));
  assert.deepEqual(undersized, [], `${name}: small touch targets`);
  const input = page.locator('#flag-input');
  if (await input.count()) assert.ok(await input.evaluate(el => parseFloat(getComputedStyle(el).fontSize)) >= 16, `${name}: input may trigger iOS zoom`);
  report.checks.push(name);
}
async function dialogBounds(page, name) {
  const box = await page.locator('#image-dialog').boundingBox();
  const size = page.viewportSize();
  assert.ok(box.x >= -1 && box.y >= -1 && box.x + box.width <= size.width + 1 && box.y + box.height <= size.height + 1, `${name}: cropped dialog ${JSON.stringify(box)}`);
  await page.locator('#close-image').click({ trial: true });
}
const browsers = {};
try {
  for (const [name, engine] of Object.entries(engines)) browsers[name] = await engine.launch();
  // Bounded batches keep the test machine responsive.
  for (let offset = 0; offset < profiles.length; offset += 3) {
    await Promise.all(profiles.slice(offset, offset + 3).map(async ([name, engine, width, height, scale = 1]) => {
      const context = await browsers[engine].newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: engine !== 'firefox', hasTouch: engine !== 'firefox', reducedMotion: 'reduce' });
      if (scale !== 1) await context.addInitScript(scale => document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = `${16 * scale}px`; }), scale);
      const page = await context.newPage();
      page.setDefaultTimeout(12000); page.setDefaultNavigationTimeout(20000);
      page.on('pageerror', error => report.errors.push(`${name}: ${error.message}`));
      page.on('console', message => { if (message.type() === 'error' && /Content Security Policy|Refused to/.test(message.text())) report.errors.push(`${name}: ${message.text()}`); });
      try {
        for (const hash of ['#home', ...Array.from({ length: 8 }, (_, i) => `#mission-${i + 1}`), '#result', '#about']) {
          await route(page, hash); await layout(page, `${name}${hash}`);
          if (hash === '#mission-3') {
            await page.locator('.image-open').click(); await dialogBounds(page, name);
            for (let i = 0; i < 5; i++) await page.locator('#zoom-in').click();
            assert.equal(await page.locator('#zoom-label').textContent(), '350%');
            assert.ok(await page.locator('#image-scroll').evaluate(el => el.scrollWidth > el.clientWidth));
            await page.setViewportSize({ width: height, height: width }); await dialogBounds(page, `${name}-rotated`);
            await page.setViewportSize({ width, height }); await page.locator('#close-image').click();
            assert.equal(await page.locator('body').evaluate(el => el.classList.contains('is-modal-open')), false);
          }
          // Screenshot capture is kept separate: Playwright injects a temporary
          // inline `body {}` stylesheet in WebKit, which our CSP correctly blocks.
        }
        console.log(`PASS ${name}: 11 screens, touch targets, image zoom and rotation`);
      } finally { await context.close(); }
    }));
  }
  for (const [engine, browser] of Object.entries(browsers)) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(12000); page.setDefaultNavigationTimeout(20000);
    page.on('pageerror', error => report.errors.push(`${engine} interactions: ${error.message}`));
    try {
      await route(page, '#mission-1');
      // The skip link must keep the current mission rather than trigger the hash router.
      await page.locator('.skip-link').focus(); await page.locator('.skip-link').click();
      assert.equal(new URL(page.url()).hash, '#mission-1');
      const input = page.locator('#flag-input'); await input.fill('CAT');
      await input.dispatchEvent('compositionstart');
      let answers = 0; page.on('request', req => { if (req.postDataJSON()?.action === 'answer') answers++; });
      await input.press('Enter'); await page.waitForTimeout(150);
      assert.equal(answers, 0, 'IME conversion Enter must not submit');
      await input.dispatchEvent('compositionend'); await page.waitForTimeout(150);
      await page.locator('#submit-answer').click(); await page.locator('#explanation:not(.hidden)').waitFor();
      assert.equal(answers, 1); assert.equal(await page.locator('#header-score').textContent(), '1 / 8');
      await page.reload(); await page.locator('#explanation:not(.hidden)').waitFor();
      assert.equal(await page.locator('#header-score').textContent(), '1 / 8');
      await route(page, '#mission-2');
      await page.locator('#hint-button').click(); await page.locator('.hint-item').waitFor();
      await page.locator('#hint-button').click(); await page.waitForFunction(() => document.querySelectorAll('.hint-item').length === 2);
      assert.ok(await page.locator('#hint-button').isDisabled());
      await page.locator('#explanation-button').click(); await page.locator('#confirm-cancel').click();
      assert.ok(await page.locator('#explanation').isHidden());
      await page.locator('#explanation-button').click(); await page.locator('#confirm-ok').click();
      await page.locator('#explanation:not(.hidden)').waitFor();
      assert.equal(await page.locator('#header-score').textContent(), '1 / 8');
      await route(page, '#mission-4'); await page.locator('[data-compare="after"]').click();
      assert.ok((await page.locator('.image-open img').getAttribute('src')).includes('after'));
      await route(page, '#mission-5'); await page.locator('[data-device]').first().click();
      assert.ok((await page.locator('#device-detail').textContent()).length > 0);
      await route(page, '#mission-6'); await page.locator('[data-record]').first().click();
      assert.ok((await page.locator('#record-detail').textContent()).length > 0);
      await route(page, '#mission-7'); const order = await page.locator('#order-result').textContent();
      await page.locator('[data-dir="down"]:not(:disabled)').first().click();
      assert.notEqual(await page.locator('#order-result').textContent(), order);
      await route(page, '#result'); await page.locator('#reset-progress').click(); await page.locator('#confirm-cancel').click();
      assert.equal(await page.locator('#header-score').textContent(), '1 / 8');
      await page.locator('#reset-progress').click(); await page.locator('#confirm-ok').click();
      await page.waitForFunction(() => document.querySelector('#header-score').textContent === '0 / 8');
      report.checks.push(`${engine}: IME, answer, reload, hints, assisted learning, comparison, evidence, ordering, reset`);
      console.log(`PASS ${engine} complete interactions`);
    } finally { await context.close(); }
  }
  // Real aborted requests, timeouts, stale route responses and native-dialog fallback.
  const context = await browsers.webkit.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(); page.on('pageerror', error => report.errors.push(`recovery: ${error.message}`));
  await route(page, '#mission-1'); await page.waitForTimeout(200);
  await page.route('**/api/game', async route => {
    if (route.request().postDataJSON()?.action === 'answer') await route.abort('internetdisconnected'); else await route.continue();
  });
  await page.locator('#flag-input').fill('CAT'); await page.locator('#submit-answer').click();
  await page.waitForFunction(() => document.querySelector('#feedback').textContent.includes('通信環境'));
  assert.ok(await page.locator('#submit-answer').isEnabled()); await page.unroute('**/api/game');
  await page.route('**/api/game', async route => {
    if (route.request().postDataJSON()?.action === 'answer') { await new Promise(resolve => setTimeout(resolve, 14000)); await route.continue().catch(() => {}); } else await route.continue();
  });
  await page.locator('#submit-answer').click();
  await page.waitForFunction(() => document.querySelector('#feedback').textContent.includes('時間がかかって'), undefined, { timeout: 16000 });
  assert.ok(await page.locator('#submit-answer').isEnabled()); await page.unroute('**/api/game');
  await page.locator('#submit-answer').click(); await page.locator('#explanation:not(.hidden)').waitFor();
  await route(page, '#result');
  await page.route('**/api/game', async route => { if (route.request().postDataJSON()?.action === 'reset') await new Promise(resolve => setTimeout(resolve, 400)); await route.continue(); });
  await page.locator('#reset-progress').click(); await page.locator('#confirm-ok').click();
  await page.goto(`${base}/#mission-3`); await page.locator('.image-open').waitFor(); await page.waitForTimeout(700);
  assert.equal(new URL(page.url()).hash, '#mission-3'); assert.ok(await page.locator('.image-open').isVisible());
  await page.unroute('**/api/game');
  await page.evaluate(() => { HTMLDialogElement.prototype.showModal = undefined; HTMLDialogElement.prototype.close = undefined; });
  await page.locator('.image-open').click(); assert.ok(await page.locator('#image-dialog').evaluate(el => el.open));
  await page.locator('#zoom-in').click(); await page.locator('#close-image').click();
  assert.equal(await page.locator('body').evaluate(el => el.classList.contains('is-modal-open')), false);
  report.checks.push('WebKit: offline recovery, 12-second timeout, queue recovery, reset navigation race, dialog fallback');
  console.log('PASS WebKit network recovery and dialog fallback');
  await context.close();
  assert.deepEqual(report.errors, [], 'Browser JavaScript / CSP errors');
} catch (error) { report.failure = error.stack; console.error(error.stack); process.exitCode = 1; }
finally {
  for (const browser of Object.values(browsers)) await browser.close();
  await writeFile('test-results/device-report.json', JSON.stringify(report, null, 2));
  console.log(`${report.checks.length} checks completed; ${report.errors.length} browser errors. Report: test-results/device-report.json`);
}
