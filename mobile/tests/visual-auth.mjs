import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENS_DIR = path.join(__dirname, 'screens');
const BASE = 'http://localhost:8082';

await mkdir(SCREENS_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('[pageerror]', e.message));

// Clear storage to force login
await page.goto(BASE);
await page.evaluate(() => {
  try { localStorage.clear(); sessionStorage.clear(); } catch {}
});

// Splash (root, before auth check completes)
await page.goto(BASE, { waitUntil: 'commit', timeout: 60000 });
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(SCREENS_DIR, 'splash.png'), fullPage: false });
console.log('saved splash');

// Login screen
await page.waitForTimeout(5000);
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: path.join(SCREENS_DIR, 'login-refonte.png'), fullPage: true });
console.log('saved login');

await browser.close();
