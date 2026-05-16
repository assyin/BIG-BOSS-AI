// Visual regression check — nutrition module refonte marocaine
// Usage: node tests/visual-nutrition.mjs
// Requires: Expo web running on http://localhost:8082, backend on :5050

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENS_DIR = path.join(__dirname, 'screens');
const BASE = 'http://localhost:8082';
const EMAIL = 'yassine@gmail.com';
const PASSWORD = 'Admin123!';

await mkdir(SCREENS_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
});
const page = await ctx.newPage();

page.on('pageerror', (e) => console.error('[pageerror]', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.error('[console.error]', m.text());
});

async function shot(name) {
  const file = path.join(SCREENS_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log('saved', file);
}

async function waitMount(ms = 4000) {
  await page.waitForTimeout(ms);
}

console.log('1) loading app');
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await waitMount(5000);
await shot('00-initial');

// Try to log in
console.log('2) attempting login, url =', page.url());
const emailInput = page.locator('input[placeholder*="email" i], input[type="email"]').first();
const visible = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);

if (visible) {
  await emailInput.fill(EMAIL);
  const pwInput = page.locator('input[type="password"], input[placeholder*="passe" i]').first();
  await pwInput.fill(PASSWORD);

  // Click "Se connecter" — TouchableOpacity renders with role button or just clickable div
  const submit = page.getByText(/se connecter|connexion/i).last();
  await submit.click();
  console.log('   submitted login');
  await waitMount(6000);
  await shot('01-after-login');
} else {
  console.log('   no login form — already logged in or stuck on splash');
}

console.log('3) nutrition journal');
await page.goto(`${BASE}/nutrition`, { waitUntil: 'networkidle', timeout: 60000 });
await waitMount(4000);
await shot('02-nutrition-journal');

console.log('4) nutrition recipes list');
await page.goto(`${BASE}/nutrition/recipes`, { waitUntil: 'networkidle', timeout: 60000 });
await waitMount(5000);
await shot('03-nutrition-recipes');

// Try clicking a recipe card to navigate to detail
const firstCard = page.getByText(/tajine|brochette|baghrir|couscous|harira/i).first();
const cardVisible = await firstCard.isVisible({ timeout: 3000 }).catch(() => false);
if (cardVisible) {
  console.log('5) clicking first moroccan recipe card');
  await firstCard.click();
  await waitMount(5000);
  await shot('04-nutrition-recipe-detail');
} else {
  console.log('5) no recipe card visible — skipping detail');
}

console.log('6) add-meal');
await page.goto(`${BASE}/nutrition/add-meal`, { waitUntil: 'networkidle', timeout: 60000 });
await waitMount(4000);
await shot('05-nutrition-add-meal');

await browser.close();
console.log('done');
