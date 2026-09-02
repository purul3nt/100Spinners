const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/tmp/kira-usoa';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.addInitScript(() => {
    // Build a channel that just no-ops everything
    const makeChannel = () => {
      const subs = new Map();
      return {
        subscribe(name, fn) { subs.set(name, fn); return () => subs.delete(name); },
        publish(name, data) { subs.get(name)?.(data); subs.get(name)?.call(null, data); },
        trigger(name, data) { subs.get(name)?.(data); },
      };
    };
    window.hacksawCasino = {
      PubSub: {
        getChannel: () => makeChannel(),
      },
      MoneyHelper: { toCurrency: (v) => String(v), formatNumber: (v) => String(v) },
      Translation: {
        ui: (key) => key,
        get: (key) => key,
      },
      // Provide a minimal casino API surface
      onLoad: () => true,
      getCasinoSkin: () => ({}),
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
      getChannel: () => 'desktop',
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
      placeBet: (cfg, cb) => setTimeout(() => cb({ status: 0, balance: 10000, roundId: 'demo-' + Date.now() }), 100),
      endRound: (cfg, cb) => setTimeout(() => cb({ status: 0, balance: 10000, roundId: cfg.roundId }), 50),
      buyFeature: (cfg, cb) => setTimeout(() => cb({ status: 0, balance: 10000 }), 100),
      gamble: (cfg, cb) => setTimeout(() => cb({ status: 0 }), 50),
      validateSession: (cb) => setTimeout(() => cb(true), 50),
      onEvent: () => true,
    };
    console.log('[stub] hacksawCasino full stub injected');
  });

  page.on('console', msg => {
    const t = msg.text();
    if (msg.type() === 'error') console.log('[err]', t.slice(0, 200));
    if (msg.type() === 'log' && /stub|ready|spin|init/i.test(t)) console.log('[log]', t.slice(0, 200));
  });
  page.on('pageerror', err => console.log('[pageerror]', err.message));

  const demoUrl = 'https://static-live.hacksawgaming.com/1760/1.15.1/index.html' +
    '?gameid=1760&token=demo&mode=2&language=en&partner=hacksaw&channel=desktop';
  await page.goto(demoUrl, { waitUntil: 'domcontentloaded' });

  for (let i = 1; i <= 30; i++) {
    await page.waitForTimeout(1000);
    const pixiLoaded = await page.evaluate(() => typeof window.PIXI !== 'undefined');
    if (pixiLoaded) {
      console.log(`PIXI loaded at t=${i}s`);
      break;
    }
  }
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/08-stub2.png` });

  const r = await page.evaluate(() => {
    const out = { pixiLoaded: typeof window.PIXI !== 'undefined' };
    if (window.PIXI) {
      out.PIXI_keys = Object.keys(window.PIXI).slice(0, 30);
    }
    return out;
  });
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
