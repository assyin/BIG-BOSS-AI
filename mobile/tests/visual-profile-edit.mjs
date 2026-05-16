// Visual check — profile edit screen
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENS_DIR = path.join(__dirname, 'screens');
const BASE = 'http://localhost:8082';

await mkdir(SCREENS_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

page.on('pageerror', (e) => console.error('[pageerror]', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.error('[console.error]', m.text());
});

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(5000);

// Login if needed
const emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();
if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
  await emailInput.fill('yassine@gmail.com');
  await page.locator('input[type="password"]').first().fill('Admin123!');
  await page.getByText(/se connecter|connexion/i).last().click();
  await page.waitForTimeout(6000);
}

// 1. Profile screen with new "Modifier" button
await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(5000);
await page.screenshot({ path: path.join(SCREENS_DIR, 'profile-with-edit-btn.png'), fullPage: true });
console.log('saved profile-with-edit-btn');

// 2. Profile edit
await page.goto(`${BASE}/profile-edit`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(5000);
await page.screenshot({ path: path.join(SCREENS_DIR, 'profile-edit.png'), fullPage: true });
console.log('saved profile-edit');

await browser.close();
