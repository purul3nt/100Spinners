const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const allErrors = [];

  await page.addInitScript(() => {
    window.addEventListener('error', (e) => {
      const m = e.message || 'no msg';
      const f = e.filename || 'no file';
      const l = e.lineno || '?';
      const c = e.colno || '?';
      console.log('[WIN-ERR]', JSON.stringify({ m, f, l, c, stack: e.error?.stack || '' }));
    }, true);
    window.addEventListener('unhandledrejection', (e) => {
      console.log('[UNH-REJ]', JSON.stringify({
        reason: String(e.reason),
        stack: e.reason?.stack || '',
      }));
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
      MoneyHelper: { toCurrency: (v) => String(v) },
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

  page.on('console', msg => {
    const t = msg.text();
    if (msg.type() === 'error' || /WIN-ERR|UNH-REJ/.test(t)) {
      console.log(`[CON] ${msg.type()}: ${t}`);
    }
  });

  await page.goto('https://static-live.hacksawgaming.com/1760/1.15.1/index.html?gameid=1760&token=demo&mode=2&language=en&partner=hacksaw&channel=desktop', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(15000);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
