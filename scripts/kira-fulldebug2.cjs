const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', msg => {
    const t = msg.text();
    if (msg.type() === 'error') errors.push(`CON-ERR: ${t.slice(0, 400)}`);
    if (/WIN-ERR|UNH-REJ|stub|hacksaw\.casino/.test(t)) console.log(`[${msg.type()}] ${t.slice(0, 400)}`);
  });
  page.on('pageerror', err => {
    errors.push(`PE: ${err.message}`);
    if (err.stack) errors.push(`ST: ${err.stack.slice(0, 500)}`);
  });

  await page.addInitScript(() => {
    window.addEventListener('error', (e) => {
      console.log('[WIN-ERR]', JSON.stringify({
        m: e.message || 'no msg',
        f: e.filename || 'no file',
        l: e.lineno || '?',
        c: e.colno || '?',
        stack: e.error?.stack || '',
      }));
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
    window.hacksaw = {
      casino: {
        env: 'https://rgs-mt.hacksawgaming.com/api',
        demoEnv: 'https://rgs-demo.hacksawgaming.com/api',
        realmoneyenv: 'https://rgs-mt.hacksawgaming.com/api',
        staticContent: 'https://static-live.hacksawgaming.com/',
        gameId: 1760, mode: 'demo', partnerid: 'hacksaw', token: 'demo', backend: 'demo',
        currency: 'USD', language: 'en', jurisdiction: null, branding: 'default',
      },
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

  await page.goto('https://static-live.hacksawgaming.com/1760/1.15.1/index.html?gameid=1760&token=demo&mode=2&language=en&partner=hacksaw&channel=desktop', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(15000);
  console.log('=== ALL ERRORS ===');
  for (const e of errors) console.log(e);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
