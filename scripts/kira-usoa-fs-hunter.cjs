const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Output paths - use timestamp to NEVER overwrite
const STAMP = Date.now();
const OUT_DIR = '/home/llama-claw/.openclaw/agents/kira-forge/workspace/usoa-data/spins';
const FS_LOG = path.join(OUT_DIR, `fs-triggers-${STAMP}.jsonl`);
const SPIN_LOG = path.join(OUT_DIR, `fs-hunter-${STAMP}.jsonl`);
const SUMMARY = path.join(OUT_DIR, `fs-hunter-summary-${STAMP}.json`);

const MAX_SPINS = parseInt(process.env.MAX_SPINS || '800');
const SPIN_WAIT_MS = parseInt(process.env.SPIN_WAIT_MS || '7000');
const BET_AMOUNT = 200;

async function run(browserIdx) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1707, height: 960 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  await context.addCookies([
    { name: 'CookiesConsent', value: 'granted', domain: '.hacksawgaming.com', path: '/' },
    { name: 'age_verified', value: 'true', domain: '.hacksawgaming.com', path: '/' },
  ]);
  const page = await context.newPage();
  
  let spinIdx = 0;
  let fsCount = 0;
  let totalWin = 0;
  let totalBet = 0;
  let highestWin = 0;
  let consecutiveFails = 0;
  let lastBalance = null;
  const spinHistory = [];
  const fsHistory = [];
  const seqCounter = { v: 0 };
  
  function nextSeq() { return ++seqCounter.v; }
  
  page.on('response', async (resp) => {
    const url = resp.url();
    if (!url.includes('/api/play/bet')) return;
    try {
      const body = await resp.text();
      const j = JSON.parse(body);
      
      // Filter out confirmRound acks
      if (!j.round || (j.round.events && j.round.events.length === 0)) return;
      
      const round = j.round;
      const events = round.events || [];
      const totalWinAmount = Math.max(...events.map(e => parseFloat(e.awa || 0))) * 100 || 0;  // awa is in bet units
      const hasFs = events.some(e => e.type === 'fs_reveal' || e.type === 'feature_enter' || e.type === 'feature_exit');
      const scatterCount = (round.grid || '').split('').filter(c => c.charCodeAt(0) - 40 === 12).length;
      const eventTypes = [...new Set(events.map(e => e.type))];
      
      lastBalance = j.accountBalance?.balance;
      
      const record = {
        browser: browserIdx,
        spin: spinIdx,
        roundId: round.roundId,
        statusCode: j.statusCode,
        events: events.length,
        eventTypes,
        totalWinAmount,
        hasFs,
        scatterCount,
        grid: round.grid,
        balance: lastBalance,
        time: Date.now(),
      };
      
      // Log every spin
      spinHistory.push(record);
      totalWin += totalWinAmount;
      totalBet += BET_AMOUNT;
      if (totalWinAmount > highestWin) highestWin = totalWinAmount;
      
      if (hasFs) {
        fsCount++;
        fsHistory.push(record);
        console.log(`[B${browserIdx}] 🎰 FS TRIGGER spin ${spinIdx}: scatterCount=${scatterCount}, win=${totalWinAmount}, events=${events.length} (${eventTypes.join(',')})`);
        fs.writeFileSync(FS_LOG, JSON.stringify(record) + '\n', { flag: 'a' });
      } else if (totalWinAmount > 1000) {
        console.log(`[B${browserIdx}]   Big win spin ${spinIdx}: win=${totalWinAmount}, scatterCount=${scatterCount}`);
      }
      
      consecutiveFails = j.statusCode !== 0 ? consecutiveFails + 1 : 0;
    } catch (e) {}
  });
  
  console.log(`[B${browserIdx}] Booting...`);
  try {
    await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    const launcher = await page.$('span.js-launch-game');
    if (!launcher) {
      console.log(`[B${browserIdx}] No launcher`);
      await browser.close();
      return null;
    }
    await launcher.click();
    console.log(`[B${browserIdx}] Launcher clicked, waiting 35s for RGS handshake...`);
    await page.waitForTimeout(35000);
    
    // Check canvas exists
    const hasCanvas = await page.evaluate(() => { const frames = document.querySelectorAll("iframe"); for (const f of frames) { try { if (f.contentDocument && f.contentDocument.querySelectorAll("canvas").length > 0) return true; } catch(e){} } return false; });
    if (!hasCanvas) {
      console.log(`[B${browserIdx}] No canvas after 35s, aborting`);
      await browser.close();
      return null;
    }
    
    console.log(`[B${browserIdx}] Ready. Starting ${MAX_SPINS} spins with ${SPIN_WAIT_MS}ms wait...`);
    
    for (let i = 0; i < MAX_SPINS; i++) {
      spinIdx = i;
      if (consecutiveFails > 5) {
        console.log(`[B${browserIdx}] Too many consecutive fails (${consecutiveFails}), bailing`);
        break;
      }
      try {
        await page.keyboard.press('Space');
        await page.waitForTimeout(SPIN_WAIT_MS);
      } catch (e) {
        console.log(`[B${browserIdx}] Spin ${i} error: ${e.message}`);
        break;
      }
      if (i % 50 === 0 && i > 0) {
        console.log(`[B${browserIdx}] Progress: ${i}/${MAX_SPINS}, FS=${fsCount}, lastWin=${spinHistory[spinHistory.length-1]?.totalWinAmount || 0}`);
      }
    }
  } catch (e) {
    console.log(`[B${browserIdx}] Fatal: ${e.message}`);
  }
  
  await browser.close();
  
  // Write spin log
  fs.writeFileSync(SPIN_LOG, spinHistory.map(s => JSON.stringify(s)).join('\n') + '\n');
  
  return {
    browser: browserIdx,
    spins: spinHistory.length,
    fsCount,
    totalWin,
    totalBet,
    highestWin,
    rtp: totalWin / totalBet * 100,
    finalBalance: lastBalance,
  };
}

(async () => {
  const numBrowsers = parseInt(process.env.BROWSERS || '5');
  console.log(`Starting ${numBrowsers} browsers × ${MAX_SPINS} spins each`);
  console.log(`Output: ${SPIN_LOG}`);
  console.log(`FS log: ${FS_LOG}`);
  
  const results = await Promise.all(
    Array.from({ length: numBrowsers }, (_, i) => run(i))
  );
  
  const summary = {
    timestamp: STAMP,
    maxSpins: MAX_SPINS,
    spinWaitMs: SPIN_WAIT_MS,
    browsers: numBrowsers,
    results: results.filter(r => r !== null),
  };
  
  const totalSpins = summary.results.reduce((s, r) => s + r.spins, 0);
  const totalFs = summary.results.reduce((s, r) => s + r.fsCount, 0);
  const totalWin = summary.results.reduce((s, r) => s + r.totalWin, 0);
  const totalBet = summary.results.reduce((s, r) => s + r.totalBet, 0);
  const maxWin = Math.max(...summary.results.map(r => r.highestWin));
  
  console.log('\n=== SUMMARY ===');
  console.log(`Total spins: ${totalSpins}`);
  console.log(`Total FS triggers: ${totalFs}`);
  console.log(`Total win: ${totalWin} cents`);
  console.log(`Total bet: ${totalBet} cents`);
  console.log(`RTP: ${(totalWin/totalBet*100).toFixed(2)}%`);
  console.log(`Max win: ${maxWin} cents (${(maxWin/200).toFixed(2)}x)`);
  
  summary.totals = { spins: totalSpins, fs: totalFs, win: totalWin, bet: totalBet, rtp: totalWin/totalBet*100, maxWin };
  fs.writeFileSync(SUMMARY, JSON.stringify(summary, null, 2));
  console.log(`\nSummary saved: ${SUMMARY}`);
})();
