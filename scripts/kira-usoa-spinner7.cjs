#!/usr/bin/env node
/**
 * kira-usoa-spinner7.cjs
 * Reliable: Space-key spin in a tight loop.
 * Wait for animation to complete before next Space.
 * Capture every bet response. Log every spin, checkpoint every 10.
 */

const { chromium } = require('playwright');
const fs = require('fs');

const OUT_DIR = '/home/llama-claw/.openclaw/agents/kira-forge/workspace/usoa-data/spins';
fs.mkdirSync(OUT_DIR, { recursive: true });

const MAX_SPINS = parseInt(process.argv[2] || '1990', 10);
const SESSION_FILE = process.argv[3] || `${OUT_DIR}/session.jsonl`;
const BET_AMOUNT = process.argv[4] || '200';
const WAIT_MS = parseInt(process.argv[5] || '2500', 10);

function log(...args) { console.log(`[${new Date().toISOString()}]`, ...args); }

(async () => {
  log(`=== USOA Spinner v7 (Space key) === target=${MAX_SPINS} wait=${WAIT_MS}ms`);
  fs.writeFileSync(SESSION_FILE, '');

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

  // Per-spin state: pending response promise
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

  log('Booting game...');
  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  await page.click('span.js-launch-game', { force: true });
  await page.waitForTimeout(35000);

  let gameFrame = null;
  for (const f of page.frames()) {
    if (f.url().includes('static-live.hacksawgaming.com') && f.url().includes('gameid=1760')) gameFrame = f;
  }
  if (!gameFrame || !sessionUuid) { log('FAIL boot'); await browser.close(); return; }
  log(`Session: ${sessionUuid}`);

  await gameFrame.waitForSelector('canvas', { timeout: 30000 });
  await gameFrame.waitForTimeout(15000);
  const cv = await gameFrame.evaluate(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });

  // Dismiss splash
  await page.mouse.click(cv.x + cv.w * 0.4, cv.y + cv.h * 0.81);
  await gameFrame.waitForTimeout(3000);

  // Focus canvas for Space
  await gameFrame.focus('canvas');
  await page.waitForTimeout(1000);

  // === Main spin loop ===
  let spins = 0, wins = 0, totalWin = 0n, maxWin = 0n, scatterHits = 0, fsAwards = 0;
  const startTime = Date.now();

  for (let i = 0; i < MAX_SPINS; i++) {
    const promise = new Promise((resolve) => {
      pendingResolve = resolve;
      // Safety timeout in case response doesn't come
      setTimeout(() => {
        if (pendingResolve === resolve) {
          pendingResolve = null;
          resolve({ statusCode: -1, statusMessage: 'timeout', events: [] });
        }
      }, WAIT_MS + 3000);
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
      hasFs,
      fsAmt,
      balance: body?.accountBalance?.balance,
    };
    fs.appendFileSync(SESSION_FILE, JSON.stringify(rec) + '\n');

    if ((spins) % 10 === 0 || spins === MAX_SPINS) {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const spinsPerSec = spins / elapsedSec;
      const etaMin = (MAX_SPINS - spins) / spinsPerSec / 60;
      const rtp = (Number(totalWin) / Number(BigInt(BET_AMOUNT))) / spins * 100;
      log(`${spins}/${MAX_SPINS} (${spinsPerSec.toFixed(2)}/s, eta ${etaMin.toFixed(0)}min): wins=${wins} rtp=${rtp.toFixed(2)}% max=${maxWin} fs=${scatterHits}`);
      fs.writeFileSync(`${OUT_DIR}/checkpoint.json`, JSON.stringify({
        spins, wins, rtp, maxWin: String(maxWin), scatterHits, fsAwards,
        spinsPerSec, elapsedSec,
      }, null, 2));
    }

    // Check for session death
    if (body?.statusCode === 401 || body?.statusCode === 403 || body?.statusCode === -1) {
      log(`Spin ${i}: session dying (statusCode=${body.statusCode})`);
      break;
    }
  }

  const rtp = (Number(totalWin) / Number(BigInt(BET_AMOUNT))) / spins * 100;
  const elapsedSec = (Date.now() - startTime) / 1000;
  log('=== FINAL ===');
  log(`Spins: ${spins} in ${elapsedSec.toFixed(0)}s (${(spins / elapsedSec).toFixed(2)} spins/s)`);
  log(`Wins: ${wins} RTP: ${rtp.toFixed(2)}% Max: ${maxWin} (${(Number(maxWin) / Number(BET_AMOUNT)).toFixed(1)}x)`);
  log(`FS events: ${scatterHits} (${fsAwards} fs awarded)`);

  fs.writeFileSync(`${OUT_DIR}/summary.json`, JSON.stringify({
    target: MAX_SPINS, actual: spins,
    wins, winRate: wins / spins, rtp,
    maxWin: String(maxWin), maxWinX: Number(maxWin) / Number(BET_AMOUNT),
    scatterHits, fsAwards,
    betAmount: BET_AMOUNT, sessionUuid,
    elapsedSec, spinsPerSec: spins / elapsedSec,
  }, null, 2));

  await browser.close();
  log('Done.');
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
