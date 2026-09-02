const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
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

  const betResps = [];
  page.on('response', async (resp) => {
    if (resp.url().includes('/play/bet') && resp.status() === 200) {
      try {
        const body = await resp.json();
        betResps.push(body);
      } catch (e) {}
    }
  });

  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  await page.click('span.js-launch-game', { force: true });
  await page.waitForTimeout(35000);

  let gameFrame = null;
  for (const f of page.frames()) {
    if (f.url().includes('static-live.hacksawgaming.com') && f.url().includes('gameid=1760')) gameFrame = f;
  }
  if (!gameFrame) { console.log('no frame'); await browser.close(); return; }

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

  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Space');
    await page.waitForTimeout(3500);
  }

  // Analyze
  console.log(`Captured ${betResps.length} responses\n`);
  let totalWin = 0n;
  let winSpins = 0;
  for (let i = 0; i < betResps.length; i++) {
    const r = betResps[i];
    const events = r.round?.events || [];
    let spinWin = 0n;
    let totalWa = 0n;
    let maxAwa = 0n;
    for (const ev of events) {
      if (ev.wa) totalWa += BigInt(ev.wa);
      if (ev.awa && BigInt(ev.awa) > maxAwa) maxAwa = BigInt(ev.awa);
    }
    spinWin = maxAwa; // use accumulated max
    totalWin += spinWin;
    if (spinWin > 0n) winSpins++;
    console.log(`Spin ${i}: statusCode=${r.statusCode} round.status=${r.round?.status} events=${events.length} sumWa=${totalWa} maxAwa=${maxAwa} bal=${r.accountBalance?.balance}`);
  }

  const betAmt = 200n;
  const rtp = (Number(totalWin) / Number(betAmt)) / betResps.length * 100;
  console.log(`\nTotal spins: ${betResps.length}, Wins: ${winSpins}`);
  console.log(`Total win: ${totalWin}, Expected at 96% RTP: ${betResps.length * 200 * 0.96}`);
  console.log(`RTP: ${rtp.toFixed(2)}%`);

  // Save one full response for inspection
  if (betResps.length > 0) {
    fs.writeFileSync('/tmp/sample-bet-response.json', JSON.stringify(betResps[0], null, 2));
    console.log('Saved sample-bet-response.json');
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
