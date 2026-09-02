#!/usr/bin/env node
/**
 * kira-usoa-spinner4.cjs
 * Direct POST /play/bet from browser context using fetch() with session cookies.
 * Bypasses the click event issue entirely.
 */

const { chromium } = require('playwright');
const fs = require('fs');

const OUT_DIR = '/home/llama-claw/.openclaw/agents/kira-forge/workspace/usoa-data/spins';
fs.mkdirSync(OUT_DIR, { recursive: true });

const MAX_SPINS = parseInt(process.argv[2] || '1990', 10);
const SESSION_FILE = process.argv[3] || `${OUT_DIR}/session.jsonl`;

function log(...args) { console.log(`[${new Date().toISOString()}]`, ...args); }

(async () => {
  log(`=== USOA Spinner v4 (direct RGS POST) === target=${MAX_SPINS}`);
  fs.writeFileSync(SESSION_FILE, '');

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

  // Capture network requests for /play/bet to see the actual payload structure
  const allRgsPosts = [];
  page.on('request', (req) => {
    if (req.url().includes('rgs-') && req.method() === 'POST') {
      allRgsPosts.push({ url: req.url(), body: req.postData() });
    }
  });

  page.on('response', async (resp) => {
    if (resp.url().includes('/play/') && resp.request().method() === 'POST') {
      try {
        const body = await resp.json();
        // Store the response body for inspection
        const idx = allRgsPosts.findIndex(r => r.url === resp.url() && !r.response);
        if (idx >= 0) {
          allRgsPosts[idx].response = body;
          allRgsPosts[idx].status = resp.status();
        } else {
          allRgsPosts.push({ url: resp.url(), response: body, status: resp.status() });
        }
      } catch (e) {}
    }
  });

  log('Navigate + click TRY IT');
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
  if (!gameFrame) {
    log('FAIL: no game frame');
    await browser.close();
    return;
  }
  log('Frame:', gameFrame.url());

  await gameFrame.waitForSelector('canvas', { timeout: 30000 });
  await gameFrame.waitForTimeout(15000);

  // Dismiss splash
  log('Dismiss splash');
  const cv = await gameFrame.evaluate(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.click(cv.x + cv.w * 0.4, cv.y + cv.h * 0.81);
  await gameFrame.waitForTimeout(5000);

  // === Find session info by triggering one real bet via canvas click ===
  // Then inspect the captured POST body to learn the payload format
  log('Triggering one real spin via canvas click to capture payload format');
  await page.mouse.click(cv.x + cv.w * 0.602, cv.y + cv.h * 0.69);
  await gameFrame.waitForTimeout(10000);

  // Find the bet POST request and inspect its body
  const betPosts = allRgsPosts.filter(r => r.url.includes('/play/bet') && r.body);
  log(`Captured ${betPosts.length} /play/bet POSTs`);
  if (betPosts.length > 0) {
    log(`Sample bet body: ${betPosts[0].body}`);
  }

  // Also try triggering a spin by clicking in the actual game area
  // Look at what events fire
  const betResp = allRgsPosts.find(r => r.url.includes('/play/bet') && r.response);
  if (betResp) {
    log(`Bet response sample: ${JSON.stringify(betResp.response).slice(0, 500)}`);
  } else {
    log('No /play/bet captured. Game may not be spinning. Trying alternative...');
  }

  // === Inspect how the bundle makes requests ===
  // Find the Fetch API wrapper the bundle uses
  const bundleProbes = await gameFrame.evaluate(() => {
    // Look for any global that has the RGS URL
    const out = {};
    out.windowKeys = Object.keys(window).filter(k => !/^(webkit|chrome|on|caches|cookieStore|origin)/.test(k)).slice(-50);
    out.hacksawCasinoKeys = window.hacksawCasino ? Object.keys(window.hacksawCasino) : null;
    out.TranslationMethods = window.hacksawCasino?.Translation ? Object.keys(window.hacksawCasino.Translation).slice(0, 30) : null;

    // Look at the script tags and try to find request body patterns
    const scripts = Array.from(document.scripts).map(s => s.src).filter(s => s);
    out.scripts = scripts.slice(0, 10);

    // Inspect fetch on window if it's been wrapped
    out.fetchIsNative = window.fetch.toString().includes('[native code]');

    return out;
  });
  log('Bundle probes:', JSON.stringify(bundleProbes, null, 2));

  await browser.close();
  log('Done.');
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
