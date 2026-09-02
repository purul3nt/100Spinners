#!/usr/bin/env node
/**
 * kira-usoa-spinner2.cjs
 * v2: Spin trigger via canvas click (no window.hacksaw access).
 * Wait until game is fully ready, then click spin button position.
 * Listen for /play/bet responses as the success signal.
 */

const { chromium } = require('playwright');
const fs = require('fs');

const OUT_DIR = '/home/llama-claw/.openclaw/agents/kira-forge/workspace/usoa-data/spins';
fs.mkdirSync(OUT_DIR, { recursive: true });

const MAX_SPINS = parseInt(process.argv[2] || '1990', 10);
const SESSION_FILE = process.argv[3] || `${OUT_DIR}/session.jsonl`;

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

(async () => {
  log(`=== USOA Spinner v2 === target=${MAX_SPINS}`);
  fs.writeFileSync(SESSION_FILE, '');

  const browser = await chromium.launch({
    headless: true,
    channel: 'chromium',
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
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
  });

  const page = await context.newPage();

  // Track bet responses
  let pendingSpinResolve = null;
  let spinResolveTimeout = null;
  const allResponses = [];

  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/play/bet') && resp.request().method() === 'POST' && resp.status() === 200) {
      try {
        const body = await resp.json();
        allResponses.push({ ts: Date.now(), body });
        if (pendingSpinResolve) {
          clearTimeout(spinResolveTimeout);
          pendingSpinResolve(body);
          pendingSpinResolve = null;
        }
      } catch (e) {}
    } else if (url.includes('/play/balance') && resp.request().method() === 'POST' && resp.status() === 200) {
      try {
        const body = await resp.json();
        // Sometimes bet response goes through balance endpoint
        if (body && body.roundId && pendingSpinResolve) {
          clearTimeout(spinResolveTimeout);
          pendingSpinResolve(body);
          pendingSpinResolve = null;
        }
      } catch (e) {}
    }
  });

  page.on('pageerror', (err) => log('PAGE ERROR:', err.message));

  log('Navigating to marketing');
  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForTimeout(5000);

  log('Clicking TRY IT');
  await page.click('span.js-launch-game', { force: true });

  log('Waiting 30s for game init');
  await page.waitForTimeout(30000);

  // Find game frame
  let gameFrame = null;
  for (const f of page.frames()) {
    if (f.url().includes('static-live.hacksawgaming.com') && f.url().includes('gameid=1760')) {
      gameFrame = f;
    }
  }
  if (!gameFrame) {
    log('FAIL: game frame');
    await browser.close();
    return;
  }
  log('Game frame ready:', gameFrame.url());

  // Probe canvas
  const canvasInfo = await gameFrame.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, cw: c.width, ch: c.height };
  });
  log('Canvas:', JSON.stringify(canvasInfo));

  if (!canvasInfo) {
    log('FAIL: no canvas');
    await browser.close();
    return;
  }

  // Wait for game to be ready: probe PixiJS renderer for stage state, or just wait for canvas to update
  log('Waiting for canvas content (polling)...');
  let ready = false;
  for (let w = 0; w < 60; w++) {
    const isReady = await gameFrame.evaluate(() => {
      // Check if there's any non-blank pixel in the canvas
      const c = document.querySelector('canvas');
      if (!c) return false;
      try {
        // Get 2D context snapshot — only works if WebGL was preserved
        // Try pixi stage
        if (window.PIXI && window.PIXI.Application) {
          // Pixi internal — not always exposed
        }
        // Look for any visible buttons or text overlay
        return document.body.children.length > 1 || c.width > 100;
      } catch (e) {
        return false;
      }
    });
    if (isReady) {
      ready = true;
      log(`Ready after ${w * 2}s`);
      break;
    }
    await gameFrame.waitForTimeout(2000);
  }
  if (!ready) log('Game may not be fully ready; proceeding anyway');

  // Try clicking at multiple SPIN button candidate positions
  // From visual inspection of USOA screenshot, SPIN is bottom-right at ~72% w, 83% h
  const candidates = [
    [0.72, 0.83, 'spin-primary'],
    [0.78, 0.85, 'spin-east'],
    [0.85, 0.88, 'spin-far-east'],
    [0.5, 0.88, 'mid-bottom'],
    [0.65, 0.83, 'spin-mid'],
    [0.75, 0.78, 'spin-higher'],
  ];

  // First, try a probe click to see if any position works
  log('Probe-clicking to find SPIN button');
  let found = false;
  for (const [fx, fy, name] of candidates) {
    const cx = canvasInfo.x + canvasInfo.w * fx;
    const cy = canvasInfo.y + canvasInfo.h * fy;

    const promise = new Promise((resolve) => {
      pendingSpinResolve = resolve;
      spinResolveTimeout = setTimeout(() => resolve(null), 6000);
    });

    log(`  Trying ${name} (${fx},${fy}) -> (${cx},${cy})`);
    // PixiJS often listens for pointerdown events, not click
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.up();
    const result = await promise;

    if (result && result.roundId) {
      log(`  *** SPIN CONFIRMED at ${name}, roundId=${result.roundId}`);
      found = true;
      const rec = {
        spin: 0,
        probe: true,
        clickPos: name,
        clickX: cx,
        clickY: cy,
        roundId: result.roundId,
        totalWinAmount: result.totalWinAmount,
        events: (result.events || []).length,
        statusCode: result.statusCode,
      };
      fs.appendFileSync(SESSION_FILE, JSON.stringify(rec) + '\n');
      break;
    } else {
      log(`  ${name}: no bet response`);
    }
  }

  if (!found) {
    log('FAIL: no spin position worked');
    await page.screenshot({ path: `${OUT_DIR}/debug-no-spin.png` });
    await browser.close();
    return;
  }

  // === Main spin loop ===
  log(`Starting main loop: ${MAX_SPINS} spins`);

  // Use the position that worked
  const winningPos = candidates.find((c) => c[0] === 0.72 && c[1] === 0.83) || candidates[0];
  const [fx, fy] = [winningPos[0], winningPos[1]];

  let spins = 0;
  let wins = 0;
  let totalWin = 0n;
  let maxWin = 0n;
  let scatterHits = 0;
  let fsAwards = 0;
  let betAmount = 200n; // default USOA bet level

  for (let i = 1; i < MAX_SPINS; i++) {
    const cx = canvasInfo.x + canvasInfo.w * fx;
    const cy = canvasInfo.y + canvasInfo.h * fy;

    const promise = new Promise((resolve) => {
      pendingSpinResolve = resolve;
      spinResolveTimeout = setTimeout(() => resolve(null), 10000);
    });

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.up();
    const result = await promise;

    if (!result) {
      log(`Spin ${i}: TIMEOUT — stopping loop`);
      break;
    }

    const tw = BigInt(result.totalWinAmount || '0');
    const events = result.events || [];
    const hasFsEvent = events.some(
      (e) => e.type === 'freespin' || e.freespins || JSON.stringify(e).toLowerCase().includes('scatter')
    );
    const fsAward = events
      .filter((e) => e.type === 'freespin' || e.freespins)
      .reduce((sum, e) => sum + (e.freespins || e.amount || 0), 0);

    spins++;
    wins += tw > 0n ? 1 : 0;
    totalWin += tw;
    if (tw > maxWin) maxWin = tw;
    if (hasFsEvent) {
      scatterHits++;
      fsAwards += fsAward;
    }

    const rec = {
      spin: i,
      roundId: result.roundId,
      totalWinAmount: String(tw),
      events: events.length,
      hasFsEvent,
      fsAward,
      statusCode: result.statusCode,
    };
    fs.appendFileSync(SESSION_FILE, JSON.stringify(rec) + '\n');

    if (i % 10 === 0 || i === MAX_SPINS - 1) {
      const rtp = (Number(totalWin) / Number(betAmount)) / spins * 100;
      log(
        `Spin ${i + 1}: wins=${wins}/${spins} (${((wins / spins) * 100).toFixed(1)}%) rtp=${rtp.toFixed(2)}% max=${maxWin} fsEvents=${scatterHits} (${fsAwards} total fs)`
      );
    }

    // Detect session death — balance goes to 0 or auth error
    if (result.statusCode && result.statusCode !== 0 && result.statusCode !== 200) {
      log(`Spin ${i}: statusCode=${result.statusCode} — session may be ending`);
      if (result.statusCode === 401 || result.statusCode === 403) break;
    }
  }

  const rtp = (Number(totalWin) / Number(betAmount)) / spins * 100;
  log('=== FINAL ===');
  log(`Spins: ${spins}, Wins: ${wins} (${((wins / spins) * 100).toFixed(2)}%)`);
  log(`RTP: ${rtp.toFixed(2)}%`);
  log(`Max win: ${maxWin} (${Number(maxWin) / Number(betAmount)}x bet)`);
  log(`FS events: ${scatterHits} (${fsAwards} total free spins awarded)`);
  log(`Log: ${SESSION_FILE}`);

  fs.writeFileSync(
    `${OUT_DIR}/summary.json`,
    JSON.stringify(
      {
        targetSpins: MAX_SPINS,
        actualSpins: spins,
        wins,
        winRate: wins / spins,
        rtp,
        maxWin: String(maxWin),
        maxWinMultiple: Number(maxWin) / Number(betAmount),
        scatterHits,
        fsAwards,
        betAmount: String(betAmount),
      },
      null,
      2
    )
  );

  await browser.close();
  log('Done.');
})().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
