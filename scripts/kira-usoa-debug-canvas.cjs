const { chromium } = require('playwright');
(async () => {
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
  
  console.log('Navigating...');
  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  const launcher = await page.$('span.js-launch-game');
  if (!launcher) { console.log('No launcher'); process.exit(1); }
  await launcher.click();
  console.log('Clicked, waiting 40s...');
  await page.waitForTimeout(40000);
  
  // Check what's there
  const debug = await page.evaluate(() => {
    const iframes = document.querySelectorAll('iframe');
    return {
      iframeCount: iframes.length,
      iframeSrcs: Array.from(iframes).map(f => f.src),
      bodyKids: document.body.children.length,
      bodyFirstKid: document.body.firstElementChild?.tagName + ' ' + document.body.firstElementChild?.className?.slice(0, 50),
      title: document.title,
    };
  });
  console.log('Page state:', JSON.stringify(debug, null, 2));
  
  // Check inside the game iframe
  const frames = page.frames();
  console.log(`Frames: ${frames.length}`);
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    console.log(`Frame ${i}: ${f.url().slice(0, 100)}`);
    try {
      const info = await f.evaluate(() => ({
        canvases: document.querySelectorAll('canvas').length,
        title: document.title,
        bodyKids: document.body.children.length,
      }));
      console.log(`  ${JSON.stringify(info)}`);
    } catch (e) {
      console.log(`  (can't evaluate: ${e.message.slice(0, 50)})`);
    }
  }
  
  await browser.close();
})();
