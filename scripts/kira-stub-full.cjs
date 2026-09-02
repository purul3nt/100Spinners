const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/tmp/kira-usoa';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.addInitScript(() => {
    // Build a PubSub Channel that also accepts arbitrary subscribes and stores them
    const makeChannel = () => {
      const subs = new Map();
      return {
        subscribe(name, fn) {
          if (!subs.has(name)) subs.set(name, []);
          subs.get(name).push(fn);
          return () => {
            const arr = subs.get(name);
            if (arr) subs.set(name, arr.filter(f => f !== fn));
          };
        },
        publish(name, data) {
          (subs.get(name) || []).forEach(fn => { try { fn(data); } catch(e){} });
        },
        trigger(name, data) { this.publish(name, data); },
        getSubscribers: () => Object.fromEntries(subs),
      };
    };
    window.hacksawCasino = {
      PubSub: { getChannel: () => makeChannel() },
      MoneyHelper: {
        toCurrency: (v) => String(v),
        formatNumber: (n, d) => String(n),
        parseMoney: (v) => Number(v) || 0,
      },
      Translation: {
        ui: (k) => k,
        get: (k) => k,
      },
      // Generic API
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
      // Missing methods commonly expected
      getChannelInfo: () => 'desktop', getJurisdictionCode: () => null,
      getCurrencyFraction: () => 2, getCurrencyMultiplier: () => 1, getCurrencySymbol: () => '$',
      getCountry: () => 'US', getRegion: () => null, getCity: () => null, getLocale: () => 'en-US',
      getBalanceReal: () => 10000, getBalanceBonus: () => 0, getTimezone: () => 'UTC',
      getClientType: () => 'desktop', getPlatform: () => 'web',
      getUserId: () => 'demo-user', getSessionId: () => 'demo-session',
      isLoggedIn: () => true, isDemo: () => true,
      // Event handlers (no-op)
      onEvent: () => true, onRealChanged: () => true, onPlay: () => true, onEndRound: () => true,
      onResize: () => true, onVisibilityChange: () => true, onError: () => true,
      onRoundComplete: () => true, onFreeSpinTrigger: () => true, onFeatureBuy: () => true,
      // Bet API
      placeBet: (cfg, cb) => setTimeout(() => cb({ status: 0, balance: 10000, roundId: 'demo-' + Date.now() }), 100),
      endRound: (cfg, cb) => setTimeout(() => cb({ status: 0, balance: 10000, roundId: cfg.roundId }), 50),
      buyFeature: (cfg, cb) => setTimeout(() => cb({ status: 0, balance: 10000 }), 100),
      gamble: (cfg, cb) => setTimeout(() => cb({ status: 0 }), 50),
      validateSession: (cb) => setTimeout(() => cb(true), 50),
      // Navigation
      openHistory: () => {}, openLobby: () => {}, openCashier: () => {},
      toggleResponsibleGaming: () => {}, openSettings: () => {}, openHelp: () => {},
      // Get config
      getConfig: (k) => null,
      getMaxBetLimit: () => 100, getMinBetLimit: () => 0.1,
      getAvailableBetLevels: () => [0.1, 0.5, 1, 2, 5, 10, 20, 50],
      getAvailableBetCoins: () => [1], getAvailableBetRates: () => [1],
    };
    console.log('[stub] hacksawCasino full stub injected');
  });

  page.on('pageerror', err => console.log(`[ERR] ${err.message.slice(0, 250)}`));
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[CON-ERR] ${msg.text().slice(0, 200)}`);
  });

  await page.goto('https://static-live.hacksawgaming.com/1760/1.15.1/index.html?gameid=1760&token=demo&mode=2&language=en&partner=hacksaw&channel=desktop', { waitUntil: 'domcontentloaded' });

  for (let i = 1; i <= 30; i++) {
    await page.waitForTimeout(1000);
    const pixiLoaded = await page.evaluate(() => typeof window.PIXI !== 'undefined');
    if (pixiLoaded) {
      console.log(`[kira] PIXI loaded at t=${i}s`);
      break;
    }
  }
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${OUT}/11-stub-full.png` });

  const r = await page.evaluate(() => {
    const out = { pixiLoaded: typeof window.PIXI !== 'undefined' };
    if (window.PIXI) {
      out.PIXI_keys = Object.keys(window.PIXI).slice(0, 30);
    }
    // Check buttons
    out.placeBet = (() => {
      const b = document.querySelector('#PlaceBetBtn');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { visible: r.width > 0, x: r.x, y: r.y, w: r.width, h: r.height };
    })();
    return out;
  });
  console.log(JSON.stringify(r, null, 2));

  // Try clicking PlaceBetBtn
  if (r.placeBet?.visible) {
    console.log('[kira] clicking PlaceBetBtn...');
    await page.click('#PlaceBetBtn');
    await page.waitForTimeout(8000);
    await page.screenshot({ path: `${OUT}/12-after-spin.png` });
    const post = await page.evaluate(() => {
      const out = {};
      // Check for win display
      out.balance = document.querySelector('[class*="balance"], [class*="Balance"]')?.textContent?.trim().slice(0, 50);
      out.win = document.querySelector('[class*="win"], [class*="Win"]')?.textContent?.trim().slice(0, 50);
      out.placeBetVisible = (() => { const r = document.querySelector('#PlaceBetBtn')?.getBoundingClientRect(); return r ? r.width > 0 : null; })();
      out.stopBtnVisible = (() => { const r = document.querySelector('#StopBtn')?.getBoundingClientRect(); return r ? r.width > 0 : null; })();
      // Check for board/symbols (look at canvas pixels)
      const canvas = document.querySelector('canvas');
      out.canvasSize = canvas ? [canvas.width, canvas.height] : null;
      return out;
    });
    console.log('[post-spin state]', JSON.stringify(post, null, 2));
  }

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
