#!/usr/bin/env node
/**
 * kira-debug-spin.cjs
 * Debug what's actually happening when we click. Capture all RGS POSTs,
 * take screenshots before/after, try multiple input methods.
 */

const { chromium } = require('playwright');
const fs = require('fs');

const OUT_DIR = '/tmp/kira-usoa-debug';
fs.mkdirSync(OUT_DIR, { recursive: true });

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    channel: 'chromium',
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    ignoreHTTPSErrors: true,
  });

  await context.addCookies([
    { name: 'CookiesConsent', value: 'granted', domain: '.hacksawgaming.com', path: '/' },
    { name: 'age_verified', value: 'true', domain: '.hacksawgaming.com', path: '/' },
  ]);

  const page = await context.newPage();

  const allRgsPosts = [];
  page.on('request', (req) => {
    if (req.url().includes('rgs-') && req.method() === 'POST') {
      allRgsPosts.push({ url: req.url(), body: req.postData(), ts: Date.now() });
    }
  });

  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForTimeout(5000);

  log('Clicking TRY IT');
  await page.click('span.js-launch-game', { force: true });
  await page.waitForTimeout(30000);

  // Find game frame
  let gameFrame = null;
  for (const f of page.frames()) {
    if (f.url().includes('static-live.hacksawgaming.com') && f.url().includes('gameid=1760')) {
      gameFrame = f;
    }
  }
  log('Game frame:', gameFrame?.url());
  if (!gameFrame) { await browser.close(); return; }

  // Wait long enough for full init
  log('Waiting 30s for game init');
  await gameFrame.waitForTimeout(30000);

  // Screenshot of full page (with iframe)
  await page.screenshot({ path: `${OUT_DIR}/full-page-1.png`, fullPage: false });
  log('Saved full-page-1.png');

  // Screenshot of just the iframe
  try {
    const frameEl = await page.$('iframe');
    if (frameEl) {
      await frameEl.screenshot({ path: `${OUT_DIR}/iframe-only.png` });
      log('Saved iframe-only.png');
    }
  } catch (e) {}

  // Check what's inside the iframe
  const insideInfo = await gameFrame.evaluate(() => {
    return {
      bodyHTML: document.body.innerHTML.slice(0, 1000),
      canvasCount: document.querySelectorAll('canvas').length,
      buttonCount: document.querySelectorAll('button').length,
      divCount: document.querySelectorAll('div').length,
      anyText: document.body.innerText.slice(0, 500),
      title: document.title,
      pixiPresent: !!window.PIXI,
      pixiApps: window.PIXI && window.PIXI.Application ? Object.keys(window.PIXI.Application).slice(0,10) : null,
      hacksawCasinoPresent: typeof window.hacksawCasino,
    };
  });
  log('Inside iframe:', JSON.stringify(insideInfo, null, 2));

  // === Try Space key ===
  log('Trying SPACE key spin');
  const beforeSpace = allRgsPosts.length;
  await gameFrame.focus('body');
  await page.keyboard.press('Space');
  await gameFrame.waitForTimeout(8000);
  const afterSpace = allRgsPosts.length;
  log(`SPACE: rgs posts before=${beforeSpace} after=${afterSpace}`);
  if (afterSpace > beforeSpace) {
    for (let i = beforeSpace; i < afterSpace; i++) {
      log(`  POST ${i}: ${allRgsPosts[i].url} ${(allRgsPosts[i].body || '').slice(0, 200)}`);
    }
  }

  // === Try canvas.click() ===
  log('Trying canvas.click()');
  const beforeClick = allRgsPosts.length;
  await gameFrame.evaluate(() => {
    const c = document.querySelector('canvas');
    if (c) c.click();
  });
  await gameFrame.waitForTimeout(8000);
  const afterClick = allRgsPosts.length;
  log(`canvas.click(): rgs posts before=${beforeClick} after=${afterClick}`);
  if (afterClick > beforeClick) {
    for (let i = beforeClick; i < afterClick; i++) {
      log(`  POST ${i}: ${allRgsPosts[i].url} ${(allRgsPosts[i].body || '').slice(0, 200)}`);
    }
  }

  // === Try mouse click on multiple positions ===
  log('Trying mouse click on multiple positions');
  for (const [fx, fy, name] of [
    [0.5, 0.5, 'center'],
    [0.5, 0.92, 'bottom-center'],
    [0.72, 0.83, 'spin-primary'],
    [0.92, 0.5, 'right-center'],
    [0.05, 0.95, 'bottom-left'],
  ]) {
    const before = allRgsPosts.length;
    const x = 1707 * fx;
    const y = 960 * fy;
    await page.mouse.click(x, y);
    await page.waitForTimeout(3000);
    const after = allRgsPosts.length;
    log(`  Click (${fx},${fy}) (${x},${y}): new posts=${after - before}`);
    if (after > before) {
      for (let i = before; i < after; i++) {
        log(`    POST: ${allRgsPosts[i].url} ${(allRgsPosts[i].body || '').slice(0, 200)}`);
      }
    }
  }

  await page.screenshot({ path: `${OUT_DIR}/full-page-after.png`, fullPage: false });

  // Save all RGS POSTs
  fs.writeFileSync(`${OUT_DIR}/rgs-posts.json`, JSON.stringify(allRgsPosts, null, 2));
  log(`Saved ${allRgsPosts.length} RGS POSTs`);

  await browser.close();
  log('Done.');
})().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
