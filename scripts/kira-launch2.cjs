const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/tmp/kira-usoa';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Try clicking and waiting longer
  console.log('=== before click ===');
  let frameUrls = page.frames().map(f => f.url());
  console.log('frames:', frameUrls);

  console.log('=== click Try it ===');
  // Dismiss any open modal first
  const playBtn = await page.$('span.js-launch-game');
  if (!playBtn) { console.log('button not found'); process.exit(1); }
  await playBtn.click();

  // Watch for new frames / popups
  page.on('popup', async popup => {
    console.log('=== POPUP detected:', popup.url());
  });

  // Wait longer and watch
  for (let i = 1; i <= 10; i++) {
    await page.waitForTimeout(1500);
    const frames = page.frames();
    const hasGame = frames.some(f => /static-live|casino|hacksaw.*game/i.test(f.url()));
    const childCount = await page.evaluate(() => document.querySelectorAll('iframe').length);
    console.log(`t=${i*1.5}s: ${frames.length} frames, ${childCount} iframes, hasGameFrame=${hasGame}`);
    if (hasGame) {
      console.log('GAME FRAME FOUND');
      break;
    }
  }

  // Final frame inventory
  const frames = page.frames();
  console.log('\n=== final frames ===');
  for (const f of frames) console.log(`  ${f.url()}`);

  // Inspect the GamePlayer div for any inner iframe / template
  const gamePlayer = await page.evaluate(() => {
    const gp = document.querySelector('.GamePlayer, [class*="GamePlayer"]');
    if (!gp) return null;
    return {
      outerHtml: gp.outerHTML.slice(0, 2000),
      iframeCount: gp.querySelectorAll('iframe').length,
    };
  });
  console.log('\n=== GamePlayer div ===');
  console.log(JSON.stringify(gamePlayer, null, 2));

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
