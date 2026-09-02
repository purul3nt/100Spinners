#!/usr/bin/env node
/**
 * kira-debug-click.cjs
 * Try multiple click strategies + probe hacksawCasino object
 */

const { chromium } = require('playwright');
const fs = require('fs');

const OUT_DIR = '/tmp/kira-usoa-debug2';
fs.mkdirSync(OUT_DIR, { recursive: true });

function log(...args) { console.log(`[${new Date().toISOString()}]`, ...args); }

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

  const rgsPosts = [];
  page.on('request', (req) => {
    if (req.url().includes('rgs-') && req.method() === 'POST') {
      rgsPosts.push({ url: req.url(), body: req.postData(), ts: Date.now() });
    }
  });

  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', {
    waitUntil: 'domcontentloaded', timeout: 60000,
  });
  await page.waitForTimeout(5000);
  await page.click('span.js-launch-game', { force: true });
  await page.waitForTimeout(30000);

  let gameFrame = null;
  for (const f of page.frames()) {
    if (f.url().includes('static-live.hacksawgaming.com') && f.url().includes('gameid=1760')) {
      gameFrame = f;
    }
  }
  if (!gameFrame) { await browser.close(); return; }
  log('Frame:', gameFrame.url());

  await gameFrame.waitForSelector('canvas', { timeout: 30000 });
  await gameFrame.waitForTimeout(20000); // extra settle

  const cv = await gameFrame.evaluate(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  log('Canvas:', JSON.stringify(cv));

  // === Splash dismiss ===
  log('Dismiss splash');
  await page.mouse.click(cv.x + cv.w * 0.4, cv.y + cv.h * 0.81);
  await gameFrame.waitForTimeout(5000);

  // === Probe hacksawCasino for direct API ===
  log('Probing hacksawCasino');
  const casinoKeys = await gameFrame.evaluate(() => {
    const c = window.hacksawCasino;
    if (!c) return null;
    return Object.keys(c).filter(k => typeof c[k] === 'function' || typeof c[k] === 'object').slice(0, 30);
  });
  log('hacksawCasino keys:', JSON.stringify(casinoKeys, null, 2));

  // Try to find a placeBet function anywhere on window
  const placeBetInfo = await gameFrame.evaluate(() => {
    const found = [];
    function walk(obj, path, depth) {
      if (depth > 3) return;
      if (!obj || typeof obj !== 'object') return;
      for (const k of Object.keys(obj)) {
        try {
          const v = obj[k];
          if (typeof v === 'function' && /place|spin|play|bet/i.test(k)) {
            found.push({ path: path + '.' + k, len: v.length });
          } else if (typeof v === 'object' && v !== null) {
            walk(v, path + '.' + k, depth + 1);
          }
        } catch (e) {}
      }
    }
    walk(window.hacksawCasino, 'hacksawCasino', 0);
    return found.slice(0, 30);
  });
  log('Place/spin-like functions:', JSON.stringify(placeBetInfo, null, 2));

  // === Try dispatching PointerEvent via JS ===
  log('Try dispatchEvent PointerEvent on canvas at (1027, 663)');
  const before = rgsPosts.length;
  await gameFrame.evaluate((coords) => {
    const c = document.querySelector('canvas');
    const rect = c.getBoundingClientRect();
    const x = rect.left + coords.x;
    const y = rect.top + coords.y;
    log(`dispatching at (${x}, ${y})`);
    for (const type of ['pointerdown', 'pointerup', 'click']) {
      const evt = new PointerEvent(type, {
        bubbles: true, cancelable: true, composed: true,
        pointerType: 'mouse', clientX: x, clientY: y,
        button: 0, buttons: 1, isPrimary: true,
      });
      c.dispatchEvent(evt);
    }
  }, { x: 1027, y: 663 });
  await gameFrame.waitForTimeout(8000);
  const after = rgsPosts.length;
  log(`dispatchEvent: rgsPosts ${before} -> ${after}`);
  if (after > before) {
    for (let i = before; i < after; i++) {
      log(`  ${rgsPosts[i].url} ${(rgsPosts[i].body || '').slice(0, 150)}`);
    }
  }

  // === Try clicking canvas via JS click() ===
  log('Try canvas.click() via JS');
  const before2 = rgsPosts.length;
  await gameFrame.evaluate(() => {
    const c = document.querySelector('canvas');
    c.click();
  });
  await gameFrame.waitForTimeout(8000);
  const after2 = rgsPosts.length;
  log(`canvas.click(): rgsPosts ${before2} -> ${after2}`);
  if (after2 > before2) {
    for (let i = before2; i < after2; i++) {
      log(`  ${rgsPosts[i].url} ${(rgsPosts[i].body || '').slice(0, 150)}`);
    }
  }

  // === Try clicking a UI element by text ===
  log('Try clicking SPIN by inspecting divs');
  const uiButtons = await gameFrame.evaluate(() => {
    const els = document.querySelectorAll('button, [class*="spin"], [class*="button"]');
    return Array.from(els).slice(0, 30).map(e => ({
      tag: e.tagName,
      cls: (e.className || '').slice(0, 80),
      text: (e.innerText || '').slice(0, 50),
      id: e.id,
    }));
  });
  log('UI elements:', JSON.stringify(uiButtons, null, 2));

  // Try clicking SPIN button by class
  const spinClass = await gameFrame.evaluate(() => {
    const el = document.querySelector('[class*="spin" i]');
    if (el) return { cls: el.className, rect: el.getBoundingClientRect() };
    return null;
  });
  log('Spin element:', JSON.stringify(spinClass));

  await page.screenshot({ path: `${OUT_DIR}/final.png` });
  await browser.close();
  log('Done.');
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
