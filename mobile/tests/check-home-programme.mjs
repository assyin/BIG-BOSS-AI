/**
 * Diagnostic: open Expo web home from external IP (mimicking phone) + capture
 * console errors + check if programme card appears.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://192.168.19.112:8082'; // same URL as phone

const browser = await chromium.launch({
  headless: true,
  args: ['--window-size=420,900'],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    consoleErrors.push(`[${msg.type()}] ${msg.text().slice(0, 200)}`);
  }
});
page.on('requestfailed', (req) => {
  consoleErrors.push(`[failed] ${req.method()} ${req.url()} → ${req.failure()?.errorText}`);
});

console.log(`\n→ Loading ${BASE}\n`);
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

// Login if needed
const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
  console.log('→ Login form detected, signing in');
  await emailInput.fill('yassine@gmail.com');
  await page.locator('input[type="password"]').first().fill('Admin123!');
  await page.getByText(/se connecter|connexion/i).last().click();
  await page.waitForTimeout(5000);
} else {
  console.log('→ Already logged in');
}

await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(4000);

// Save screenshot
await page.screenshot({ path: path.join(__dirname, 'screens', 'diag-home.png'), fullPage: true });
console.log('→ Screenshot saved: tests/screens/diag-home.png');

// Check for programme presence
const hasProgrammeCard = await page.getByText(/Programme Force|Upper\/Lower|Semaine.*\d.*\d/i).first().isVisible().catch(() => false);
const hasEmptyState = await page.getByText(/Tu n'as pas encore de programme/i).first().isVisible().catch(() => false);
const hasGenerateBtn = await page.getByText(/Generer mon programme/i).first().isVisible().catch(() => false);

console.log(`\nDOM checks:`);
console.log(`  hasProgrammeCard: ${hasProgrammeCard}`);
console.log(`  hasEmptyState:    ${hasEmptyState}`);
console.log(`  hasGenerateBtn:   ${hasGenerateBtn}`);

console.log(`\nConsole errors (${consoleErrors.length}):`);
consoleErrors.slice(0, 20).forEach((e) => console.log(`  ${e}`));

// Network requests to /api/programmes
const apiCallsRaw = await page.evaluate(() => {
  // @ts-ignore
  return performance.getEntriesByType('resource')
    .filter((r) => r.name.includes('/api/'))
    .map((r) => ({ name: r.name, duration: Math.round(r.duration) }));
});
console.log(`\nAPI calls captured:`);
apiCallsRaw.slice(0, 20).forEach((r) => console.log(`  ${r.duration}ms ${r.name}`));

await browser.close();
process.exit(0);
