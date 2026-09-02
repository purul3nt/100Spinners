const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/tmp/kira-usoa';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.addInitScript(() => {
    window.addEventListener('error', (e) => {
      console.log('[WIN-ERR]', JSON.stringify({ m: e.message, f: e.filename, l: e.lineno, c: e.colno }));
    }, true);
    const makeChannel = () => {
      const subs = new Map();
      return {
        subscribe(name, fn) {
          if (!subs.has(name)) subs.set(name, []);
          subs.get(name).push(fn);
          return () => { const arr = subs.get(name); if (arr) subs.set(name, arr.filter(f => f !== fn)); };
        },
        publish(name, data) { (subs.get(name) || []).forEach(fn => { try { fn(data); } catch(e){} }); },
      };
    };
    window.hacksawCasino = {
      PubSub: { getChannel: () => makeChannel() },
      MoneyHelper: { toCurrency: (v) => String(v), formatNumber: (n) => String(n) },
      Translation: { ui: (k) => k, get: (k) => k },
      onLoad: () => true, getCasinoSkin: () => ({}),
      getBrand: () => 'hacksaw', getLanguage: () => 'en', getCurrency: () => 'USD',
      getEnvironment: () => 'demo', getMode: () => 2, getOperator: () => 'hacksaw',
      getJurisdiction: () => null, getPlayerLimitsUrl: () => '', getSelfExclusionUrl: () => '',
      getSessionElapsed: () => 0, getSessionNet: () => 0, getBalance: () => 10000,
      getBetLimits: () => ({ min: 0.1, max: 100, defCoin: 1, defRate: 1 }),
      getBetLevel: () => 1, getBetLevels: () => [1], getBetCoin: () => 1, getBetCoins: () => [1],
      getBetRate: () => 1, getBetRates: () => [1], getBetCost: () => 1, getChannel: () => 'desktop',
      getQuickSpin: () => false, isResponsibleGamingEnabled: () => false,
      isAutoPlayAvailable: () => true, isFastPlayAvailable: () => true, isSlamStopAvailable: () => true,
      isTurboAvailable: () => true, isFeatureBuyAvailable: () => true, isGambleAvailable: () => false,
      isHistoryAvailable: () => true, isFullscreenAvailable: () => true,
      placeBet: (cfg, cb) => setTimeout(() => cb({ status: 0, balance: 10000 }), 100),
      endRound: (cfg, cb) => setTimeout(() => cb({ status: 0 }), 50),
      buyFeature: (cfg, cb) => setTimeout(() => cb({ status: 0 }), 100),
      gamble: (cfg, cb) => setTimeout(() => cb({ status: 0 }), 50),
      validateSession: (cb) => setTimeout(() => cb(true), 50),
      onEvent: () => true,
    };
  });

  const errors = [];
  page.on('pageerror', err => errors.push(`PE: ${err.message}`));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`CON: ${msg.text().slice(0, 300)}`);
    if (/WIN-ERR/.test(msg.text())) console.log(msg.text().slice(0, 300));
  });

  // CRITICAL: include env in URL params (bundle parses it from location.search)
  const demoUrl = 'https://static-live.hacksawgaming.com/1760/1.15.1/index.html' +
    '?gameid=1760&token=demo&mode=2&partner=hacksaw&channel=desktop' +
    '&env=https://rgs-demo.hacksawgaming.com/api' +
    '&apienv=https://rgs-demo.hacksawgaming.com/api' +
    '&backend=2';

  await page.goto(demoUrl, { waitUntil: 'domcontentloaded' });

  for (let i = 1; i <= 30; i++) {
    await page.waitForTimeout(1000);
    const pixiLoaded = await page.evaluate(() => typeof window.PIXI !== 'undefined');
    if (pixiLoaded) { console.log(`[kira] PIXI loaded at t=${i}s`); break; }
  }
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${OUT}/16-with-env.png` });

  const r = await page.evaluate(() => ({
    pixiLoaded: typeof window.PIXI !== 'undefined',
    placeBetVisible: (() => { const r = document.querySelector('#PlaceBetBtn')?.getBoundingClientRect(); return r ? r.width > 0 : null; })(),
    canvasSize: (() => { const c = document.querySelector('canvas'); return c ? [c.width, c.height] : null; })(),
  }));
  console.log(JSON.stringify(r, null, 2));
  console.log('=== errors ===');
  for (const e of errors) console.log(e);

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
