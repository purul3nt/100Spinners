const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/tmp/kira-usoa';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Inject a hacksawCasino stub BEFORE the page loads its scripts
  await page.addInitScript(() => {
    // The integration.js loads before main.js and exposes window.hacksawCasino
    // Provide a minimal stub that the game can call
    window.hacksawCasino = {
      onLoad: () => true,
      getCasinoSkin: () => ({}),
      getRealUrl: () => 'demo',
      getBrand: () => 'hacksaw',
      getLanguage: () => 'en',
      getCurrency: () => 'USD',
      getEnvironment: () => 'demo',
      getMode: () => 2,
      getOperator: () => 'hacksaw',
      getJurisdiction: () => null,
      getPlayerLimitsUrl: () => '',
      getSelfExclusionUrl: () => '',
      getSessionElapsed: () => 0,
      getSessionNet: () => 0,
      getBalance: () => 10000,
      getBetLimits: () => ({ min: 0.1, max: 100, step: 0.1, defCoin: 1, defRate: 1 }),
      getBetLevel: () => 1,
      getBetLevels: () => [0.1, 0.5, 1, 2, 5, 10],
      getBetCoin: () => 1,
      getBetCoins: () => [1, 2, 3, 4, 5],
      getBetRate: () => 1,
      getBetRates: () => [1, 2, 3, 4, 5],
      getBetCost: () => 1,
      getQuickSpin: () => false,
      isResponsibleGamingEnabled: () => false,
      isAutoPlayAvailable: () => true,
      isFastPlayAvailable: () => true,
      isSlamStopAvailable: () => true,
      isTurboAvailable: () => true,
      isFeatureBuyAvailable: () => true,
      isGambleAvailable: () => false,
      isHistoryAvailable: () => true,
      isFullscreenAvailable: () => true,
      onRealChanged: () => true,
      onPlay: () => true,
      onEvent: () => true,
      onCashier: () => true,
      onLobby: () => true,
      openHistory: () => {},
      openLobby: () => {},
      openCashier: () => {},
      toggleResponsibleGaming: () => {},
      placeBet: (cfg, cb) => setTimeout(() => cb({
        status: 0,
        balance: 10000,
        roundId: 'demo-' + Date.now(),
        result: 'demo',
        data: 'demo',
      }), 100),
      endRound: (cfg, cb) => setTimeout(() => cb({
        status: 0,
        balance: 10000,
        roundId: cfg.roundId,
      }), 50),
      buyFeature: (cfg, cb) => setTimeout(() => cb({
        status: 0,
        balance: 10000,
        roundId: 'demo-buy-' + Date.now(),
        result: 'demo',
        data: 'demo',
      }), 100),
      gamble: (cfg, cb) => setTimeout(() => cb({ status: 0 }), 50),
      validateSession: (cb) => setTimeout(() => cb(true), 50),
    };
    // Also some PixiApp-related globals the integration might need
    window.HacksawIntegration = window.hacksawCasino;
    console.log('[kira-stub] hacksawCasino stub injected');
  });

  const demoUrl = 'https://static-live.hacksawgaming.com/1760/1.15.1/index.html' +
    '?gameid=1760&token=demo&mode=2&language=en&partner=hacksaw&channel=desktop';

  page.on('console', msg => {
    if (msg.type() === 'error' || /ready|spin/i.test(msg.text())) console.log(`[c.${msg.type()}]`, msg.text().slice(0, 250));
  });
  page.on('pageerror', err => console.log('[pageerror]', err.message));

  await page.goto(demoUrl, { waitUntil: 'domcontentloaded' });

  // Wait for PIXI
  let pixiLoaded = false;
  for (let i = 1; i <= 30; i++) {
    await page.waitForTimeout(1000);
    pixiLoaded = await page.evaluate(() => typeof window.PIXI !== 'undefined');
    if (pixiLoaded) {
      console.log(`PIXI loaded at t=${i}s`);
      break;
    }
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/07-stubbed.png` });

  const r = await page.evaluate(() => {
    const out = { pixiLoaded: typeof window.PIXI !== 'undefined' };
    if (window.PIXI) {
      out.PIXI_keys = Object.keys(window.PIXI).slice(0, 50);
      try {
        const inst = new window.PIXI.Application();
        out.Application_keys = Object.keys(inst).slice(0, 30);
        inst.destroy();
      } catch(e) { out.Application_err = e.message; }
    }
    // Look for the game's app instance
    if (window.app) out.app_keys = Object.keys(window.app).slice(0, 40);
    // Check pixiApp on canvas
    const c = document.querySelector('canvas');
    if (c) {
      // PIXI typically attaches __pixi_app or similar
      out.canvasProps = Object.getOwnPropertyNames(c).filter(k => /pixi|app|stage/i.test(k));
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 2));

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
