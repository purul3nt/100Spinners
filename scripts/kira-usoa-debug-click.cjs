const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1707, height: 960 } });
  await context.addCookies([
    { name: 'CookiesConsent', value: 'granted', domain: '.hacksawgaming.com', path: '/' },
    { name: 'age_verified', value: 'true', domain: '.hacksawgaming.com', path: '/' },
  ]);
  const page = await context.newPage();
  
  let betCount = 0;
  let lastBet = null;
  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('/api/play/bet')) {
      betCount++;
      try {
        const body = await resp.text();
        const j = JSON.parse(body);
        lastBet = j;
        if (j.round) {
          console.log(`  BET #${betCount}: statusCode=${j.statusCode}, events=${j.round.events?.length || 0}, totalAwa=${j.round.events?.map(e=>e.awa||0).reduce((a,b)=>Math.max(a,b),0) || 0}`);
        }
      } catch(e) {}
    }
  });
  
  console.log('Navigating...');
  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  await (await page.$('span.js-launch-game')).click();
  console.log('Clicked launcher, waiting 45s for game load...');
  await page.waitForTimeout(45000);
  
  // Take screenshot of full page
  await page.screenshot({ path: '/tmp/usoa-state1.png' });
  console.log('Saved state1.png');
  
  // Get iframe position
  const iframeHandle = await page.$('iframe[src*="static-live.hacksawgaming"]');
  if (!iframeHandle) { console.log('No game iframe!'); process.exit(1); }
  const iframeBox = await iframeHandle.boundingBox();
  console.log(`Iframe box: ${JSON.stringify(iframeBox)}`);
  
  // Click center of iframe (to focus + dismiss splash)
  const centerX = iframeBox.x + iframeBox.width/2;
  const centerY = iframeBox.y + iframeBox.height/2;
  console.log(`Clicking iframe center: ${centerX},${centerY}`);
  await page.mouse.click(centerX, centerY);
  await page.waitForTimeout(3000);
  
  // Now try Space
  console.log('Pressing Space...');
  await page.keyboard.press('Space');
  await page.waitForTimeout(5000);
  console.log(`Bets: ${betCount}`);
  
  // Try clicking the spin button (usually bottom right)
  // Game is in iframe but mouse coordinates from page
  const spinPositions = [
    [iframeBox.x + iframeBox.width * 0.85, iframeBox.y + iframeBox.height * 0.85],
    [iframeBox.x + iframeBox.width * 0.5, iframeBox.y + iframeBox.height * 0.85],
    [iframeBox.x + iframeBox.width * 0.92, iframeBox.y + iframeBox.height * 0.92],
    [iframeBox.x + iframeBox.width * 0.88, iframeBox.y + iframeBox.height * 0.78],
  ];
  for (const [x, y] of spinPositions) {
    console.log(`Clicking ${x.toFixed(0)},${y.toFixed(0)}...`);
    await page.mouse.click(x, y);
    await page.waitForTimeout(5000);
    console.log(`  Bets: ${betCount}`);
  }
  
  if (lastBet) {
    console.log(`Last bet: statusCode=${lastBet.statusCode}, hasRound=${!!lastBet.round}`);
    if (lastBet.round) {
      console.log(`  events: ${lastBet.round.events?.length}`);
      console.log(`  eventTypes: ${lastBet.round.events?.map(e=>e.type).join(',')}`);
    }
  }
  
  await page.screenshot({ path: '/tmp/usoa-state2.png' });
  
  await browser.close();
})();
