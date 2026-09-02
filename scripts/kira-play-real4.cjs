#!/usr/bin/env node
/**
 * kira-play-real4.cjs
 * v4: Real demo token captured from Hacksaw marketing flow.
 * Probe globals thoroughly. Save API calls BEFORE any click that might throw.
 */

const { chromium } = require('playwright');
const fs = require('fs');

const OUT_DIR = '/tmp/kira-usoa-real4';
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

  await context.addCookies([
    { name: 'CookiesConsent', value: 'granted', domain: '.hacksawgaming.com', path: '/' },
    { name: 'age_verified', value: 'true', domain: '.hacksawgaming.com', path: '/' },
  ]);

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });

  const page = await context.newPage();

  const apiCalls = [];
  page.on('request', (req) => {
    apiCalls.push({ kind: 'request', method: req.method(), url: req.url(), body: req.postData(), time: Date.now() });
  });
  page.on('response', async (resp) => {
    const url = resp.url();
    const ct = resp.headers()['content-type'] || '';
    let body = null;
    try {
      if (ct.includes('json')) body = await resp.json();
      else if (ct.includes('text') || ct.includes('html') || ct.includes('javascript')) body = await resp.text();
      else body = `[binary ${ct}]`;
    } catch (e) {
      body = `[parse-err ${e.message}]`;
    }
    apiCalls.push({ kind: 'response', method: resp.request().method(), url, status: resp.status(), body, time: Date.now() });
  });

  page.on('pageerror', (err) => log('PAGE ERROR:', err.message));
  page.on('console', (msg) => {
    const t = msg.text();
    if (
      t.toLowerCase().includes('error') ||
      t.toLowerCase().includes('paytable') ||
      t.toLowerCase().includes('hacksaw') ||
      t.toLowerCase().includes('rgs') ||
      t.toLowerCase().includes('scenario')
    )
      log('CONSOLE', msg.type(), t.slice(0, 250));
  });

  log('Navigating to marketing page');
  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForTimeout(6000);

  log('Clicking TRY IT');
  const tryIt = await page.$('span.js-launch-game');
  if (tryIt) await tryIt.click({ force: true });

  log('Waiting 20s for popup');
  await page.waitForTimeout(20000);

  // Find the game frame
  let gameFrame = null;
  for (const f of page.frames()) {
    const u = f.url();
    if (u.includes('static-live.hacksawgaming.com') && u.includes('gameid=1760')) {
      gameFrame = f;
      log(`Game frame: ${u}`);
    }
  }

  if (!gameFrame) {
    log('Game frame not found.');
    fs.writeFileSync(`${OUT_DIR}/api-calls.json`, JSON.stringify(apiCalls, null, 2));
    await browser.close();
    return;
  }

  // Save URL and token
  fs.writeFileSync(`${OUT_DIR}/game-url.txt`, gameFrame.url());

  // Extract demo token for future use
  const tokenMatch = gameFrame.url().match(/token=([^&]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;
  log(`Demo token: ${token}`);

  // === SAVE STATE EARLY so we don't lose data ===
  // Wait for bundles to load inside iframe
  log('Waiting 30s for game init');
  await gameFrame.waitForTimeout(30000);

  // Probe globals deeply
  const globals = await gameFrame.evaluate(() => {
    const w = window;
    const probe = {};
    probe.url = location.href;
    probe.title = document.title;
    probe.readyState = document.readyState;

    // All window keys that look Hacksaw-related
    probe.allHacksawKeys = Object.keys(w).filter((k) => /hacksaw|Hacksaw|HAX|game|Game|casino|Casino|spin|Spin|paytable|Paytable|HAXE/i.test(k));

    probe.Hacksaw = typeof w.Hacksaw;
    probe.hacksaw = typeof w.hacksaw;
    probe.hacksawCasino = typeof w.hacksawCasino;
    probe.casinoGlobal = typeof w.Casino;
    probe.PIXI = typeof w.PIXI;

    probe.hacksawValue = w.hacksaw ? Object.keys(w.hacksaw).slice(0, 50) : null;
    probe.HacksawValue = w.Hacksaw ? Object.keys(w.Hacksaw).slice(0, 50) : null;
    probe.casinoEnv = w.hacksaw?.casino?.env || null;
    probe.casinoToken = !!w.hacksaw?.casino?.token;
    probe.casinoBackend = w.hacksaw?.casino?.backend || null;

    probe.scenarios = !!w.hacksaw?._scenarios;
    probe.activeScenario = !!w.hacksaw?._activeScenario;
    probe.paytablePresent = !!w.hacksaw?._activeScenario?.paytable;
    probe.paytableBody = w.hacksaw?._activeScenario?.paytable?.body
      ? JSON.stringify(w.hacksaw._activeScenario.paytable.body).slice(0, 8000)
      : null;
    probe.paytableRoot = w.hacksaw?._activeScenario?.paytable
      ? Object.keys(w.hacksaw._activeScenario.paytable)
      : null;

    probe.loadingStage = w.hacksaw?._loadingStage;
    probe.gameInited = w.hacksaw?._gameConfig?.gameInited;
    probe.gameConfigKeys = w.hacksaw?._gameConfig ? Object.keys(w.hacksaw._gameConfig) : null;
    probe.balance = w.hacksaw?._user?.accountBalance ? String(w.hacksaw._user.accountBalance) : null;
    probe.userKeys = w.hacksaw?._user ? Object.keys(w.hacksaw._user) : null;
    probe.sessionKeys = w.hacksaw?._sessionData ? Object.keys(w.hacksaw._sessionData) : null;
    probe.gameStateKeys = w.hacksaw?._gameState ? Object.keys(w.hacksaw._gameState) : null;
    probe.commKeys = w.hacksaw?._comm ? Object.keys(w.hacksaw._comm).slice(0, 30) : null;

    probe.errMsg = document.querySelector('.error-message')?.innerText || null;
    probe.canvasCount = document.querySelectorAll('canvas').length;
    probe.canvasSize = document.querySelector('canvas')
      ? `${document.querySelector('canvas').width}x${document.querySelector('canvas').height}`
      : null;

    // Loader class globals — Haxe can target window directly
    probe.windowKeys = Object.keys(w).slice(-100);

    return probe;
  });
  log('Game globals:');
  console.log(JSON.stringify(globals, null, 2));

  // SAVE EVERYTHING NOW before any risky operation
  fs.writeFileSync(`${OUT_DIR}/api-calls.json`, JSON.stringify(apiCalls, null, 2));
  log(`Saved ${apiCalls.length} API calls`);

  const rgs = apiCalls.filter((c) => c.url?.includes('rgs-') || c.url?.includes('/play/'));
  fs.writeFileSync(`${OUT_DIR}/rgs-calls.json`, JSON.stringify(rgs, null, 2));
  log(`RGS calls: ${rgs.length}`);

  if (rgs.length) {
    log('RGS call URLs:');
    for (const c of rgs) log(`  ${c.method} ${c.url}`);
  }

  // Now try to click SPIN (with try/catch)
  try {
    if (globals.canvasCount > 0) {
      log('Canvas present. Looking for SPIN button.');
      // Get all canvas elements
      const canvases = await gameFrame.$$('canvas');
      for (const c of canvases) {
        const box = await c.boundingBox().catch(() => null);
        if (box && box.width > 500) {
          log(`Big canvas: ${box.width}x${box.height} at (${box.x}, ${box.y})`);
          // SPIN is typically a circular button at the bottom-right or center
          // Click center-bottom
          const cx = box.x + box.width / 2;
          const cy = box.y + box.height * 0.9;
          log(`Clicking SPIN candidate at (${cx}, ${cy})`);
          await page.mouse.click(cx, cy);
          await page.waitForTimeout(8000);
        }
      }
    }
  } catch (e) {
    log('Spin click error:', e.message);
  }

  // Post-spin state
  try {
    const post = await gameFrame.evaluate(() => ({
      paytablePresent: !!window.hacksaw?._activeScenario?.paytable,
      paytableBody: window.hacksaw?._activeScenario?.paytable?.body
        ? JSON.stringify(window.hacksaw._activeScenario.paytable.body).slice(0, 4000)
        : null,
      latestWin: window.hacksaw?._gameState?.latestWin ? String(window.hacksaw._gameState.latestWin) : null,
      userBalance: window.hacksaw?._user?.accountBalance ? String(window.hacksaw._user.accountBalance) : null,
      scenarios: window.hacksaw?._scenarios ? JSON.stringify(Object.keys(window.hacksaw._scenarios)) : null,
    }));
    log('Post-spin:', JSON.stringify(post, null, 2));
    fs.writeFileSync(`${OUT_DIR}/post-spin.json`, JSON.stringify(post, null, 2));
  } catch (e) {
    log('Post-spin probe error:', e.message);
  }

  try {
    await page.screenshot({ path: `${OUT_DIR}/final.png`, fullPage: true });
  } catch (e) {}

  await browser.close();
  log('Done.');
})().catch((e) => {
  console.error('FATAL:', e);
  try { fs.writeFileSync('/tmp/kira-usoa-real4/FATAL.txt', String(e.stack || e)); } catch {}
  process.exit(1);
});
