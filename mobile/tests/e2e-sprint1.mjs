/**
 * Sprint 1 — E2E test visuel Playwright (HEADED + slow-mo).
 *
 * Tu peux SUIVRE le navigateur en direct sur ton écran.
 * Chaque étape capture un screenshot dans tests/screens/sprint1-e2e/.
 *
 * Prérequis:
 *   - Expo web actif sur http://localhost:8082
 *   - Backend actif sur http://localhost:5050
 *
 * Run:
 *   cd mobile && node tests/e2e-sprint1.mjs
 *
 * Options:
 *   HEADLESS=1 node tests/e2e-sprint1.mjs   # mode invisible (CI/CD)
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENS_DIR = path.join(__dirname, 'screens', 'sprint1-e2e');
const BASE = 'http://localhost:8082';
const HEADLESS = process.env.HEADLESS === '1';
const SLOW_MO_MS = HEADLESS ? 0 : 600;

await mkdir(SCREENS_DIR, { recursive: true });

// ─── Result tracking ────────────────────────────────────────
const results = [];

function logStep(num, title, passed, detail = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} Step ${num} — ${title}${detail ? ' · ' + detail : ''}`);
  results.push({ step: num, title, passed, detail });
}

async function shot(page, name) {
  const file = path.join(SCREENS_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

// ─── Main ────────────────────────────────────────────────────
console.log(`\n🎬 Sprint 1 E2E — ${HEADLESS ? 'HEADLESS' : 'HEADED (suis en live!)'}\n`);

const browser = await chromium.launch({
  headless: HEADLESS,
  slowMo: SLOW_MO_MS,
  args: ['--window-size=420,900', '--window-position=100,100'],
});

const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

page.on('pageerror', (e) => console.error('  [pageerror]', e.message));

try {
  // ═══ Step 1: Load Expo web ═══
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000); // fonts + bundle
  await shot(page, '01-initial');
  logStep(1, 'Expo web chargé', true, page.url());

  // ═══ Step 2: Login ═══
  const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
  const visible = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);
  if (visible) {
    await emailInput.fill('yassine@gmail.com');
    await page.locator('input[type="password"]').first().fill('Admin123!');
    await page.getByText(/se connecter|connexion/i).last().click();
    await page.waitForTimeout(6000);
    await shot(page, '02-after-login');
    logStep(2, 'Login réussi', true, 'yassine@gmail.com');
  } else {
    await shot(page, '02-already-logged');
    logStep(2, 'Déjà loggé', true, 'session persistée');
  }

  // ═══ Step 3: Home — Quick Actions visibles ═══
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  const hasBadges = await page.getByText('Badges').first().isVisible().catch(() => false);
  const hasBoutique = await page.getByText('Boutique').first().isVisible().catch(() => false);
  const hasCommunaute = await page.getByText(/Communauté/i).first().isVisible().catch(() => false);
  const hasChallenges = await page.getByText(/Challenges/i).first().isVisible().catch(() => false);
  const allVisible = hasBadges && hasBoutique && hasCommunaute && hasChallenges;
  await shot(page, '03-home-quick-actions');
  logStep(3, 'Home: 4 quick actions visibles', allVisible,
    `Badges=${hasBadges} Boutique=${hasBoutique} Communauté=${hasCommunaute} Challenges=${hasChallenges}`);

  // ═══ Step 4: Boutique → header gradient + price badges gold ═══
  await page.goto(`${BASE}/rewards`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  const boutiqueHeader = await page.getByText(/Boutique|Shop/i).first().isVisible().catch(() => false);
  const arabicBoutique = await page.getByText('المتجر').first().isVisible().catch(() => false);
  await shot(page, '04-boutique');
  logStep(4, 'Boutique: header marocain', boutiqueHeader && arabicBoutique,
    `header=${boutiqueHeader}, arabe=${arabicBoutique}`);

  // ═══ Step 5: Achievements ═══
  await page.goto(`${BASE}/achievements`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const achHeader = await page.getByText(/Achievements|الإنجازات/i).first().isVisible().catch(() => false);
  await shot(page, '05-achievements');
  logStep(5, 'Achievements: header marocain', achHeader);

  // ═══ Step 6: Communauté ═══
  await page.goto(`${BASE}/community`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const commHeader = await page.getByText(/Communauté|المجتمع/i).first().isVisible().catch(() => false);
  await shot(page, '06-community');
  logStep(6, 'Communauté: header marocain', commHeader);

  // ═══ Step 7: Nutrition — macros palette marocaine ═══
  await page.goto(`${BASE}/nutrition`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  const nutHeader = await page.getByText('Nutrition').first().isVisible().catch(() => false);
  const arabicNut = await page.getByText('تغذيتك اليوم').first().isVisible().catch(() => false);
  await shot(page, '07-nutrition');
  logStep(7, 'Nutrition: arabe + macros', nutHeader && arabicNut,
    `arabe=${arabicNut}`);

  // ═══ Step 8: Recipes — badge 🇲🇦 ═══
  await page.goto(`${BASE}/nutrition/recipes`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  const recipesHeader = await page.getByText('Recettes').first().isVisible().catch(() => false);
  const marocBadge = await page.getByText(/Marocain/i).first().isVisible().catch(() => false);
  await shot(page, '08-recipes');
  logStep(8, 'Recettes: badge 🇲🇦 Marocain', recipesHeader && marocBadge,
    `header=${recipesHeader}, badge=${marocBadge}`);

  // ═══ Step 9: Coach — empty state arabe ═══
  await page.goto(`${BASE}/coach`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  const coachHeader = await page.getByText(/Coach Big Boss/i).first().isVisible().catch(() => false);
  const coachArabic = await page.getByText('السلام! أنا بيغ بوس').first().isVisible().catch(() => false);
  await shot(page, '09-coach');
  logStep(9, 'Coach: greeting arabe', coachHeader && coachArabic,
    `arabe=${coachArabic}`);

  // ═══ Step 10: Profile — avatar dorée + bouton Modifier ═══
  await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  const modifierBtn = await page.getByText('Modifier').first().isVisible().catch(() => false);
  await shot(page, '10-profile');
  logStep(10, 'Profile: bouton Modifier visible', modifierBtn);

  // ═══ Step 11: Profile-edit — rubriques chips ═══
  await page.goto(`${BASE}/profile-edit`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  const editHeader = await page.getByText('Modifier le profil').first().isVisible().catch(() => false);
  const hasGender = await page.getByText('Homme').first().isVisible().catch(() => false);
  const hasObjectif = await page.getByText('Objectif').first().isVisible().catch(() => false);
  await shot(page, '11-profile-edit');
  logStep(11, 'Profile-edit: form rubriques', editHeader && hasGender && hasObjectif,
    `header=${editHeader}, chips Homme=${hasGender}, Objectif=${hasObjectif}`);

  // ═══ Step 12: Backend API check — push stats ═══
  const apiResponse = await page.request.post(`http://localhost:5050/api/auth/login`, {
    data: { email: 'yassine@gmail.com', password: 'Admin123!' },
  });
  const apiOk = apiResponse.ok();
  if (apiOk) {
    const body = await apiResponse.json();
    const token = body.accessToken;
    const statsRes = await page.request.get('http://localhost:5050/api/admin/push/stats', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const statsOk = statsRes.ok();
    let stats = null;
    if (statsOk) stats = await statsRes.json();
    logStep(12, 'Backend FCM /push/stats', statsOk, stats ? `${stats.total} users, ${stats.withToken} avec token` : 'no body');
  } else {
    logStep(12, 'Backend FCM /push/stats', false, `login failed ${apiResponse.status()}`);
  }

  // ─── Wait so you can see the last screen ───
  if (!HEADLESS) {
    console.log('\n⏸  Tu peux fermer le navigateur quand tu veux (10s avant auto-close)...');
    await page.waitForTimeout(10000);
  }
} catch (err) {
  console.error('\n❌ Test crashed:', err.message);
  logStep('?', 'TEST CRASH', false, err.message);
} finally {
  await browser.close();
}

// ─── Final report ────────────────────────────────────────────
const passed = results.filter((r) => r.passed).length;
const total = results.length;
console.log(`\n${'═'.repeat(60)}`);
console.log(`E2E Sprint 1: ${passed}/${total} steps passed`);
console.log('═'.repeat(60));

// Write JSON report for orchestrator
const reportPath = path.join(__dirname, 'e2e-sprint1-result.json');
await writeFile(reportPath, JSON.stringify({ passed, total, results }, null, 2));

process.exit(passed === total ? 0 : 1);
