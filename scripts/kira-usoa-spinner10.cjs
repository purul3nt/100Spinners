#!/usr/bin/env node
/**
 * kira-usoa-spinner10.cjs
 * Cleaner board-capture spinner for USOA.
 * Uses page.waitForResponse (canonical Playwright) — no listener accumulation.
 * Auto-recovers from session death.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT_DIR = '/home/llama-claw/.openclaw/agents/kira-forge/workspace/usoa-data/spins';
fs.mkdirSync(OUT_DIR, { recursive: true });

const TARGET_TOTAL = parseInt(process.argv[2] || '2000', 10);
const PARALLEL = parseInt(process.argv[3] || '8', 10);
const WAIT_MS = parseInt(process.argv[4] || '4000', 10);
const BET_AMOUNT = '200';

const SYM_NAMES = {
  1: 'LOW_1', 2: 'LOW_2', 3: 'LOW_3', 4: 'LOW_4',
  5: 'HIGH_1', 6: 'HIGH_2', 7: 'HIGH_3', 8: 'HIGH_4',
  12: 'FS',
  21: 'WILD_X1', 22: 'WILD_X2', 23: 'WILD_X3', 24: 'WILD_X4', 25: 'WILD_X5',
  26: 'WILD_X6', 27: 'WILD_X7', 28: 'WILD_X8', 29: 'WILD_X9', 30: 'WILD_X10',
};

function decodeGrid(gridStr) {
  if (!gridStr || gridStr.length < 2) return null;
  const w = gridStr.charCodeAt(0) - 40;
  const h = gridStr.charCodeAt(1) - 40;
  const body = gridStr.slice(2);
  if (body.length !== w * h) return null;
  const board = [];
  const ids = [];
  for (let r = 0; r < h; r++) {
    const row = [];
    for (let c = 0; c < w; c++) {
      const id = body.charCodeAt(r * w + c) - 40;
      ids.push(id);
      row.push({ id, name: SYM_NAMES[id] || `?${id}` });
    }
    board.push(row);
  }
  return { width: w, height: h, ids, board };
}

async function runOne(browserIdx, outFile, sharedState) {
  const log = (...args) => console.log(`[B${browserIdx}]`, ...args);

  let browser, context, page, gameFrame;
  let sessionUuid = null;
  let sessionNum = 0;
  let localSpins = 0;
  let totalCaptured = 0;

  const stream = fs.createWriteStream(outFile, { flags: 'a' });

  async function bootSession() {
    sessionNum++;
    if (browser) await browser.close().catch(() => {});
    browser = await chromium.launch({
      headless: true, channel: 'chromium',
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
    });
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }, locale: 'en-US', ignoreHTTPSErrors: true,
    });
    await context.addCookies([
      { name: 'CookiesConsent', value: 'granted', domain: '.hacksawgaming.com', path: '/' },
      { name: 'age_verified', value: 'true', domain: '.hacksawgaming.com', path: '/' },
    ]);

    page = await context.newPage();
    gameFrame = null;
    sessionUuid = null;

    page.on('response', async (resp) => {
      if (resp.url().includes('/play/authenticate') && resp.status() === 200) {
        try {
          const body = await resp.json();
          if (body.sessionUuid) sessionUuid = body.sessionUuid;
        } catch (e) {}
      }
    });

    await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);
    await page.click('span.js-launch-game', { force: true });
    await page.waitForTimeout(35000);

    for (const f of page.frames()) {
      if (f.url().includes('static-live.hacksawgaming.com') && f.url().includes('gameid=1760')) {
        gameFrame = f;
        break;
      }
    }
    if (!gameFrame || !sessionUuid) throw new Error('boot fail');

    await gameFrame.waitForSelector('canvas', { timeout: 30000 });
    await gameFrame.waitForTimeout(12000);
    const cv = await gameFrame.evaluate(() => {
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    await page.mouse.click(cv.x + cv.w * 0.4, cv.y + cv.h * 0.81);
    await gameFrame.waitForTimeout(2500);
    await gameFrame.focus('canvas');
    await page.waitForTimeout(500);

    log(`Session ${sessionNum}: ${sessionUuid.slice(0, 8)}…`);
  }

  async function spin() {
    if (!sessionUuid) {
      await bootSession().catch((e) => { throw e; });
    }
    // Press Space FIRST so the bet request is in-flight before we wait
    // This avoids matching an in-flight confirmRound from the previous spin
    const pressPromise = page.keyboard.press('Space');
    const responsePromise = page.waitForResponse(
      (resp) => {
        const url = resp.url();
        if (!url.includes('/play/bet')) return false;
        if (resp.status() !== 200) return false;
        // Must be a real bet response (not confirmRound which returns events=0)
        // We can't read body here, but we can check timing — bet always comes BEFORE confirmRound
        return true;
      },
      { timeout: WAIT_MS + 4000 }
    );
    await pressPromise;
    let resp;
    try {
      resp = await responsePromise;
    } catch (e) {
      return { ok: false, reason: 'timeout' };
    }
    let body;
    try {
      body = await resp.json();
    } catch (e) {
      return { ok: false, reason: 'parse' };
    }
    // The first response may be a confirmRound from previous spin still in flight.
    // If so, wait for the actual bet response.
    if (!body.round || !body.round.events || body.round.events.length === 0) {
      // This is a confirmRound - wait for the real bet
      try {
        const resp2 = await page.waitForResponse(
          (r) => r.url().includes('/play/bet') && r.status() === 200,
          { timeout: WAIT_MS + 4000 }
        );
        body = await resp2.json();
      } catch (e) {
        return { ok: false, reason: 'no-bet-after-confirm' };
      }
    }
    return { ok: true, body, sessionUuid };
  }

  try {
    while (totalCaptured < TARGET_TOTAL / PARALLEL + 30 && sharedState.globalDone < TARGET_TOTAL) {
      const result = await spin();

      if (!result.ok) {
        if (result.reason === 'timeout') {
          if (localSpins % 20 === 0 && localSpins > 0) log(`Timeout at ${localSpins}`);
        } else {
          log(`Session died at ${localSpins}: ${result.reason}`);
        }
        sessionUuid = null;
        await page.waitForTimeout(1500);
        continue;
      }

      const body = result.body;
      const roundEvents = (body.round && body.round.events) || [];
      const roundId = body.round?.roundId;
      const roundStatus = body.round?.status;

      // Filter confirmRound responses
      if (roundEvents.length === 0) {
        sessionUuid = null;
        continue;
      }

      // Compute total win (maxAwa)
      let spinWin = 0n;
      for (const ev of roundEvents) {
        if (ev.awa) {
          const v = BigInt(ev.awa);
          if (v > spinWin) spinWin = v;
        }
      }

      // Extract initial reveal board
      let boardData = null;
      for (const ev of roundEvents) {
        if (ev.etn === 'reveal' && ev.c && ev.c.grid) {
          boardData = {
            gridRaw: ev.c.grid,
            stops: ev.c.stops,
            reelSet: ev.c.reelSet,
            decoded: decodeGrid(ev.c.grid),
          };
          break;
        }
      }

      // Extract respin cascade grids
      const respinGrids = [];
      for (const ev of roundEvents) {
        if (ev.etn === 'respin' && ev.c && ev.c.grid) {
          respinGrids.push({
            gridRaw: ev.c.grid,
            stops: ev.c.stops,
            decoded: decodeGrid(ev.c.grid),
            awa: ev.awa,
            wa: ev.wa,
          });
        }
      }

      const hasFs = roundEvents.some((e) => e.etn === 'freespin' || e.etn === 'feature_enter' || e.freespins);
      const fsAmt = roundEvents
        .filter((e) => e.etn === 'freespin' || e.freespins)
        .reduce((s, e) => s + (e.freespins || e.amount || 0), 0);

      const rec = {
        spin: localSpins++,
        sessionNum,
        sessionUuid,
        roundId,
        statusCode: body.statusCode,
        roundStatus,
        totalWinAmount: String(spinWin),
        events: roundEvents.length,
        etnTypes: [...new Set(roundEvents.map((e) => e.etn))],
        hasFs, fsAmt,
        balance: body.accountBalance?.balance,
        board: boardData,
        respinGrids,
        bet: BET_AMOUNT,
        timestamp: new Date().toISOString(),
      };

      stream.write(JSON.stringify(rec) + '\n');
      totalCaptured++;
      sharedState.globalDone++;

      if (body.statusCode === 401 || body.statusCode === 403) {
        log(`Session dying at ${localSpins}: ${body.statusCode}`);
        sessionUuid = null;
      }
      if (localSpins % 50 === 0) {
        log(`${localSpins} spins done (total ${totalCaptured}, global ${sharedState.globalDone})`);
      }
    }
  } catch (e) {
    log('Fatal:', e.message);
  } finally {
    stream.end();
    if (browser) await browser.close().catch(() => {});
  }
  return totalCaptured;
}

(async () => {
  console.log(`[${new Date().toISOString()}] === USOA v10 Board-Capture ===`);
  console.log(`Target: ${TARGET_TOTAL} spins, ${PARALLEL} browsers, ${WAIT_MS}ms wait`);

  const sharedState = { globalDone: 0 };
  const timestamp = Date.now();
  const promises = [];
  for (let i = 0; i < PARALLEL; i++) {
    const outFile = path.join(OUT_DIR, `v10-b${i}-${timestamp}.jsonl`);
    promises.push(runOne(i, outFile, sharedState));
  }

  const startTime = Date.now();
  const results = await Promise.all(promises);
  const elapsed = (Date.now() - startTime) / 1000;

  console.log(`\n=== DONE ===`);
  console.log(`Total: ${sharedState.globalDone} spins in ${elapsed.toFixed(0)}s (${(sharedState.globalDone/elapsed).toFixed(2)} spins/s)`);
  for (let i = 0; i < results.length; i++) {
    console.log(`  B${i}: ${results[i]} spins`);
  }
})().catch((e) => { console.error('FATAL:', e); process.exit(1); });
