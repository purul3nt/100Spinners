const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1200 } });
  const page = await ctx.newPage();
  await page.goto('https://www.hacksawgaming.com/games/ultimate-slot-of-america', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  // Scroll down through the page to see if TRY IT is below fold.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  // Find everything containing "TRY IT" or "launcher" or "play" or "demo".
  const items = await page.evaluate(() => {
    function walk(root, depth=0) {
      const out = [];
      for (const el of root.querySelectorAll('*')) {
        const text = (el.textContent || '').trim().slice(0, 30);
        const cls = el.className?.toString() || '';
        if (/try.it|launch|demo|play/i.test(cls) || text === 'TRY IT' || text === 'DEMO' || text === 'PLAY') {
          out.push({ tag: el.tagName.toLowerCase(), id: el.id || '', cls: cls.slice(0, 100), text, href: el.href || '' });
        }
      }
      return out;
    }
    return walk(document);
  });
  console.log(JSON.stringify(items, null, 2));

  // Also enumerate iframe-like elements that the launcher might inject.
  const launcherEls = await page.evaluate(() => {
    const sels = ['.hacksaw-launcher', '[class*="launcher"]', '[id*="launcher"]', '[class*="game-iframe"]', 'iframe[src*="static-live"]', 'iframe[src*="casino"]', 'iframe[src*="hacksaw"]', 'iframe'];
    const out = {};
    for (const s of sels) {
      out[s] = document.querySelectorAll(s).length;
    }
    return out;
  });
  console.log('launcher selectors:', JSON.stringify(launcherEls, null, 2));

  // Check window globals for launcher init.
  const globals = await page.evaluate(() => {
    const keys = Object.keys(window).filter(k => /hacksaw|launcher|game|play/i.test(k));
    return keys;
  });
  console.log('window globals:', globals);

  await browser.close();
})();
