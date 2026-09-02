#!/usr/bin/env node
/**
 * kira-play-real.cjs
 * Launch real Chromium against the Hacksaw marketing site, click TRY IT,
 * wait for the game iframe to load, capture all RGS API traffic, and click
 * SPIN to observe the bet request/response. Extract paytable from network
 * or window globals.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT_DIR = '/tmp/kira-usoa-real';
fs.mkdirSync(OUT_DIR, { recursive: true });

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

(async () => {
  log('Launching Chromium with stealth flags');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chromium',
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-web-security',
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

  // Remove webdriver flag
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  });

  const page = await context.newPage();

  // === Capture everything ===
  const apiCalls = [];
  page.on('request', (req) => {
    const url = req.url();
    if (
      url.includes('hacksawgaming.com') ||
      url.includes('rgs-') ||
      url.includes('static-live')
    ) {
      apiCalls.push({
        kind: 'request',
        method: req.method(),
        url,
        headers: req.headers(),
        body: req.postData(),
        time: Date.now(),
      });
    }
  });

  page.on('response', async (resp) => {
    const url = resp.url();
    if (
      url.includes('hacksawgaming.com') ||
      url.includes('rgs-') ||
      url.includes('static-live')
    ) {
      try {
        const ct = resp.headers()['content-type'] || '';
        let body = null;
        if (ct.includes('json')) body = await resp.json();
        else if (ct.includes('text')) body = await resp.text();
        else body = `<binary ${ct} ${(await resp.body().catch(() => Buffer.alloc(0))).length}B>`;
        apiCalls.push({
          kind: 'response',
          method: resp.request().method(),
          url,
          status: resp.status(),
          headers: resp.headers(),
          body,
          time: Date.now(),
        });
      } catch (e) {
        apiCalls.push({
          kind: 'response-error',
          url,
          status: resp.status(),
          err: String(e),
          time: Date.now(),
        });
      }
    }
  });

  page.on('pageerror', (err) => {
    log('PAGE ERROR:', err.message);
  });

  page.on('console', (msg) => {
    const t = msg.text();
    if (
      t.includes('paytable') ||
      t.includes('scenario') ||
      t.includes('error') ||
      t.includes('Hacksaw') ||
      t.includes('error')
    ) {
      log('CONSOLE:', msg.type(), t.slice(0, 200));
    }
  });

  log('Navigating to marketing page');
  try {
    await page.goto(
      'https://www.hacksawgaming.com/games/ultimate-slot-of-america',
      { waitUntil: 'domcontentloaded', timeout: 60000 }
    );
  } catch (e) {
    log('Nav error:', e.message);
  }

  // Wait for CF challenge or page settle
  log('Waiting 8s for CF challenge / page settle');
  await page.waitForTimeout(8000);

  await page.screenshot({ path: `${OUT_DIR}/01-after-load.png`, fullPage: true });
  log('Saved 01-after-load.png');

  // Look for TRY IT button (multiple selectors)
  const tryItSelectors = [
    'span.js-launch-game',
    'text=/try.*it/i',
    'button:has-text("Try it")',
    '.launch-game',
    'a[href*="launch"]',
    '[data-gameid="1760"]',
  ];

  let clicked = false;
  for (const sel of tryItSelectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        log(`Found TRY IT with selector: ${sel}`);
        await el.click({ force: true });
        clicked = true;
        break;
      }
    } catch (e) {
      // continue
    }
  }

  if (!clicked) {
    log('TRY IT not found via selectors; listing visible buttons');
    const buttons = await page.$$eval('button, span, a', (els) =>
      els
        .filter((e) => e.offsetParent !== null && e.innerText?.trim())
        .map((e) => ({
          tag: e.tagName,
          text: e.innerText.trim().slice(0, 60),
          cls: e.className.slice(0, 80),
        }))
        .slice(0, 20)
    );
    log('Visible clickables:', JSON.stringify(buttons, null, 2));
  }

  log('Waiting 15s for game iframe');
  await page.waitForTimeout(15000);

  await page.screenshot({ path: `${OUT_DIR}/02-after-try-it.png`, fullPage: true });
  log('Saved 02-after-try-it.png');

  // Look for iframe
  const iframes = await page.$$eval('iframe', (els) =>
    els.map((e) => ({ src: e.src, id: e.id, name: e.name, w: e.clientWidth, h: e.clientHeight }))
  );
  log('Iframes:', JSON.stringify(iframes, null, 2));

  // Try to access the iframe
  let gameFrame = null;
  for (const f of page.frames()) {
    if (
      f.url().includes('static-live.hacksawgaming.com') ||
      f.url().includes('index.html?gameid=1760')
    ) {
      log('Found game frame:', f.url());
      gameFrame = f;
      break;
    }
  }

  if (gameFrame) {
    log('Waiting 10s for game init inside iframe');
    await gameFrame.waitForTimeout(10000);

    // Inspect globals
    const globals = await gameFrame.evaluate(() => {
      const out = {};
      out.windowHacksaw = typeof window.hacksaw;
      out.windowHacksawCasino = typeof window.hacksawCasino;
      out.windowHacksawUI = typeof window.hacksawUI;
      out.casinoExists = !!window.hacksaw?.casino;
      out.casinoKeys = window.hacksaw?.casino ? Object.keys(window.hacksaw.casino) : null;
      out.activeScenario = !!window.hacksaw?._activeScenario;
      out.paytable = window.hacksaw?._activeScenario?.paytable
        ? 'present'
        : 'missing';
      out.paytableBody = window.hacksaw?._activeScenario?.paytable?.body
        ? Object.keys(window.hacksaw._activeScenario.paytable.body)
        : null;
      out.PIXI = typeof window.PIXI;
      out.scenarios = !!window.hacksaw?._scenarios;
      out.gameState = window.hacksaw?._gameState ? Object.keys(window.hacksaw._gameState) : null;
      out.errors = window.__hacksawErrors || null;
      return out;
    });
    log('Game globals:', JSON.stringify(globals, null, 2));

    // Look for SPIN button inside iframe
    const spinSelectors = [
      'button[aria-label*="spin" i]',
      'button[aria-label*="Spin" i]',
      'canvas',
      '[class*="spin" i]',
      '[class*="Spin" i]',
    ];

    let spinClicked = false;
    for (const sel of spinSelectors) {
      try {
        const els = await gameFrame.$$(sel);
        if (els.length) {
          log(`Spin candidate ${sel}: ${els.length} elements`);
          for (const el of els) {
            const box = await el.boundingBox();
            if (box && box.width > 50 && box.width < 200 && box.height > 50 && box.height < 200) {
              log(`Clicking spin-like element at (${box.x + box.width / 2}, ${box.y + box.height / 2})`);
              await gameFrame.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
              spinClicked = true;
              break;
            }
          }
          if (spinClicked) break;
        }
      } catch (e) {
        // continue
      }
    }

    if (spinClicked) {
      log('Spin clicked. Waiting 8s for response.');
      await gameFrame.waitForTimeout(8000);
    } else {
      log('No spin button found. Listing iframe buttons.');
      const buttons = await gameFrame.$$eval('button, [role="button"]', (els) =>
        els
          .filter((e) => e.offsetParent !== null)
          .map((e) => ({
            tag: e.tagName,
            text: (e.innerText || e.ariaLabel || e.title || '').slice(0, 60),
            cls: (e.className || '').slice(0, 80),
          }))
          .slice(0, 20)
      );
      log('Iframe buttons:', JSON.stringify(buttons, null, 2));
    }

    // Re-check paytable after spin
    const postSpin = await gameFrame.evaluate(() => {
      const out = {};
      out.paytableNow = window.hacksaw?._activeScenario?.paytable ? 'present' : 'missing';
      out.paytableBodyNow = window.hacksaw?._activeScenario?.paytable?.body
        ? JSON.stringify(window.hacksaw._activeScenario.paytable.body).slice(0, 2000)
        : null;
      out.scenariosNow = !!window.hacksaw?._scenarios;
      out.gameStateNow = window.hacksaw?._gameState
        ? JSON.stringify({
            ongoingRound: window.hacksaw._gameState.ongoingRound,
            balance: window.hacksaw._gameState.betAmount,
          })
        : null;
      return out;
    });
    log('Post-spin state:', JSON.stringify(postSpin, null, 2));

    await gameFrame.screenshot({ path: `${OUT_DIR}/03-iframe-after.png`, fullPage: true });
    log('Saved 03-iframe-after.png');
  }

  // Save all captured API calls
  fs.writeFileSync(`${OUT_DIR}/api-calls.json`, JSON.stringify(apiCalls, null, 2));
  log(`Saved ${apiCalls.length} API calls to ${OUT_DIR}/api-calls.json`);

  // Filter for RGS calls
  const rgsCalls = apiCalls.filter(
    (c) => c.url && (c.url.includes('rgs-') || c.url.includes('/play/'))
  );
  log(`RGS-specific calls: ${rgsCalls.length}`);
  fs.writeFileSync(`${OUT_DIR}/rgs-calls.json`, JSON.stringify(rgsCalls, null, 2));

  // Final top-level page screenshot
  await page.screenshot({ path: `${OUT_DIR}/04-final-page.png`, fullPage: true });

  await browser.close();
  log('Done.');
})().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
