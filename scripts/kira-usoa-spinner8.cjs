#!/usr/bin/env node
/**
 * kira-usoa-spinner8.cjs
 * v8: Fixed parser — use maxAwa as spin total, filter confirmRound.
 * Space-key spin in tight loop, parallel browsers.
 */

const { chromium } = require('playwright');
const fs = require('fs');

const OUT_DIR = '/home/llama-claw/.openclaw/agents/kira-forge/workspace/usoa-data/spins';
fs.mkdirSync(OUT_DIR, { recursive: true });

const TARGET_PER_BROWSER = parseInt(process.argv[2] || '400', 10);
const PARALLEL = parseInt(process.argv[3] || '5', 10);
const WAIT_MS = parseInt(process.argv[4] || '3000', 10);
const BET_AMOUNT = '200';
const TOTAL_TARGET = TARGET_PER_BROWSER * PARALLEL;

function log(...args) { console.log(`[${new Date().toISOString()}]`, ...args); }

async function runOne(browserIdx, numSpins, outFile) {
  const log = (...args) => console.log(`[B${browserIdx}]`, ...args);
  fs.writeFileSync(outFile, '');

  const browser = await chromium.launch({
    headless: true, channel: 'chromium',
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }, locale: 'en-US', ignoreHTTPSErrors: true,
  });

  await context.addCookies([
    { name: 'CookiesConsent', value: 'granted', domain: '.hacksawgaming.com', path: '/' },
    { name: 'age_verified', value: 'true', domain: '.hacksawgaming.com', path: '/' },
  ]);

  const page = await context.newPage();

  let sessionUuid = null;
  page.on('response', async (resp) => {
    if (resp.url().includes('/play/authenticate') && resp.status() === 200) {
      try {
        const body = await resp.json();
        if (body.sessionUuid) sessionUuid = body.sessionUuid;
      } catch (e) {}
    }
  });

  let pendingResolve = null;
  page.on('response', async (resp) => {
    if (resp.url().includes('/play/bet') && resp.status() === 200 && pendingResolve) {
      try {
        const body = await resp.json();
        const r = pendingResolve;
        pendingResolve = null;
        r(body);
      } catch (e) {}
    }
  });

  try {
    log('Booting...');
    await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);
    await page.click('span.js-launch-game', { force: true });
    await page.waitForTimeout(35000);

    let gameFrame = null;
    for (const f of page.frames()) {
      if (f.url().includes('static-live.hacksawgaming.com') && f.url().includes('gameid=1760')) gameFrame = f;
    }
    if (!gameFrame || !sessionUuid) {
      log('FAIL boot');
      await browser.close();
      return null;
    }
    log(`Session: ${sessionUuid}`);

    await gameFrame.waitForSelector('canvas', { timeout: 30000 });
    await gameFrame.waitForTimeout(15000);
    const cv = await gameFrame.evaluate(() => {
      const c = document.querySelector('canvas');
      const r = c.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    await page.mouse.click(cv.x + cv.w * 0.4, cv.y + cv.h * 0.81);
    await gameFrame.waitForTimeout(3000);
    await gameFrame.focus('canvas');
    await page.waitForTimeout(500);

    let spins = 0, wins = 0, totalWin = 0n, maxWin = 0n, scatterHits = 0, fsAwards = 0;
    let nonSpinResponses = 0;

    for (let i = 0; i < numSpins; i++) {
      const promise = new Promise((resolve) => {
        pendingResolve = resolve;
        setTimeout(() => {
          if (pendingResolve === resolve) {
            pendingResolve = null;
            resolve({ statusCode: -1, round: { events: [] } });
          }
        }, WAIT_MS + 4000);
      });

      await page.keyboard.press('Space');
      const body = await promise;

      if (!body || body.statusCode === -1) {
        log(`Spin ${i}: timeout/no resp`);
        continue;
      }

      const roundEvents = (body.round && body.round.events) || [];
      const roundId = body.round?.roundId || body.roundId;

      // Filter: confirmRound responses have events=0 AND no roundId
      if (roundEvents.length === 0 && !roundId) {
        nonSpinResponses++;
        continue;
      }

      // Use maxAwa (accumulated win) as spin total
      let spinWin = 0n;
      for (const ev of roundEvents) {
        if (ev.awa) {
          const v = BigInt(ev.awa);
          if (v > spinWin) spinWin = v;
        }
      }

      const hasFs = roundEvents.some(
        (e) => e.etn === 'freespin' || e.freespins || JSON.stringify(e).toLowerCase().includes('scatter')
      );
      const fsAmt = roundEvents
        .filter((e) => e.etn === 'freespin' || e.freespins)
        .reduce((s, e) => s + (e.freespins || e.amount || 0), 0);

      spins++;
      if (spinWin > 0n) wins++;
      totalWin += spinWin;
      if (spinWin > maxWin) maxWin = spinWin;
      if (hasFs) {
        scatterHits++;
        fsAwards += fsAmt;
      }

      const rec = {
        spin: i,
        roundId,
        statusCode: body.statusCode,
        roundStatus: body.round?.status,
        totalWinAmount: String(spinWin),
        events: roundEvents.length,
        etnTypes: [...new Set(roundEvents.map((e) => e.etn))],
        hasFs, fsAmt,
        balance: body.accountBalance?.balance,
      };
      fs.appendFileSync(outFile, JSON.stringify(rec) + '\n');

      if (spins % 20 === 0) {
        const rtp = (Number(totalWin) / Number(BigInt(BET_AMOUNT))) / spins * 100;
        log(`${spins}/${numSpins} wins=${wins} rtp=${rtp.toFixed(1)}% max=${maxWin}`);
      }

      if (body.statusCode === 401 || body.statusCode === 403) {
        log(`Session dying at ${i}: ${body.statusCode}`);
        break;
      }
    }

    const rtp = (Number(totalWin) / Number(BigInt(BET_AMOUNT))) / spins * 100;
    log(`Done: ${spins} spins, ${wins} wins, RTP ${rtp.toFixed(2)}%, max ${maxWin}, FS events ${scatterHits} (${fsAwards} fs), non-spin-resps ${nonSpinResponses}`);

    await browser.close();
    return { sessionUuid, spins, wins, totalWin: Number(totalWin), rtp, maxWin: Number(maxWin), scatterHits, fsAwards, nonSpinResponses };
  } catch (e) {
    log('ERR:', e.message);
    await browser.close();
    return null;
  }
}

(async () => {
  log(`=== USOA Parallel Spinner v8 === ${PARALLEL} browsers, ${TARGET_PER_BROWSER} spins each (${TOTAL_TARGET} total)`);

  const promises = [];
  for (let i = 0; i < PARALLEL; i++) {
    const outFile = `${OUT_DIR}/b${i}.jsonl`;
    promises.push(runOne(i, TARGET_PER_BROWSER, outFile));
  }

  const startTime = Date.now();
  const results = await Promise.all(promises);
  const elapsed = (Date.now() - startTime) / 1000;

  log('=== ALL DONE ===');
  let allSpins = 0, allWins = 0, allWin = 0n, allMax = 0n, allFs = 0, allFsAmt = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (!r) {
      log(`B${i}: FAILED`);
    } else {
      log(`B${i}: ${r.spins} spins, ${r.wins} wins, RTP ${r.rtp.toFixed(2)}%, max ${r.maxWin}, FS ${r.scatterHits}`);
      allSpins += r.spins;
      allWins += r.wins;
      allWin += BigInt(r.totalWin);
      if (BigInt(r.maxWin) > allMax) allMax = BigInt(r.maxWin);
      allFs += r.scatterHits;
      allFsAmt += r.fsAwards;
    }
  }

  const aggRtp = (Number(allWin) / Number(BigInt(BET_AMOUNT))) / allSpins * 100;
  log(`\n=== AGGREGATE ===`);
  log(`Spins: ${allSpins} (in ${elapsed.toFixed(0)}s, ${(allSpins / elapsed).toFixed(2)} spins/s)`);
  log(`Wins: ${allWins} (${(allWins / allSpins * 100).toFixed(2)}% hit)`);
  log(`Total win: ${allWin} Expected at 96% RTP: ${(allSpins * 200 * 0.96).toFixed(0)}`);
  log(`RTP: ${aggRtp.toFixed(2)}%`);
  log(`Max win: ${allMax} (${(Number(allMax) / 200).toFixed(1)}x)`);
  log(`FS events: ${allFs} (${allFsAmt} fs awarded)`);

  fs.writeFileSync(`${OUT_DIR}/parallel-summary.json`, JSON.stringify({
    parallel: PARALLEL,
    targetPerBrowser: TARGET_PER_BROWSER,
    targetTotal: TOTAL_TARGET,
    actualSpins: allSpins,
    wins: allWins,
    hitRate: allWins / allSpins,
    rtp: aggRtp,
    maxWin: Number(allMax),
    maxWinX: Number(allMax) / 200,
    scatterHits: allFs,
    fsAwards: allFsAmt,
    elapsedSec: elapsed,
    spinsPerSec: allSpins / elapsed,
    perBrowser: results,
  }, null, 2));

  log('Saved parallel-summary.json');
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
