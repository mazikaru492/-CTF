import { chromium, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const base = process.env.CTF_TEST_URL || 'https://cyber-first-step-ctf.vercel.app';
const report = { date: new Date().toISOString(), base, physicalDevices: false, engines: [], errors: [] };
const home = await fetch(base);
assert.equal(home.status, 200);
assert.ok(home.headers.get('content-security-policy').includes("style-src 'self'"));
assert.ok((await home.text()).includes('viewport-fit=cover'));
const api = await fetch(`${base}/api/game`); assert.equal(api.status, 200);
const cookieHeader = api.headers.get('set-cookie');
assert.ok(/; HttpOnly/i.test(cookieHeader) && /; Secure/i.test(cookieHeader) && /; SameSite=Strict/i.test(cookieHeader));
const publicData = await api.json(); assert.equal(publicData.challenges.length, 8);
assert.ok(publicData.challenges.every(c => !('answer' in c) && !('hints' in c)));
assert.equal((await fetch(`${base}/server/challenges.mjs`)).status, 404);
for (const [name, engine, width, height] of [['android', chromium, 360, 800], ['iphone', webkit, 390, 844]]) {
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    page.on('pageerror', error => report.errors.push(`${name}: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error' && /Content Security Policy|Refused to/.test(message.text())) report.errors.push(`${name}: ${message.text()}`); });
    await page.goto(`${base}/#mission-1`); await page.locator('#flag-input').fill('ｃａｔ');
    await page.locator('#submit-answer').tap(); await page.locator('#explanation:not(.hidden)').waitFor();
    assert.equal(await page.locator('#header-score').textContent(), '1 / 8');
    assert.ok(await page.locator('#flag-input').evaluate(el => el !== document.activeElement));
    await page.reload(); await page.locator('#explanation:not(.hidden)').waitFor();
    assert.equal(await page.locator('#header-score').textContent(), '1 / 8');
    const cookie = (await context.cookies()).find(cookie => cookie.name === 'ctf_progress');
    assert.ok(cookie.httpOnly && cookie.secure);
    // Windows WebKit's cookie inspection reports SameSite=None even when the
    // HTTPS response carries Strict. Validate the header and Chromium metadata.
    if (name === 'android') assert.equal(cookie.sameSite, 'Strict');
    await page.goto(`${base}/#mission-3`); await page.locator('.image-open').tap();
    await page.locator('#zoom-in').tap(); assert.equal(await page.locator('#zoom-label').textContent(), '150%');
    await page.setViewportSize({ width: height, height: width }); await page.locator('#close-image').tap();
    assert.equal(await page.locator('body').evaluate(el => el.classList.contains('is-modal-open')), false);
    await page.setViewportSize({ width: 768, height: 1024 });
    assert.ok(await page.locator('.mobile-missions').isVisible());
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    report.engines.push({ name, version: browser.version(), cookieAttributes: { httpOnly: cookie.httpOnly, secure: cookie.secure, sameSiteHeader: 'Strict', sameSiteInspection: cookie.sameSite }, checks: ['full-width answer', 'touch submission', 'keyboard blur', 'cookie and reload', 'image zoom', 'rotation and close', 'tablet layout'] });
    console.log(`PASS published ${name}`);
  } finally { await browser.close(); }
}
assert.deepEqual(report.errors, []);
await writeFile('docs/公開モバイル検証記録.json', JSON.stringify(report, null, 2));
console.log('PASS anonymous HTTP, CSP, API privacy and published touch flows');
