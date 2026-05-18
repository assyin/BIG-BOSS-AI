#!/usr/bin/env node
/**
 * Sprint 3 — Orchestrateur de tests.
 *
 * Lance dans l'ordre:
 *   1. Backend xUnit (NotificationJobs + SessionServiceOffline + MuscleBalance)
 *   2. Mobile unit (body-metrics + offline-queue) via tsx
 *   3. Playwright E2E visual (HEADED 20 steps)
 *   4. DB checks (Hangfire + ProcessedClientUuids col + favoris)
 *   5. API integration tests (curl-like via fetch)
 *
 * Produit: tests/SPRINT_3_TEST_RESULTS.md
 *
 * Run: node tests/run-sprint3-tests.mjs
 */
import { spawn, execSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const checks = [];

function checkOk(category, name, detail = '') {
  checks.push({ category, name, passed: true, detail });
  console.log(`  ✓ [${category}] ${name}${detail ? ' · ' + detail : ''}`);
}

function checkFail(category, name, detail = '') {
  checks.push({ category, name, passed: false, detail });
  console.log(`  ✗ [${category}] ${name}${detail ? ' · ' + detail : ''}`);
}

function runCmd(cmd, args, cwd, label) {
  return new Promise((resolve) => {
    const env = { ...process.env };
    if (process.platform === 'win32') {
      env.PATH = [
        env.PATH || '',
        'C:\\Program Files\\dotnet',
        'C:\\Program Files\\nodejs',
        'C:\\Program Files (x86)\\dotnet',
      ].join(';');
    }
    // .cmd/.bat doivent passer par shell sur Windows ; les .exe se lancent direct
    const isBatch = /\.(cmd|bat)$/i.test(cmd);
    const finalCmd = isBatch ? `"${cmd}"` : cmd;
    const child = spawn(finalCmd, args, { cwd, shell: isBatch, env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString();
      process.stdout.write(d);
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString();
      process.stderr.write(d);
    });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr, label });
    });
  });
}

function runCmdSilent(cmd) {
  try {
    return { ok: true, output: execSync(cmd, { encoding: 'utf-8' }).trim() };
  } catch (e) {
    return { ok: false, output: e.stderr || e.message };
  }
}

async function curl(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    return { status: res.status, body: text };
  } catch (e) {
    return { status: 0, body: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════
console.log('\n🧪 SPRINT 3 — TEST RUNNER\n');
console.log('═'.repeat(60));

// ─── 1. Backend xUnit ─────────────────────────────────────────
console.log('\n[1/5] Backend xUnit (NotificationJobs + SessionServiceOffline + MuscleBalance)\n');
const DOTNET = process.platform === 'win32' ? 'C:\\Program Files\\dotnet\\dotnet.exe' : 'dotnet';
const NODE = process.platform === 'win32' ? 'C:\\Program Files\\nodejs\\node.exe' : 'node';
const NPX = process.platform === 'win32' ? 'C:\\Program Files\\nodejs\\npx.cmd' : 'npx';

const xunitResult = await runCmd(
  DOTNET,
  [
    'test', 'BigBoss.Tests',
    '--filter',
    'FullyQualifiedName~NotificationJobsServiceTests|FullyQualifiedName~SessionServiceOfflineTests|FullyQualifiedName~MuscleBalanceTests',
    '--nologo', '--verbosity', 'minimal',
  ],
  path.join(REPO_ROOT, 'backend'),
  'xunit'
);
if (xunitResult.code === 0) {
  // Parse "Passed!  -    X tests passed"
  const m = xunitResult.stdout.match(/Passed!\s*-\s*Failed:\s*(\d+),\s*Passed:\s*(\d+)/);
  const passed = m ? m[2] : '?';
  const failed = m ? m[1] : '?';
  checkOk('xUnit', `Backend tests`, `${passed} passed, ${failed} failed`);
} else {
  const failMatch = xunitResult.stdout.match(/Failed:\s*(\d+)/);
  checkFail('xUnit', `Backend tests`, `exit ${xunitResult.code}${failMatch ? ' (' + failMatch[1] + ' failed)' : ''}`);
}

// ─── 2. Mobile unit ───────────────────────────────────────────
console.log('\n[2/5] Mobile unit (body-metrics + offline-queue)\n');
const bmResult = await runCmd(
  NPX, ['tsx', 'tests/unit-body-metrics.ts'],
  path.join(REPO_ROOT, 'mobile'),
  'body-metrics'
);
if (bmResult.code === 0) {
  const m = bmResult.stdout.match(/body-metrics:\s*(\d+)\/(\d+)/);
  checkOk('unit-mobile', 'body-metrics', m ? `${m[1]}/${m[2]}` : 'OK');
} else {
  checkFail('unit-mobile', 'body-metrics', `exit ${bmResult.code}`);
}

const oqResult = await runCmd(
  NPX, ['tsx', 'tests/unit-offline-queue.ts'],
  path.join(REPO_ROOT, 'mobile'),
  'offline-queue'
);
if (oqResult.code === 0) {
  const m = oqResult.stdout.match(/offline-queue:\s*(\d+)\/(\d+)/);
  checkOk('unit-mobile', 'offline-queue', m ? `${m[1]}/${m[2]}` : 'OK');
} else {
  checkFail('unit-mobile', 'offline-queue', `exit ${oqResult.code}`);
}

// ─── 3. API integration ───────────────────────────────────────
console.log('\n[3/5] API integration tests\n');

// 3.1 Health
const health = await curl('http://localhost:5050/health');
if (health.status === 200) checkOk('api', '/health', '200');
else checkFail('api', '/health', `HTTP ${health.status}`);

// 3.2 Hangfire dashboard (loopback)
const dash = await curl('http://localhost:5050/hangfire');
if (dash.status === 200) checkOk('api', '/hangfire dashboard (loopback)', '200');
else checkFail('api', '/hangfire dashboard', `HTTP ${dash.status}`);

// 3.3 Trigger workout reminders
const trig = await curl('http://localhost:5050/hangfire/recurring/trigger', {
  method: 'POST',
  body: 'jobs%5B%5D=workout-reminders-daily',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
});
if (trig.status === 204 || trig.status === 200) {
  checkOk('api', 'Trigger workout-reminders-daily', `HTTP ${trig.status}`);
} else {
  checkFail('api', 'Trigger workout-reminders-daily', `HTTP ${trig.status}`);
}

// 3.4 Login
const login = await curl('http://localhost:5050/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: 'yassine@gmail.com', password: 'Admin123!' }),
  headers: { 'Content-Type': 'application/json' },
});
let token = null;
if (login.status === 200) {
  try {
    const b = JSON.parse(login.body);
    token = b.accessToken || b.token;
    checkOk('api', 'Login JWT', 'token reçu');
  } catch { checkFail('api', 'Login JWT', 'parse error'); }
} else {
  checkFail('api', 'Login JWT', `HTTP ${login.status}`);
}

if (token) {
  // 3.5 Muscle balance endpoint
  const mb = await curl('http://localhost:5050/api/me/muscle-balance', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (mb.status === 200) {
    try {
      const b = JSON.parse(mb.body);
      const has10 = Array.isArray(b.muscles) && b.muscles.length === 10;
      if (has10) checkOk('api', 'GET /api/me/muscle-balance', '10 muscles');
      else checkFail('api', 'GET /api/me/muscle-balance', `${b.muscles?.length} muscles`);
    } catch { checkFail('api', 'GET /api/me/muscle-balance', 'parse error'); }
  } else {
    checkFail('api', 'GET /api/me/muscle-balance', `HTTP ${mb.status}`);
  }

  // 3.6 Favorites endpoints
  const fav = await curl('http://localhost:5050/api/users/me/favorites/recipes', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (fav.status === 200) checkOk('api', 'GET /favorites/recipes', '200');
  else checkFail('api', 'GET /favorites/recipes', `HTTP ${fav.status}`);
}

// ─── 4. DB checks ─────────────────────────────────────────────
console.log('\n[4/5] DB checks (psql via docker)\n');

const dbCol = runCmdSilent(
  `docker exec bigboss-postgres psql -U bigboss -d bigbossfitness -tA -c "SELECT column_name FROM information_schema.columns WHERE table_name='session_exercises' AND column_name='processed_client_uuids';"`
);
if (dbCol.ok && dbCol.output.includes('processed_client_uuids')) {
  checkOk('db', 'session_exercises.processed_client_uuids', 'exists');
} else {
  checkFail('db', 'session_exercises.processed_client_uuids', dbCol.output);
}

const dbHangfire = runCmdSilent(
  `docker exec bigboss-postgres psql -U bigboss -d bigbossfitness -tA -c "SELECT COUNT(*) FROM hangfire.set WHERE key='recurring-jobs';"`
);
if (dbHangfire.ok && parseInt(dbHangfire.output) >= 4) {
  checkOk('db', 'Hangfire recurring-jobs', `${dbHangfire.output} jobs registered`);
} else {
  checkFail('db', 'Hangfire recurring-jobs', dbHangfire.output);
}

const dbFavTable = runCmdSilent(
  `docker exec bigboss-postgres psql -U bigboss -d bigbossfitness -tA -c "SELECT to_regclass('public.\\"UserFavoriteRecipes\\"');"`
);
if (dbFavTable.ok && dbFavTable.output.includes('UserFavoriteRecipes')) {
  checkOk('db', 'UserFavoriteRecipes table', 'exists');
} else {
  checkFail('db', 'UserFavoriteRecipes table', dbFavTable.output);
}

const dbPushUsers = runCmdSilent(
  `docker exec bigboss-postgres psql -U bigboss -d bigbossfitness -tA -c "SELECT COUNT(*) FROM users WHERE \\"PushToken\\" IS NOT NULL;"`
);
if (dbPushUsers.ok) {
  const n = parseInt(dbPushUsers.output);
  if (n >= 1) checkOk('db', 'users with push_token', `${n} user(s)`);
  else checkFail('db', 'users with push_token', '0 (besoin d\'au moins 1 pour valider push)');
}

// ─── 5. Playwright E2E ────────────────────────────────────────
console.log('\n[5/5] Playwright E2E HEADED (20 steps — suis en live!)\n');
const e2eResult = await runCmd(
  NODE, ['tests/e2e-sprint3.mjs'],
  path.join(REPO_ROOT, 'mobile'),
  'e2e'
);
try {
  const e2eJson = JSON.parse(
    await readFile(path.join(REPO_ROOT, 'mobile', 'tests', 'e2e-sprint3-result.json'), 'utf-8')
  );
  const stepsPassed = e2eJson.passed;
  const stepsTotal = e2eJson.total;
  if (stepsPassed === stepsTotal) {
    checkOk('e2e', 'Playwright E2E', `${stepsPassed}/${stepsTotal} steps`);
  } else {
    checkFail('e2e', 'Playwright E2E', `${stepsPassed}/${stepsTotal} steps`);
  }
  // Détail par étape
  for (const r of e2eJson.results) {
    if (r.passed) checkOk(`e2e:${r.step}`, r.title, r.detail);
    else checkFail(`e2e:${r.step}`, r.title, r.detail);
  }
} catch (e) {
  checkFail('e2e', 'Playwright E2E', `pas de result.json (${e.message})`);
}

// ═══ Final report ════════════════════════════════════════════
const passedCount = checks.filter((c) => c.passed).length;
const totalCount = checks.length;
const pct = Math.round((passedCount / totalCount) * 100);

console.log(`\n${'═'.repeat(60)}`);
console.log(`Sprint 3 Test Runner: ${passedCount}/${totalCount} (${pct}%)`);
console.log('═'.repeat(60));

// Write markdown report
const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
const groupBy = (arr, key) => arr.reduce((acc, x) => {
  const k = x[key];
  (acc[k] ||= []).push(x);
  return acc;
}, {});
const grouped = groupBy(checks, 'category');

let md = `# Sprint 3 — Résultats de tests

> Généré automatiquement le ${now}

## Bilan

| Catégorie | Score |
|---|---|
| **Total** | **${passedCount}/${totalCount} (${pct}%)** |
`;
for (const [cat, items] of Object.entries(grouped)) {
  const p = items.filter((i) => i.passed).length;
  md += `| ${cat} | ${p}/${items.length} |\n`;
}

md += `\n## Détails\n\n`;
for (const [cat, items] of Object.entries(grouped)) {
  md += `### ${cat}\n\n`;
  for (const it of items) {
    const icon = it.passed ? '✅' : '❌';
    md += `- ${icon} **${it.name}**${it.detail ? ' — ' + it.detail : ''}\n`;
  }
  md += '\n';
}

md += `## Conclusion

- Sprint 3 prêt pour beta : ${pct >= 80 ? '✅ oui' : '❌ corrections nécessaires'}
- Screenshots Playwright : \`mobile/tests/screens/sprint3-e2e/\`
`;

const reportPath = path.join(__dirname, 'SPRINT_3_TEST_RESULTS.md');
await writeFile(reportPath, md);
console.log(`\n📄 Rapport: ${reportPath}\n`);

process.exit(passedCount === totalCount ? 0 : 1);
