const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.addInitScript(() => {
    window.hacksawCasino = {
      PubSub: { getChannel: () => ({ subscribe: () => {}, trigger: () => {}, publish: () => {} }) },
      MoneyHelper: { toCurrency: (v) => String(v) },
      Translation: { ui: (k) => k, get: (k) => k },
      onLoad: () => true,
      getCasinoSkin: () => ({}),
      getBrand: () => 'hacksaw', getLanguage: () => 'en', getCurrency: () => 'USD',
      getEnvironment: () => 'demo', getMode: () => 2, getOperator: () => 'hacksaw',
      getJurisdiction: () => null, getPlayerLimitsUrl: () => '', getSelfExclusionUrl: () => '',
      getSessionElapsed: () => 0, getSessionNet: () => 0, getBalance: () => 10000,
      getBetLimits: () => ({ min: 0.1, max: 100, defCoin: 1, defRate: 1 }),
      getBetLevel: () => 1, getBetLevels: () => [1],
      getBetCoin: () => 1, getBetCoins: () => [1],
      getBetRate: () => 1, getBetRates: () => [1],
      getBetCost: () => 1, getChannel: () => 'desktop', getQuickSpin: () => false,
      isResponsibleGamingEnabled: () => false, isAutoPlayAvailable: () => true,
      isFastPlayAvailable: () => true, isSlamStopAvailable: () => true, isTurboAvailable: () => true,
      isFeatureBuyAvailable: () => true, isGambleAvailable: () => false,
      isHistoryAvailable: () => true, isFullscreenAvailable: () => true,
      placeBet: (cfg, cb) => setTimeout(() => cb({ status: 0, balance: 10000 }), 100),
      endRound: (cfg, cb) => setTimeout(() => cb({ status: 0 }), 50),
      buyFeature: (cfg, cb) => setTimeout(() => cb({ status: 0 }), 100),
      gamble: (cfg, cb) => setTimeout(() => cb({ status: 0 }), 50),
      validateSession: (cb) => setTimeout(() => cb(true), 50),
      onEvent: () => true,
    };
  });

  page.on('pageerror', err => console.log('[ERR]', err.message));
  page.on('console', msg => { if (msg.type() === 'error') console.log('[CON]', msg.text().slice(0, 200)); });

  await page.goto('https://static-live.hacksawgaming.com/1760/1.15.1/index.html?gameid=1760&token=demo&mode=2&language=en&partner=hacksaw&channel=desktop', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(15000);
  console.log('=== after 15s ===');
  console.log('PIXI:', await page.evaluate(() => typeof window.PIXI));
  console.log('canvas size:', await page.evaluate(() => { const c = document.querySelector('canvas'); return c ? [c.width, c.height] : null; }));
  await page.screenshot({ path: '/tmp/kira-usoa/09-stub3.png' });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
