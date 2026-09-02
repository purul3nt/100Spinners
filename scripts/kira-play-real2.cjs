#!/usr/bin/env node
/**
 * kira-play-real2.cjs
 * v2: Dismiss cookie banner first, then click TRY IT.
 * Capture RGS API calls, paytable, and click SPIN.
 */

const { chromium } = require('playwright');
const fs = require('fs');

const OUT_DIR = '/tmp/kira-usoa-real2';
fs.mkdirSync(OUT_DIR, { recursive: true });

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

(async () => {
  log('Launching Chromium');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chromium',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
    ignoreHTTPSErrors: true,
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  });

  const page = await context.newPage();

  // Capture network — wider filter
  const apiCalls = [];
  page.on('request', (req) => {
    apiCalls.push({
      kind: 'request',
      method: req.method(),
      url: req.url(),
      body: req.postData(),
      time: Date.now(),
    });
  });
  page.on('response', async (resp) => {
    const url = resp.url();
    const ct = resp.headers()['content-type'] || '';
    let body = null;
    try {
      if (ct.includes('json')) body = await resp.json();
      else if (ct.includes('text') || ct.includes('html')) body = await resp.text();
      else body = `[binary ${ct}]`;
    } catch (e) {
      body = `[parse-err ${e.message}]`;
    }
    apiCalls.push({
      kind: 'response',
      method: resp.request().method(),
      url,
      status: resp.status(),
      body,
      time: Date.now(),
    });
  });

  page.on('pageerror', (err) => log('PAGE ERROR:', err.message));
  page.on('console', (msg) => {
    const t = msg.text();
    if (
      t.toLowerCase().includes('error') ||
      t.toLowerCase().includes('paytable') ||
      t.toLowerCase().includes('hacksaw')
    )
      log('CONSOLE', msg.type(), t.slice(0, 250));
  });

  log('Navigating to marketing page');
  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForTimeout(7000);

  // === Dismiss cookie banner ===
  log('Dismissing cookie banner');
  const cookieSelectors = [
    'text=/^(OK|Accept|Agree|Got it|I agree)$/i',
    'button:has-text("OK")',
    'button:has-text("Accept")',
    'button:has-text("OK")',
    '.cookie-accept',
    '#cookie-accept',
    '[aria-label*="accept" i]',
    '[aria-label*="cookie" i]',
    '.cc-allow',
    '.cc-dismiss',
  ];
  for (const sel of cookieSelectors) {
    try {
      const els = await page.$$(sel);
      for (const el of els) {
        const text = (await el.innerText().catch(() => '')) || '';
        const box = await el.boundingBox().catch(() => null);
        if (
          box &&
          box.width > 0 &&
          box.width < 300 &&
          /^(OK|Accept|Agree|Got it|I agree|Allow all)/i.test(text.trim())
        ) {
          log(`Clicking cookie accept: "${text.trim()}" via ${sel}`);
          await el.click({ force: true });
          await page.waitForTimeout(2000);
          break;
        }
      }
    } catch (e) {}
  }

  await page.screenshot({ path: `${OUT_DIR}/01-after-cookie.png`, fullPage: true });

  // === Click TRY IT ===
  log('Clicking TRY IT');
  const tryIt = await page.$('span.js-launch-game');
  if (tryIt) {
    await tryIt.click({ force: true });
    log('Clicked span.js-launch-game');
  } else {
    log('TRY IT not found');
  }

  // Watch for new page (popup) or new iframe
  log('Waiting 25s for game to load');
  const startCount = page.frames().length;
  await page.waitForTimeout(25000);

  const iframes = await page.$$eval('iframe', (els) =>
    els.map((e) => ({ src: e.src, w: e.clientWidth, h: e.clientHeight, visible: e.offsetParent !== null }))
  );
  log('All iframes:', JSON.stringify(iframes, null, 2));

  // Find game frame
  let gameFrame = null;
  for (const f of page.frames()) {
    const u = f.url();
    if (
      u.includes('static-live.hacksawgaming.com') ||
      u.includes('index.html?gameid=1760') ||
      u.includes('demo')
    ) {
      log('Game frame:', u);
      gameFrame = f;
    }
  }

  if (!gameFrame) {
    log('No game frame. Looking for popup window.');
    const pages = context.pages();
    log('Total pages in context:', pages.length);
    for (const p of pages) {
      log('  page url:', p.url());
      if (p.url().includes('hacksaw') || p.url().includes('demo')) {
        gameFrame = p;
      }
    }
  }

  await page.screenshot({ path: `${OUT_DIR}/02-after-try-it.png`, fullPage: true });

  if (gameFrame) {
    log('Game frame URL:', gameFrame.url());

    // Inspect globals
    const globals = await gameFrame.evaluate(() => {
      const out = {};
      const w = window;
      out.url = location.href;
      out.title = document.title;
      out.Hacksaw = typeof w.Hacksaw;
      out.hacksaw = typeof w.hacksaw;
      out.hacksawCasino = typeof w.hacksawCasino;
      out.casinoEnv = w.hacksaw?.casino?.env || null;
      out.casinoToken = !!w.hacksaw?.casino?.token;
      out.casinoBackend = w.hacksaw?.casino?.backend || null;
      out.activeScenario = !!w.hacksaw?._activeScenario;
      out.scenarios = !!w.hacksaw?._scenarios;
      out.paytablePresent = !!w.hacksaw?._activeScenario?.paytable;
      out.paytableBody = w.hacksaw?._activeScenario?.paytable?.body
        ? Object.keys(w.hacksaw._activeScenario.paytable.body)
        : null;
      out.paytableFull = w.hacksaw?._activeScenario?.paytable?.body || null;
      out.gameInited = w.hacksaw?._gameConfig?.gameInited;
      out.balance = w.hacksaw?._user?.accountBalance
        ? String(w.hacksaw._user.accountBalance)
        : null;
      out.errMsg = document.querySelector('.error-message')?.innerText || null;
      out.canvasCount = document.querySelectorAll('canvas').length;
      return out;
    });
    log('Game globals:', JSON.stringify(globals, null, 2));

    await gameFrame.screenshot({ path: `${OUT_DIR}/03-game-frame.png`, fullPage: true });

    // Try clicking SPIN inside the game
    log('Looking for spin button inside game');
    const gameCanvas = await gameFrame.$('canvas');
    if (gameCanvas) {
      const box = await gameCanvas.boundingBox();
      log(`Game canvas: ${box.width}x${box.height} at (${box.x}, ${box.y})`);
      // Click center-bottom (typical spin button location)
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height * 0.85;
      log(`Clicking potential SPIN at (${cx}, ${cy})`);
      await gameFrame.mouse.click(cx, cy);
      await gameFrame.waitForTimeout(8000);
    } else {
      log('No canvas in game frame');
    }

    // Re-check paytable post-spin
    const postSpin = await gameFrame.evaluate(() => {
      return {
        paytablePresent: !!window.hacksaw?._activeScenario?.paytable,
        paytableBody: window.hacksaw?._activeScenario?.paytable?.body
          ? JSON.stringify(window.hacksaw._activeScenario.paytable.body).slice(0, 3000)
          : null,
        ongoingRound: window.hacksaw?._gameState?.ongoingRound,
        latestWin: window.hacksaw?._gameState?.latestWin
          ? String(window.hacksaw._gameState.latestWin)
          : null,
        userBalance: window.hacksaw?._user?.accountBalance
          ? String(window.hacksaw._user.accountBalance)
          : null,
      };
    });
    log('Post-spin state:', JSON.stringify(postSpin, null, 2));

    await gameFrame.screenshot({ path: `${OUT_DIR}/04-post-spin.png`, fullPage: true });
  }

  // Save API calls
  fs.writeFileSync(`${OUT_DIR}/api-calls.json`, JSON.stringify(apiCalls, null, 2));
  log(`Saved ${apiCalls.length} calls`);

  // Filter RGS calls
  const rgs = apiCalls.filter((c) => c.url?.includes('rgs-') || c.url?.includes('/play/'));
  fs.writeFileSync(`${OUT_DIR}/rgs-calls.json`, JSON.stringify(rgs, null, 2));
  log(`RGS calls: ${rgs.length}`);

  // Filter paytable-relevant calls (authenticate, scenarios, launch)
  const auth = apiCalls.filter(
    (c) =>
      c.url?.includes('authenticate') ||
      c.url?.includes('scenarios') ||
      c.url?.includes('gameLaunch') ||
      c.url?.includes('meta') ||
      c.url?.includes('partnerSettings')
  );
  fs.writeFileSync(`${OUT_DIR}/auth-calls.json`, JSON.stringify(auth, null, 2));
  log(`Auth/scenarios calls: ${auth.length}`);

  await browser.close();
  log('Done.');
})().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
