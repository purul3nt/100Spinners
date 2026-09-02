#!/usr/bin/env node
/**
 * kira-usoa-spinner3.cjs
 * v3: Dismiss splash "CLICK TO CONTINUE" first, then spin.
 */

const { chromium } = require('playwright');
const fs = require('fs');

const OUT_DIR = '/home/llama-claw/.openclaw/agents/kira-forge/workspace/usoa-data/spins';
fs.mkdirSync(OUT_DIR, { recursive: true });

const MAX_SPINS = parseInt(process.argv[2] || '1990', 10);
const SESSION_FILE = process.argv[3] || `${OUT_DIR}/session.jsonl`;
const CHECKPOINT_EVERY = 10;

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

(async () => {
  log(`=== USOA Spinner v3 === target=${MAX_SPINS}`);
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

  let pendingSpinResolve = null;
  let spinResolveTimeout = null;
  let totalPosts = 0;

  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/play/bet') && resp.request().method() === 'POST' && resp.status() === 200) {
      try {
        const body = await resp.json();
        totalPosts++;
        if (pendingSpinResolve) {
          clearTimeout(spinResolveTimeout);
          pendingSpinResolve(body);
          pendingSpinResolve = null;
        }
      } catch (e) {}
    }
  });

  page.on('pageerror', (err) => log('PAGE ERROR:', err.message));

  log('Navigate + click TRY IT');
  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForTimeout(5000);
  await page.click('span.js-launch-game', { force: true });
  log('Waiting 25s for iframe');
  await page.waitForTimeout(25000);

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
  log('Game frame:', gameFrame.url());

  // Wait for canvas
  log('Waiting for canvas');
  await gameFrame.waitForSelector('canvas', { timeout: 30000 });

  const cv = await gameFrame.evaluate(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  log('Canvas:', JSON.stringify(cv));

  // === Step 1: dismiss "CLICK TO CONTINUE" splash ===
  log('Dismissing splash — clicking (0.4, 0.81)');
  await page.mouse.click(cv.x + cv.w * 0.4, cv.y + cv.h * 0.81);
  await gameFrame.waitForTimeout(5000);

  // Screenshot to confirm splash is gone
  await page.screenshot({ path: `${OUT_DIR}/splash-dismissed.png` });

  // Verify by checking body innerText
  const afterDismiss = await gameFrame.evaluate(() => document.body.innerText);
  log('Body after dismiss:', afterDismiss.slice(0, 300));

  // === Step 2: find SPIN button ===
  // After splash, real game UI shows. SPIN button visual position: ~(1027, 663)
  // in canvas-relative coords. That's (0.602, 0.690) fractional.
  let spinFx = 0.602,
    spinFy = 0.690;

  // Probe a few positions
  log('Probing SPIN button position');
  for (const [fx, fy, name] of [
    [0.602, 0.690, 'p1-visual'],
    [0.61, 0.69, 'p2'],
    [0.59, 0.70, 'p3'],
    [0.60, 0.71, 'p4'],
    [0.65, 0.70, 'p5'],
  ]) {
    const x = cv.x + cv.w * fx;
    const y = cv.y + cv.h * fy;
    const promise = new Promise((resolve) => {
      pendingSpinResolve = resolve;
      spinResolveTimeout = setTimeout(() => resolve(null), 6000);
    });
    log(`  Probe ${name} (${fx},${fy}) -> (${x},${y})`);
    await page.mouse.click(x, y);
    const result = await promise;
    if (result && result.roundId) {
      log(`  *** SPIN CONFIRMED at ${name}, roundId=${result.roundId}`);
      spinFx = fx;
      spinFy = fy;
      fs.appendFileSync(SESSION_FILE, JSON.stringify({
        spin: 0, probe: name, roundId: result.roundId,
        totalWinAmount: result.totalWinAmount, events: (result.events || []).length,
      }) + '\n');
      break;
    }
  }

  // === Step 3: main spin loop ===
  log(`Main loop: ${MAX_SPINS} spins at (${spinFx},${spinFy})`);
  let spins = 0,
    wins = 0,
    totalWin = 0n,
    maxWin = 0n,
    scatterHits = 0,
    fsAwards = 0;
  const betAmount = 200n;

  for (let i = 1; i < MAX_SPINS; i++) {
    const x = cv.x + cv.w * spinFx;
    const y = cv.y + cv.h * spinFy;

    const promise = new Promise((resolve) => {
      pendingSpinResolve = resolve;
      spinResolveTimeout = setTimeout(() => resolve(null), 12000);
    });

    await page.mouse.move(x, y);
    await page.waitForTimeout(100);
    await page.mouse.down();
    await page.waitForTimeout(80);
    await page.mouse.up();
    const result = await promise;

    if (!result) {
      log(`Spin ${i}: TIMEOUT — stopping`);
      break;
    }

    const tw = BigInt(result.totalWinAmount || '0');
    const events = result.events || [];
    const hasFs = events.some(
      (e) => e.type === 'freespin' || e.freespins || JSON.stringify(e).toLowerCase().includes('scatter')
    );
    const fsAmt = events
      .filter((e) => e.type === 'freespin' || e.freespins)
      .reduce((s, e) => s + (e.freespins || e.amount || 0), 0);

    spins++;
    if (tw > 0n) wins++;
    totalWin += tw;
    if (tw > maxWin) maxWin = tw;
    if (hasFs) {
      scatterHits++;
      fsAwards += fsAmt;
    }

    const rec = {
      spin: i,
      roundId: result.roundId,
      totalWinAmount: String(tw),
      events: events.length,
      hasFs,
      fsAmt,
    };
    fs.appendFileSync(SESSION_FILE, JSON.stringify(rec) + '\n');

    if (i % CHECKPOINT_EVERY === 0 || i === MAX_SPINS - 1) {
      const rtp = (Number(totalWin) / Number(betAmount)) / spins * 100;
      log(
        `Spin ${i + 1}/${MAX_SPINS}: wins=${wins}/${spins} rtp=${rtp.toFixed(2)}% max=${maxWin} fs=${scatterHits}(${fsAwards})`
      );
      // Checkpoint summary
      fs.writeFileSync(`${OUT_DIR}/checkpoint.json`, JSON.stringify({
        lastSpin: i + 1,
        spins, wins, rtp, maxWin: String(maxWin), scatterHits, fsAwards,
      }, null, 2));
    }
  }

  const rtp = (Number(totalWin) / Number(betAmount)) / spins * 100;
  log('=== FINAL ===');
  log(`Spins: ${spins} Wins: ${wins} RTP: ${rtp.toFixed(2)}% Max: ${maxWin} FS: ${scatterHits}/${fsAwards}`);

  fs.writeFileSync(`${OUT_DIR}/summary.json`, JSON.stringify({
    target: MAX_SPINS,
    actual: spins,
    wins, winRate: wins / spins, rtp,
    maxWin: String(maxWin),
    maxWinX: Number(maxWin) / Number(betAmount),
    scatterHits, fsAwards,
  }, null, 2));

  await browser.close();
  log('Done.');
})().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
