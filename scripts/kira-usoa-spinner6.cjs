#!/usr/bin/env node
/**
 * kira-usoa-spinner6.cjs
 * Strategy:
 *   1. Boot game normally (cookie gate + click TRY IT)
 *   2. Dismiss splash
 *   3. Trigger ONE real Space-key spin to sync the server's seq counter
 *   4. Continue with direct XHR /play/bet at seq+1, seq+2, ... (same as bundle's Te class)
 *   5. Log every spin, checkpoint JSONL every 10 spins
 */

const { chromium } = require('playwright');
const fs = require('fs');

const OUT_DIR = '/home/llama-claw/.openclaw/agents/kira-forge/workspace/usoa-data/spins';
fs.mkdirSync(OUT_DIR, { recursive: true });

const MAX_SPINS = parseInt(process.argv[2] || '1990', 10);
const SESSION_FILE = process.argv[3] || `${OUT_DIR}/session.jsonl`;
const BET_AMOUNT = process.argv[4] || '200';

function log(...args) { console.log(`[${new Date().toISOString()}]`, ...args); }

(async () => {
  log(`=== USOA Spinner v6 (XHR direct) === target=${MAX_SPINS} bet=${BET_AMOUNT}`);
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

  // === Step 1: ONE Space-key bet to sync seq ===
  log('Triggering Space-key bet to sync seq counter');
  let workingSeq = 1;
  let realBetReq = null;
  const realReqCapture = (req) => {
    if (req.url().includes('/play/bet') && req.method() === 'POST' && !realBetReq) {
      try {
        realBetReq = { body: JSON.parse(req.postData()) };
      } catch (e) {}
    }
  };
  page.on('request', realReqCapture);
  await gameFrame.focus('canvas');
  await page.keyboard.press('Space');
  await gameFrame.waitForTimeout(8000);
  page.off('request', realReqCapture);

  if (realBetReq) {
    workingSeq = realBetReq.body.seq + 1;
    log(`Real bet seq was ${realBetReq.body.seq}, continuing at seq=${workingSeq}`);
  } else {
    log('No real bet captured from Space — trying lower seq values');
    workingSeq = 10;
  }

  // === Step 2: Direct XHR spins ===
  let spins = 0, wins = 0, totalWin = 0n, maxWin = 0n, scatterHits = 0, fsAwards = 0;
  let nextSeq = workingSeq;

  for (let i = 0; i < MAX_SPINS; i++) {
    const seq = nextSeq++;
    const result = await gameFrame.evaluate(
      async ({ seq, sessionUuid, betAmount }) => {
        const payload = {
          seq, sessionUuid,
          bets: [{ betAmount }],
          offerId: null, promotionId: null, autoplay: false,
        };
        // Use XHR (matches bundle's Te class behavior)
        return new Promise((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', 'https://rgs-demo.hacksawgaming.com/api/play/bet', true);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
              try {
                const body = JSON.parse(xhr.responseText);
                resolve({ ok: true, status: xhr.status, body });
              } catch (e) {
                resolve({ ok: false, error: 'parse: ' + e.message, raw: xhr.responseText.slice(0, 200) });
              }
            }
          };
          xhr.onerror = function() { resolve({ ok: false, error: 'XHR error' }); };
          xhr.send(JSON.stringify(payload));
        });
      },
      { seq, sessionUuid, betAmount: BET_AMOUNT }
    );

    if (!result.ok) {
      log(`Spin ${i}: XHR ERROR ${result.error}`);
      break;
    }

    const body = result.body || {};
    const roundEvents = (body.round && body.round.events) || [];
    // win amount is sum of win events (et=2 reveal events with wa>0)
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
      seq,
      roundId: body.roundId || body.round?.roundId,
      statusCode: body.statusCode,
      totalWinAmount: String(tw),
      events: roundEvents.length,
      hasFs,
      fsAmt,
      balance: body.accountBalance?.balance,
    };
    fs.appendFileSync(SESSION_FILE, JSON.stringify(rec) + '\n');

    if ((spins) % 10 === 0 || spins === MAX_SPINS) {
      const rtp = (Number(totalWin) / Number(BigInt(BET_AMOUNT))) / spins * 100;
      log(`${spins}/${MAX_SPINS}: wins=${wins} rtp=${rtp.toFixed(2)}% max=${maxWin} fs=${scatterHits}(${fsAwards}) bal=${rec.balance || '?'}`);
      fs.writeFileSync(`${OUT_DIR}/checkpoint.json`, JSON.stringify({
        spins, wins, rtp, maxWin: String(maxWin), scatterHits, fsAwards,
      }, null, 2));
    }

    if (body.statusCode && body.statusCode !== 0) {
      log(`Spin ${i}: statusCode=${body.statusCode} msg=${body.statusMessage}`);
      if (body.statusCode === 401 || body.statusCode === 403) break;
      if (body.statusCode === 14) {
        // Invalid seq - maybe session was reset
        log('  Seq invalid, aborting');
        break;
      }
    }
  }

  const rtp = (Number(totalWin) / Number(BigInt(BET_AMOUNT))) / spins * 100;
  log('=== FINAL ===');
  log(`Spins: ${spins} Wins: ${wins} RTP: ${rtp.toFixed(2)}% Max: ${maxWin} (${(Number(maxWin) / Number(BET_AMOUNT)).toFixed(1)}x)`);
  log(`FS events: ${scatterHits} (${fsAwards} fs awarded)`);

  fs.writeFileSync(`${OUT_DIR}/summary.json`, JSON.stringify({
    target: MAX_SPINS, actual: spins,
    wins, winRate: wins / spins, rtp,
    maxWin: String(maxWin), maxWinX: Number(maxWin) / Number(BET_AMOUNT),
    scatterHits, fsAwards,
    betAmount: BET_AMOUNT, sessionUuid,
  }, null, 2));

  await browser.close();
  log('Done.');
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
