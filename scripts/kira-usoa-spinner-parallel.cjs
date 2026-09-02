#!/usr/bin/env node
/**
 * kira-usoa-spinner-parallel.cjs
 * Run N parallel browser contexts, each spinning M times via Space key.
 * Logs every spin. Aggregates results at the end.
 */

const { chromium } = require('playwright');
const fs = require('fs');

const OUT_DIR = '/home/llama-claw/.openclaw/agents/kira-forge/workspace/usoa-data/spins';
fs.mkdirSync(OUT_DIR, { recursive: true });

const TOTAL_TARGET = parseInt(process.argv[2] || '1990', 10);
const PARALLEL = parseInt(process.argv[3] || '5', 10);
const PER_BROWSER = Math.ceil(TOTAL_TARGET / PARALLEL);
const WAIT_MS = parseInt(process.argv[4] || '3000', 10);
const BET_AMOUNT = '200';

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

    for (let i = 0; i < numSpins; i++) {
      const promise = new Promise((resolve) => {
        pendingResolve = resolve;
        setTimeout(() => {
          if (pendingResolve === resolve) {
            pendingResolve = null;
            resolve({ statusCode: -1, events: [] });
          }
        }, WAIT_MS + 4000);
      });

      await page.keyboard.press('Space');
      const body = await promise;

      const roundEvents = (body && body.round && body.round.events) || [];
      let tw = 0n;
      for (const ev of roundEvents) {
        if (ev.wa) tw += BigInt(ev.wa);
      }
      const hasFs = roundEvents.some(
        (e) => e.etn === 'freespin' || e.freespins || JSON.stringify(e).toLowerCase().includes('scatter')
      );
      const fsAmt = roundEvents
        .filter((e) => e.etn === 'freespin' || e.freespins)
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
        roundId: body?.roundId || body?.round?.roundId,
        statusCode: body?.statusCode,
        totalWinAmount: String(tw),
        events: roundEvents.length,
        hasFs, fsAmt,
        balance: body?.accountBalance?.balance,
      };
      fs.appendFileSync(outFile, JSON.stringify(rec) + '\n');

      if (spins % 20 === 0) {
        log(`spin ${spins}/${numSpins}: wins=${wins} max=${maxWin}`);
      }

      if (body?.statusCode === 401 || body?.statusCode === 403) {
        log(`Session dying at ${i}: ${body.statusCode}`);
        break;
      }
    }

    const rtp = (Number(totalWin) / Number(BigInt(BET_AMOUNT))) / spins * 100;
    log(`Done: ${spins} spins, ${wins} wins, RTP ${rtp.toFixed(2)}%, max ${maxWin}`);

    await browser.close();
    return { sessionUuid, spins, wins, totalWin: Number(totalWin), rtp, maxWin: Number(maxWin), scatterHits, fsAwards };
  } catch (e) {
    log('ERR:', e.message);
    await browser.close();
    return null;
  }
}

(async () => {
  log(`=== Parallel USOA Spinner === ${PARALLEL} browsers, ${PER_BROWSER} spins each (${TOTAL_TARGET} total)`);

  // Launch all browsers in parallel
  const promises = [];
  for (let i = 0; i < PARALLEL; i++) {
    const outFile = `${OUT_DIR}/b${i}.jsonl`;
    promises.push(runOne(i, PER_BROWSER, outFile));
  }

  const results = await Promise.all(promises);

  log('=== ALL DONE ===');
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (!r) {
      log(`B${i}: FAILED`);
    } else {
      log(`B${i}: ${r.spins} spins, ${r.wins} wins, RTP ${r.rtp.toFixed(2)}%, max ${r.maxWin}`);
    }
  }

  // Aggregate
  const allSpins = results.filter(r => r).reduce((acc, r) => acc + r.spins, 0);
  const allWins = results.filter(r => r).reduce((acc, r) => acc + r.wins, 0);
  const allWin = results.filter(r => r).reduce((acc, r) => acc + BigInt(r.totalWin), 0n);
  const allMax = results.filter(r => r).reduce((acc, r) => Math.max(acc, r.maxWin), 0);
  const allFs = results.filter(r => r).reduce((acc, r) => acc + r.scatterHits, 0);
  const allFsAmt = results.filter(r => r).reduce((acc, r) => acc + r.fsAwards, 0);
  const aggRtp = (Number(allWin) / Number(BigInt(BET_AMOUNT))) / allSpins * 100;

  log(`AGGREGATE: ${allSpins} spins, ${allWins} wins, RTP ${aggRtp.toFixed(2)}%, max ${allMax}, FS events ${allFs} (${allFsAmt} fs)`);

  fs.writeFileSync(`${OUT_DIR}/parallel-summary.json`, JSON.stringify({
    parallel: PARALLEL,
    perBrowser: PER_BROWSER,
    target: TOTAL_TARGET,
    actual: allSpins,
    wins: allWins,
    rtp: aggRtp,
    maxWin: allMax,
    scatterHits: allFs,
    fsAwards: allFsAmt,
    perBrowser: results.map((r, i) => r || { browser: i, failed: true }),
  }, null, 2));

  log('Saved parallel-summary.json');
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
