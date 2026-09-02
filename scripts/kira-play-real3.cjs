#!/usr/bin/env node
/**
 * kira-play-real3.cjs
 * v3: Set Hacksaw cookies directly via context.addCookies, then click TRY IT.
 * Capture RGS API calls and paytable.
 */

const { chromium } = require('playwright');
const fs = require('fs');

const OUT_DIR = '/tmp/kira-usoa-real3';
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

  // Pre-set the cookies the launcher checks
  await context.addCookies([
    {
      name: 'CookiesConsent',
      value: 'granted',
      domain: '.hacksawgaming.com',
      path: '/',
    },
    {
      name: 'age_verified',
      value: 'true',
      domain: '.hacksawgaming.com',
      path: '/',
    },
  ]);

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
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
      else if (ct.includes('text') || ct.includes('html')) body = await resp.text();
      else body = `[binary ${ct}]`;
    } catch (e) {
      body = `[parse-err ${e.message}]`;
    }
    apiCalls.push({ kind: 'response', method: resp.request().method(), url, status: resp.status(), body, time: Date.now() });
  });

  page.on('pageerror', (err) => log('PAGE ERROR:', err.message));
  page.on('console', (msg) => {
    const t = msg.text();
    if (t.toLowerCase().includes('error') || t.toLowerCase().includes('paytable') || t.toLowerCase().includes('hacksaw'))
      log('CONSOLE', msg.type(), t.slice(0, 250));
  });

  log('Navigating to marketing page');
  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForTimeout(6000);

  await page.screenshot({ path: `${OUT_DIR}/01-loaded.png`, fullPage: true });

  // Click TRY IT (cookie is already set, so this should now go straight through)
  log('Clicking TRY IT');
  const tryIt = await page.$('span.js-launch-game');
  if (tryIt) {
    await tryIt.click({ force: true });
    log('Clicked TRY IT');
  }

  // Wait for popup window
  log('Waiting 20s for popup');
  await page.waitForTimeout(20000);

  // Look for popup window
  let gamePage = null;
  for (const p of context.pages()) {
    const u = p.url();
    log(`Page in context: ${u}`);
    if (u !== 'https://www.hacksawgaming.com/games/ultimate-slot-of-america') {
      gamePage = p;
      log(`Found popup: ${u}`);
    }
  }

  // If no popup, look for iframe
  if (!gamePage) {
    const iframes = await page.$$eval('iframe', (els) =>
      els.map((e) => ({ src: e.src, w: e.clientWidth, h: e.clientHeight, visible: e.offsetParent !== null }))
    );
    log('Iframes after TRY IT:', JSON.stringify(iframes, null, 2));

    for (const f of page.frames()) {
      const u = f.url();
      if (u.includes('static-live.hacksawgaming.com') || u.includes('gameid=1760')) {
        log('Found game frame:', u);
        gamePage = f;
      }
    }
  }

  if (gamePage) {
    log('Game page/frame URL:', gamePage.url());

    // Wait longer for game init
    log('Waiting 20s for game init');
    try {
      await gamePage.waitForTimeout(20000);
    } catch (e) {}

    const globals = await gamePage.evaluate(() => {
      const w = window;
      return {
        url: location.href,
        title: document.title,
        hacksawType: typeof w.hacksaw,
        casinoExists: !!w.hacksaw?.casino,
        casinoEnv: w.hacksaw?.casino?.env || null,
        casinoToken: !!w.hacksaw?.casino?.token,
        casinoPartnerId: !!w.hacksaw?.casino?.partnerid,
        activeScenario: !!w.hacksaw?._activeScenario,
        scenarios: !!w.hacksaw?._scenarios,
        paytablePresent: !!w.hacksaw?._activeScenario?.paytable,
        paytableBody: w.hacksaw?._activeScenario?.paytable?.body
          ? JSON.stringify(w.hacksaw._activeScenario.paytable.body).slice(0, 4000)
          : null,
        loadingStage: w.hacksaw?._loadingStage,
        gameInited: w.hacksaw?._gameConfig?.gameInited,
        balance: w.hacksaw?._user?.accountBalance ? String(w.hacksaw._user.accountBalance) : null,
        errMsg: document.querySelector('.error-message')?.innerText || null,
        canvasCount: document.querySelectorAll('canvas').length,
        // Try other places paytable might be
        scenariosKeys: w.hacksaw?._scenarios ? Object.keys(w.hacksaw._scenarios) : null,
        gameStateKeys: w.hacksaw?._gameState ? Object.keys(w.hacksaw._gameState) : null,
      };
    });
    log('Game globals:', JSON.stringify(globals, null, 2));

    if (gamePage.screenshot) {
      try {
        await gamePage.screenshot({ path: `${OUT_DIR}/02-game.png`, fullPage: true });
      } catch (e) {}
    }

    // Look for canvas / click spin
    const canvas = await gamePage.$('canvas');
    if (canvas) {
      const box = await canvas.boundingBox();
      log(`Canvas: ${box.width}x${box.height} at (${box.x}, ${box.y})`);
      // SPIN button is typically center-bottom
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height * 0.88;
      log(`Clicking potential SPIN at (${cx}, ${cy})`);
      await gamePage.mouse.click(cx, cy);
      await gamePage.waitForTimeout(8000);

      const postSpin = await gamePage.evaluate(() => ({
        paytablePresent: !!window.hacksaw?._activeScenario?.paytable,
        paytableBody: window.hacksaw?._activeScenario?.paytable?.body
          ? JSON.stringify(window.hacksaw._activeScenario.paytable.body).slice(0, 4000)
          : null,
        latestWin: window.hacksaw?._gameState?.latestWin ? String(window.hacksaw._gameState.latestWin) : null,
        userBalance: window.hacksaw?._user?.accountBalance ? String(window.hacksaw._user.accountBalance) : null,
        scenariosNow: window.hacksaw?._scenarios ? JSON.stringify(Object.keys(window.hacksaw._scenarios)) : null,
      }));
      log('Post-spin state:', JSON.stringify(postSpin, null, 2));

      if (gamePage.screenshot) {
        try {
          await gamePage.screenshot({ path: `${OUT_DIR}/03-post-spin.png`, fullPage: true });
        } catch (e) {}
      }
    } else {
      log('No canvas in game frame');
    }
  } else {
    log('No game page or frame found');
  }

  // Final top-level screenshot
  await page.screenshot({ path: `${OUT_DIR}/04-final.png`, fullPage: true });

  // Save API calls
  fs.writeFileSync(`${OUT_DIR}/api-calls.json`, JSON.stringify(apiCalls, null, 2));
  log(`Saved ${apiCalls.length} calls`);

  const rgs = apiCalls.filter((c) => c.url?.includes('rgs-') || c.url?.includes('/play/'));
  fs.writeFileSync(`${OUT_DIR}/rgs-calls.json`, JSON.stringify(rgs, null, 2));
  log(`RGS calls: ${rgs.length}`);

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
