#!/usr/bin/env node
/**
 * kira-usoa-spinner.cjs
 * Live USOA spin simulator. Plays 1990 spins through the actual Hacksaw demo
 * RGS, capturing every spin response and saving every 10 spins to disk.
 *
 * Usage: node kira-usoa-spinner.cjs [maxSpins=1990] [batchFile]
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT_DIR = '/home/llama-claw/.openclaw/agents/kira-forge/workspace/usoa-data/spins';
fs.mkdirSync(OUT_DIR, { recursive: true });

const MAX_SPINS = parseInt(process.argv[2] || '1990', 10);
const SESSION_FILE = process.argv[3] || `${OUT_DIR}/session.jsonl`;

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

(async () => {
  log('=== USOA Spinner ===');
  log(`Target: ${MAX_SPINS} spins, logging to ${SESSION_FILE}`);

  // Reset file
  fs.writeFileSync(SESSION_FILE, '');

  log('Launching Chromium');
  const browser = await chromium.launch({
    headless: true,
    channel: 'chromium',
    args: [
      '--disable-blink-features=AutomationControlled',
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

  // Capture bet/balance/gameEnd responses
  let pendingSpinResolve = null;
  let lastSpinResponse = null;
  const spinResponses = [];

  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/play/bet') && resp.request().method() === 'POST') {
      try {
        const body = await resp.json();
        lastSpinResponse = body;
        spinResponses.push({ ts: Date.now(), status: resp.status(), body });
        if (pendingSpinResolve) {
          pendingSpinResolve(body);
          pendingSpinResolve = null;
        }
      } catch (e) {
        log('bet parse err:', e.message);
      }
    }
  });

  page.on('pageerror', (err) => log('PAGE ERROR:', err.message));

  // === Boot game ===
  log('Navigating to marketing');
  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForTimeout(5000);

  log('Clicking TRY IT');
  await page.click('span.js-launch-game', { force: true });

  log('Waiting 25s for game init');
  await page.waitForTimeout(25000);

  // Find game frame
  let gameFrame = null;
  for (const f of page.frames()) {
    if (f.url().includes('static-live.hacksawgaming.com') && f.url().includes('gameid=1760')) {
      gameFrame = f;
      log('Game frame:', f.url());
    }
  }
  if (!gameFrame) {
    log('FAIL: game frame not found');
    await browser.close();
    return;
  }

  // Wait for full game ready
  log('Waiting 15s for canvas init');
  await gameFrame.waitForTimeout(15000);

  // Probe game state
  const probe = await gameFrame.evaluate(() => {
    return {
      hacksawKeys: window.hacksaw ? Object.keys(window.hacksaw).slice(0, 40) : null,
      gameStateKeys: window.hacksaw?._gameState ? Object.keys(window.hacksaw._gameState) : null,
      gameStateMethods: window.hacksaw?._gameState
        ? Object.keys(window.hacksaw._gameState).filter((k) => typeof window.hacksaw._gameState[k] === 'function')
        : null,
      commMethods: window.hacksaw?._comm
        ? Object.keys(window.hacksaw._comm).filter((k) => typeof window.hacksaw._comm[k] === 'function')
        : null,
      betAmount: window.hacksaw?._gameState?.betAmount ? String(window.hacksaw._gameState.betAmount) : null,
      balance: window.hacksaw?._user?.accountBalance ? String(window.hacksaw._user.accountBalance) : null,
      sessionUuid: window.hacksaw?._sessionData?.sessionUuid,
      roundInProgress: window.hacksaw?._gameState?.ongoingRound,
    };
  });
  log('Game probe:', JSON.stringify(probe, null, 2));

  // Look for SPIN button by exploring game state methods
  const spinFnName = await gameFrame.evaluate(() => {
    const gs = window.hacksaw?._gameState;
    if (!gs) return null;
    const candidates = ['placeBet', 'spin', 'playBet', 'startSpin'];
    for (const c of candidates) {
      if (typeof gs[c] === 'function') return c;
    }
    return null;
  });
  log(`Spin function: ${spinFnName || 'NONE'}`);

  // === Spin loop ===
  let spins = 0;
  let wins = 0;
  let totalWin = 0n;
  let scatterHits = 0;
  let maxWin = 0n;
  const betAmount = probe.betAmount ? BigInt(probe.betAmount) : 200n;
  log(`Bet amount: ${betAmount}`);

  async function doSpin(idx) {
    let result = null;
    let usedCanvas = false;

    // Try direct placeBet first
    if (spinFnName) {
      try {
        const promise = new Promise((resolve) => {
          pendingSpinResolve = resolve;
        });
        await gameFrame.evaluate((fn) => {
          window.hacksaw._gameState[fn]();
        }, spinFnName);
        // Wait up to 10s for bet response
        result = await Promise.race([
          promise,
          new Promise((r) => setTimeout(() => r({ timeout: true }), 10000)),
        ]);
      } catch (e) {
        log(`placeBet err spin ${idx}:`, e.message);
      }
    }

    // Fallback: click canvas
    if (!result || result.timeout) {
      usedCanvas = true;
      const canvas = await gameFrame.$('canvas');
      if (canvas) {
        const box = await canvas.boundingBox();
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height * 0.9;
        const promise = new Promise((resolve) => {
          pendingSpinResolve = resolve;
        });
        await page.mouse.click(cx, cy);
        result = await Promise.race([
          promise,
          new Promise((r) => setTimeout(() => r({ timeout: true }), 12000)),
        ]);
      }
    }

    return { result, usedCanvas };
  }

  for (let i = 0; i < MAX_SPINS; i++) {
    const { result, usedCanvas } = await doSpin(i);

    if (!result) {
      log(`Spin ${i}: NO RESULT`);
      fs.appendFileSync(SESSION_FILE, JSON.stringify({ spin: i, error: 'no_result', usedCanvas }) + '\n');
    } else if (result.timeout) {
      log(`Spin ${i}: TIMEOUT`);
      fs.appendFileSync(SESSION_FILE, JSON.stringify({ spin: i, error: 'timeout', usedCanvas }) + '\n');
    } else {
      // Parse bet response
      const body = result;
      const tw = BigInt(body.totalWinAmount || body.pendingWin || '0');
      const events = body.events || [];
      const hasScatter = events.some((e) =>
        JSON.stringify(e).toLowerCase().includes('scatter') || JSON.stringify(e).toLowerCase().includes('freespin')
      );
      const fsCount = events.filter((e) => e.type === 'freespin' || e.freespins).length;
      spins++;
      wins += tw > 0n ? 1 : 0;
      totalWin += tw;
      if (tw > maxWin) maxWin = tw;
      if (hasScatter || fsCount > 0) scatterHits++;

      const rec = {
        spin: i,
        roundId: body.roundId,
        totalWinAmount: String(tw),
        balance: body.accountBalance?.balance ? String(body.accountBalance.balance) : null,
        events: events.length,
        hasScatter,
        fsCount,
        statusCode: body.statusCode,
        statusMessage: body.statusMessage,
      };
      fs.appendFileSync(SESSION_FILE, JSON.stringify(rec) + '\n');

      // Every 10 spins: report and flush stats
      if ((i + 1) % 10 === 0) {
        const winRate = wins / spins;
        const rtp = (Number(totalWin) / Number(betAmount)) / spins * 100;
        log(
          `Spin ${i + 1}/${MAX_SPINS}: wins=${wins} (${(winRate * 100).toFixed(1)}%) rtp=${rtp.toFixed(2)}% max=${maxWin} scatter=${scatterHits}`
        );
      }
    }

    // Check for rate-limit / session-death signals
    if (i > 0 && i % 50 === 0) {
      const balance = await gameFrame
        .evaluate(() => {
          return window.hacksaw?._user?.accountBalance ? String(window.hacksaw._user.accountBalance) : null;
        })
        .catch(() => null);
      log(`  balance check @ ${i}: ${balance}`);
      if (!balance || balance === '0') {
        log('SESSION DEAD — stopping');
        break;
      }
    }
  }

  // Final stats
  const winRate = wins / spins;
  const rtp = (Number(totalWin) / Number(betAmount)) / spins * 100;
  log('=== FINAL ===');
  log(`Spins: ${spins}, Wins: ${wins} (${(winRate * 100).toFixed(2)}%)`);
  log(`RTP: ${rtp.toFixed(2)}%`);
  log(`Max win: ${maxWin} = ${Number(maxWin) / Number(betAmount)}x bet`);
  log(`Scatter/FS hits: ${scatterHits}`);
  log(`Session log: ${SESSION_FILE}`);

  // Save summary
  fs.writeFileSync(
    `${OUT_DIR}/summary.json`,
    JSON.stringify(
      {
        spins,
        wins,
        winRate,
        rtp,
        maxWin: String(maxWin),
        maxWinMultiple: Number(maxWin) / Number(betAmount),
        scatterHits,
        betAmount: String(betAmount),
        targetSpins: MAX_SPINS,
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
