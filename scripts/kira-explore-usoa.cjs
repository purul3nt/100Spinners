// Kira — Ultimate Slot of America research/exploration.
// Not a test; a research probe that loads the Hacksaw demo, captures the
// launcher iframe URL, listens for API requests, and dumps what we find.
//
// One-shot research helper for the WukongBash math rebalance. Delete after.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = '/tmp/kira-usoa';
fs.mkdirSync(OUT, { recursive: true });

const URL = 'https://www.hacksawgaming.com/games/ultimate-slot-of-america';
const API_LOG = path.join(OUT, 'api-calls.json');
const CONSOLE_LOG = path.join(OUT, 'console.log');
const SCREENSHOTS = path.join(OUT, 'screenshots');

(async () => {
  const apiCalls = [];
  const consoleLines = [];

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
  });

  // Listen on ALL future requests including those from subframes/iframes.
  ctx.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith('http')) return;
    apiCalls.push({
      kind: 'request',
      url,
      method: req.method(),
      resourceType: req.resourceType(),
      headers: req.headers(),
      ts: Date.now(),
    });
  });

  ctx.on('response', async (resp) => {
    const url = resp.url();
    if (!url.startsWith('http')) return;
    let body = null;
    const ct = resp.headers()['content-type'] || '';
    try {
      if (ct.includes('json') || ct.includes('text') || ct.includes('javascript')) {
        const buf = await resp.body();
        body = buf.toString('utf8').slice(0, 200000); // cap
      }
    } catch (e) { body = `<<err: ${e.message}>>`; }
    apiCalls.push({
      kind: 'response',
      url,
      status: resp.status(),
      contentType: ct,
      body,
      ts: Date.now(),
    });
  });

  const page = await ctx.newPage();
  page.on('console', (msg) => {
    consoleLines.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    consoleLines.push(`[pageerror] ${err.message}`);
  });

  console.log('[kira] navigating', URL);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  console.log('[kira] initial load done, title=', await page.title());

  // Take an initial screenshot.
  fs.mkdirSync(SCREENSHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SCREENSHOTS, '01-initial.png'), fullPage: false });

  // 1. Dismiss the cookie/age consent banner.
  for (const sel of ['button:has-text("OK")', 'button:has-text("Ok")', '.js-cookies-consent', '[class*="cookie"] button']) {
    try {
      const btn = await page.$(sel);
      if (btn) {
        const txt = (await btn.textContent() || '').trim();
        if (/^(ok|no thanks)$/i.test(txt)) {
          console.log(`[kira] dismissing cookie banner via "${sel}" ("${txt}")`);
          await btn.click();
          await page.waitForTimeout(500);
          break;
        }
      }
    } catch (e) { /* miss */ }
  }
  await page.screenshot({ path: path.join(SCREENSHOTS, '01b-after-cookies.png'), fullPage: false });

  // 2. Look for the demo/play CTA. Hacksaw uses "TRY IT".
  const ctaSelectors = [
    'a:has-text("TRY IT")',
    'button:has-text("TRY IT")',
    'a:has-text("DEMO")',
    'a:has-text("PLAY")',
    'a:has-text("DEMO PLAY")',
    'button:has-text("DEMO")',
    'button:has-text("PLAY")',
    '[data-launch]',
    '.game-launch',
    '.demo-button',
    '.play-btn',
  ];

  let ctaClicked = false;
  for (const sel of ctaSelectors) {
    try {
      const handle = await page.$(sel);
      if (handle) {
        const txt = (await handle.textContent() || '').trim();
        console.log(`[kira] found CTA "${sel}" → "${txt.slice(0, 60)}"`);
        await handle.scrollIntoViewIfNeeded();
        await handle.click();
        ctaClicked = true;
        break;
      }
    } catch (e) { /* selector miss, continue */ }
  }

  if (!ctaClicked) {
    console.log('[kira] no obvious CTA found — dumping all clickable elements with text');
    const candidates = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('a, button, [role="button"], .btn, [class*="play"], [class*="demo"], [class*="launch"]'));
      return all.slice(0, 50).map((el) => ({
        tag: el.tagName.toLowerCase(),
        cls: el.className?.toString().slice(0, 100) || '',
        text: (el.textContent || '').trim().slice(0, 80),
        href: el.href || '',
      }));
    });
    console.log('[kira] clickables:', JSON.stringify(candidates, null, 2));
  }

  // Wait a bit for the launcher to inject.
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(SCREENSHOTS, '02-after-cta.png'), fullPage: false });

  // Enumerate iframes.
  const frames = page.frames();
  console.log(`[kira] ${frames.length} frames total`);
  for (const f of frames) {
    try {
      console.log(`  frame: url=${f.url()} name=${f.name() || ''}`);
    } catch (e) { console.log(`  frame: <err ${e.message}>`); }
  }

  // Dump what we collected.
  fs.writeFileSync(API_LOG, JSON.stringify(apiCalls, null, 2));
  fs.writeFileSync(CONSOLE_LOG, consoleLines.join('\n'));

  console.log(`[kira] captured ${apiCalls.length} network events`);
  console.log(`[kira] API endpoints seen (responses only):`);
  const seen = new Set();
  for (const ev of apiCalls) {
    if (ev.kind !== 'response') continue;
    const u = new URL(ev.url);
    seen.add(`${ev.status} ${u.host}${u.pathname}`);
  }
  for (const s of seen) console.log('  ', s);

  console.log(`[kira] saved logs to ${OUT}`);

  await browser.close();
  process.exit(0);
})().catch((e) => {
  console.error('[kira] fatal:', e);
  process.exit(1);
});