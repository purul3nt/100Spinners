#!/usr/bin/env node
/**
 * kira-usoa-spinner5.cjs
 * Production: boot game to get session UUID, then fire 1990 direct
 * /play/bet requests via fetch() from iframe context. Log every spin,
 * write JSONL to disk every 10 spins as a recovery checkpoint.
 *
 * Payload (from casino bundle analysis):
 *   {
 *     seq: <int>,
 *     sessionUuid: "...",
 *     bets: [{ betAmount: "200", buyBonus: undefined, customData: undefined }],
 *     offerId: null,
 *     promotionId: null,
 *     autoplay: false
 *   }
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
  log(`=== USOA Spinner v5 (direct RGS POST) === target=${MAX_SPINS} bet=${BET_AMOUNT}`);
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

  // Capture RGS responses to find session UUID
  let sessionUuid = null;
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/play/authenticate') && resp.status() === 200) {
      try {
        const body = await resp.json();
        if (body.sessionUuid) sessionUuid = body.sessionUuid;
      } catch (e) {}
    }
  });

  log('Booting game to get session UUID...');
  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', {
    waitUntil: 'domcontentloaded', timeout: 60000,
  });
  await page.waitForTimeout(5000);
  await page.click('span.js-launch-game', { force: true });
  await page.waitForTimeout(35000);

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

  if (!sessionUuid) {
    log('FAIL: no session UUID captured');
    await browser.close();
    return;
  }
  log(`Session UUID: ${sessionUuid}`);

  // Get token + partner from URL (for header if needed)
  const gameUrl = gameFrame.url();
  log(`Game URL: ${gameUrl.slice(0, 100)}...`);

  // Wait for canvas + dismiss splash
  await gameFrame.waitForSelector('canvas', { timeout: 30000 });
  await gameFrame.waitForTimeout(15000);
  const cv = await gameFrame.evaluate(() => {
    const c = document.querySelector('canvas');
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  await page.mouse.click(cv.x + cv.w * 0.4, cv.y + cv.h * 0.81);
  await gameFrame.waitForTimeout(3000);

  log('Starting spin loop...');

  // === First: trigger ONE real canvas spin to get correct seq counter + confirm payload format ===
  log('Triggering one real canvas spin to capture working seq + payload');
  let workingSeq = null;
  let workingPayload = null;

  // Click SPIN button at known position (890, 905) per latest visual inspection
  const SPIN_X = cv.x + cv.w * 0.521;
  const SPIN_Y = cv.y + cv.h * 0.943;
  log(`SPIN button at canvas-relative (0.521, 0.943) -> page (${SPIN_X}, ${SPIN_Y})`);

  // Listen for the bet request
  const realBetReqs = [];
  page.on('request', (req) => {
    if (req.url().includes('/play/bet') && req.method() === 'POST') {
      realBetReqs.push({ url: req.url(), headers: req.headers(), body: req.postData() });
    }
  });
  const realBetResps = [];
  page.on('response', async (resp) => {
    if (resp.url().includes('/play/bet')) {
      try {
        const body = await resp.json();
        realBetResps.push({ status: resp.status(), body });
      } catch (e) {}
    }
  });

  await page.mouse.click(SPIN_X, SPIN_Y);
  await gameFrame.waitForTimeout(10000);

  if (realBetReqs.length > 0) {
    log(`Real bet request captured: body=${realBetReqs[0].body}`);
    workingPayload = JSON.parse(realBetReqs[0].body);
    workingSeq = workingPayload.seq;
    log(`  -> seq=${workingSeq}, sessionUuid=${workingPayload.sessionUuid}`);
  } else {
    log('No real bet captured from canvas click. Falling back to direct fetch starting at seq=10');
    workingSeq = 10;
  }
  if (realBetResps.length > 0) {
    const respBody = realBetResps[0].body;
    log(`Real bet response: statusCode=${respBody.statusCode} roundId=${respBody.roundId} totalWin=${respBody.totalWinAmount} events=${respBody.round?.events?.length || 0}`);
    log(`  FULL ROUND: ${JSON.stringify(respBody.round).slice(0, 1500)}`);
  }

  // Spin loop — fire /play/bet directly via fetch
  let spins = 0,
    wins = 0,
    totalWin = 0n,
    maxWin = 0n,
    scatterHits = 0,
    fsAwards = 0;
  let nextSeq = workingSeq ? workingSeq + 1 : 10;

  const BATCH_SIZE = 50;
  const PARALLEL = 1;

  for (let batch = 0; batch < Math.ceil(MAX_SPINS / BATCH_SIZE); batch++) {
    const batchStart = batch * BATCH_SIZE;
    const batchEnd = Math.min(MAX_SPINS, batchStart + BATCH_SIZE);

    log(`Batch ${batch + 1}: spins ${batchStart}-${batchEnd - 1}`);

    for (let i = batchStart; i < batchEnd; i++) {
      const seq = nextSeq++;
      const result = await gameFrame.evaluate(
        async ({ seq, sessionUuid, betAmount }) => {
          const payload = {
            seq,
            sessionUuid,
            bets: [{ betAmount }],
            offerId: null,
            promotionId: null,
            autoplay: false,
          };
          try {
            const r = await fetch('https://rgs-demo.hacksawgaming.com/api/play/bet', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const body = await r.json();
            return { ok: true, status: r.status, body };
          } catch (e) {
            return { ok: false, error: String(e) };
          }
        },
        { seq, sessionUuid, betAmount: BET_AMOUNT }
      );

      if (!result.ok) {
        log(`Spin ${i}: FETCH ERROR ${result.error}`);
        break;
      }

      const body = result.body || {};
      const tw = BigInt(body.totalWinAmount || '0');
      const events = (body.round && body.round.events) || [];
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
        seq,
        roundId: body.roundId,
        statusCode: body.statusCode,
        statusMessage: body.statusMessage,
        totalWinAmount: String(tw),
        balance: body.accountBalance?.balance ? String(body.accountBalance.balance) : null,
        events: events.length,
        hasFs,
        fsAmt,
        freeRoundOffer: body.freeRoundOffer ? 'yes' : null,
      };
      fs.appendFileSync(SESSION_FILE, JSON.stringify(rec) + '\n');

      // Log every 10
      if ((spins) % 10 === 0 || spins === MAX_SPINS) {
        const betAmtBig = BigInt(BET_AMOUNT);
        const rtp = (Number(totalWin) / Number(betAmtBig)) / spins * 100;
        log(
          `  ${spins}/${MAX_SPINS}: wins=${wins} rtp=${rtp.toFixed(2)}% max=${maxWin} fs=${scatterHits}(${fsAwards}) last.balance=${rec.balance || '?'}`
        );
        // Checkpoint summary
        fs.writeFileSync(`${OUT_DIR}/checkpoint.json`, JSON.stringify({
          spins, wins, rtp, maxWin: String(maxWin), scatterHits, fsAwards,
        }, null, 2));
      }

      // Session death detection
      if (body.statusCode && body.statusCode !== 0) {
        log(`  Spin ${i}: statusCode=${body.statusCode} msg=${body.statusMessage}`);
        if (body.statusCode === 401 || body.statusCode === 403) {
          log('  SESSION DEAD — stopping');
          break;
        }
      }
    }
  }

  const rtp = (Number(totalWin) / Number(BigInt(BET_AMOUNT))) / spins * 100;
  log('=== FINAL ===');
  log(`Spins: ${spins} Wins: ${wins} RTP: ${rtp.toFixed(2)}% Max: ${maxWin} (${(Number(maxWin) / Number(BET_AMOUNT)).toFixed(1)}x bet)`);
  log(`Scatter/FS events: ${scatterHits} (${fsAwards} free spins awarded)`);
  log(`Log: ${SESSION_FILE}`);

  fs.writeFileSync(`${OUT_DIR}/summary.json`, JSON.stringify({
    target: MAX_SPINS,
    actual: spins,
    wins, winRate: wins / spins, rtp,
    maxWin: String(maxWin),
    maxWinX: Number(maxWin) / Number(BET_AMOUNT),
    scatterHits, fsAwards,
    betAmount: BET_AMOUNT,
    sessionUuid,
  }, null, 2));

  await browser.close();
  log('Done.');
})().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
