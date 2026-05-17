#!/usr/bin/env node
/**
 * Sprint 1 — Orchestrateur de tests.
 *
 * Lance dans l'ordre:
 *   1. Backend xUnit tests (Push + Streak)
 *   2. Mobile pose-engine tests (tsx)
 *   3. Playwright E2E visual tests (HEADED par défaut)
 *   4. DB checks Darija coverage
 *   5. R2 dry-run + URL HEAD check
 *
 * Produit: tests/SPRINT_1_TEST_RESULTS.md
 *
 * Run: node tests/run-sprint1-tests.mjs
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
    // Enrichir PATH avec les dossiers communs Windows (dotnet, etc.)
    const env = { ...process.env };
    if (process.platform === 'win32') {
      env.PATH = `${env.PATH || ''};C:\\Program Files\\dotnet;C:\\Program Files (x86)\\dotnet`;
    }
    const child = spawn(cmd, args, { cwd, shell: true, env });
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

// ═══════════════════════════════════════════════════════════════
console.log('\n🧪 SPRINT 1 — TEST RUNNER\n');
console.log('═'.repeat(60));

// ─── 1. Backend xUnit tests ───
console.log('\n[1/5] Backend xUnit (PushNotificationServiceTests)\n');
// Fix #1: dotnet non dans PATH Git Bash → enrichi via runCmd env.PATH
const xunitResult = await runCmd(
  'dotnet',
  ['test', 'BigBoss.Tests', '--filter', 'FullyQualifiedName~PushNotificationServiceTests', '--nologo', '--verbosity', 'minimal'],
  path.join(REPO_ROOT, 'backend'),
  'xunit'
);
if (xunitResult.code === 0) {
  const passedMatch = xunitResult.stdout.match(/Passed:\s+(\d+)/);
  const passed = passedMatch ? passedMatch[1] : '?';
  checkOk('Backend xUnit', 'PushNotificationServiceTests', `${passed} tests passed`);
} else {
  checkFail('Backend xUnit', 'PushNotificationServiceTests', `exit ${xunitResult.code}`);
}

// ─── 2. Mobile pose-engine ───
console.log('\n[2/5] Mobile pose-engine unit tests\n');
const poseResult = await runCmd(
  'npx',
  ['tsx', 'tests/unit-pose-engine.ts'],
  path.join(REPO_ROOT, 'mobile'),
  'pose-engine'
);
if (poseResult.code === 0) {
  const passedMatch = poseResult.stdout.match(/(\d+)\/(\d+) passed/);
  const detail = passedMatch ? passedMatch[0] : 'all passed';
  checkOk('Mobile', 'pose-engine tests', detail);
} else {
  checkFail('Mobile', 'pose-engine tests', `exit ${poseResult.code}`);
}

// ─── 3. DB Darija coverage ───
console.log('\n[3/5] DB Darija coverage check\n');
const dbExos = runCmdSilent(
  `docker exec bigboss-postgres psql -U bigboss -d bigbossfitness -t -A -c "SELECT COUNT(*) FILTER (WHERE name_darija IS NOT NULL AND name_darija != '' AND name_darija != name_fr), COUNT(*) FROM exercises;"`
);
if (dbExos.ok) {
  const [withDarija, total] = dbExos.output.split('|').map((s) => parseInt(s.trim(), 10));
  if (withDarija === total && total > 0) {
    checkOk('DB', 'Exercices Darija 100%', `${withDarija}/${total}`);
  } else {
    checkFail('DB', 'Exercices Darija incomplet', `${withDarija}/${total}`);
  }
} else {
  checkFail('DB', 'Exercices query failed', dbExos.output.slice(0, 100));
}

const dbRecipes = runCmdSilent(
  `docker exec bigboss-postgres psql -U bigboss -d bigbossfitness -t -A -c "SELECT COUNT(*) FILTER (WHERE \\"TitleDarija\\" IS NOT NULL AND \\"TitleDarija\\" != '' AND \\"TitleDarija\\" != \\"TitleFr\\"), COUNT(*) FROM \\"Recipes\\";"`
);
if (dbRecipes.ok) {
  const [withDarija, total] = dbRecipes.output.split('|').map((s) => parseInt(s.trim(), 10));
  if (withDarija === total && total > 0) {
    checkOk('DB', 'Recettes Darija 100%', `${withDarija}/${total}`);
  } else {
    checkFail('DB', 'Recettes Darija incomplet', `${withDarija}/${total}`);
  }
} else {
  checkFail('DB', 'Recettes query failed', dbRecipes.output.slice(0, 100));
}

// ─── 4. R2 reachability ───
console.log('\n[4/5] R2 URL HEAD check\n');
// Fix #2: curl -s -o /dev/null -w "%{http_code}" → format string %{...}
// est interprété par le shell Windows → utiliser -sI qui retourne juste les headers
const r2Check = runCmdSilent(
  `curl -sI https://pub-11df79209fb045dfa8485a9ae0362e41.r2.dev/biceps/concentration-curl.mp4`
);
if (r2Check.ok && r2Check.output.includes('200 OK')) {
  checkOk('R2', 'Vidéo demo R2 reachable', 'HTTP 200 OK');
} else {
  checkFail('R2', 'Vidéo R2 unreachable', `output: ${r2Check.output.slice(0, 80)}`);
}

// Fix #3: script est à scripts/ (racine), pas mobile/scripts/
const r2Dry = runCmdSilent(`cd "${REPO_ROOT}" && py scripts/upload_influencer_videos.py 2>&1 | head -10`);
if (r2Dry.ok && r2Dry.output.includes('Excel mapping')) {
  checkOk('R2', 'Script upload influenceur (dry-run)', 'parse Excel OK');
} else {
  checkFail('R2', 'Script upload influenceur', r2Dry.output.slice(0, 100));
}

// ─── 5. Playwright E2E ───
console.log('\n[5/5] Playwright E2E visual tests (HEADED — suis en live !)\n');
const e2eResult = await runCmd(
  'node',
  ['tests/e2e-sprint1.mjs'],
  path.join(REPO_ROOT, 'mobile'),
  'e2e'
);

// Read E2E JSON report
try {
  const reportPath = path.join(REPO_ROOT, 'mobile', 'tests', 'e2e-sprint1-result.json');
  const report = JSON.parse(await readFile(reportPath, 'utf-8'));
  for (const step of report.results) {
    if (step.passed) {
      checkOk('E2E', `Step ${step.step} — ${step.title}`, step.detail);
    } else {
      checkFail('E2E', `Step ${step.step} — ${step.title}`, step.detail);
    }
  }
} catch (e) {
  checkFail('E2E', 'lecture rapport JSON', e.message);
}

// ═══════════════════════════════════════════════════════════════
// FINAL MARKDOWN REPORT
// ═══════════════════════════════════════════════════════════════
const passed = checks.filter((c) => c.passed).length;
const failed = checks.filter((c) => !c.passed).length;
const total = checks.length;

const md = `# Sprint 1 — Résultats des tests

> Généré automatiquement le ${new Date().toISOString()} par \`tests/run-sprint1-tests.mjs\`

## TL;DR

- **${passed}/${total}** checks passés (${Math.round((passed / total) * 100)}%)
- **${failed}** failures

${failed === 0 ? '✅ **Sprint 1 complètement validé**' : '⚠️  **Échecs à corriger** — voir détail ci-dessous'}

## Détail par catégorie

${['Backend xUnit', 'Mobile', 'DB', 'R2', 'E2E']
  .map((cat) => {
    const items = checks.filter((c) => c.category === cat);
    if (items.length === 0) return '';
    const catPassed = items.filter((c) => c.passed).length;
    return `### ${cat} (${catPassed}/${items.length})

| Statut | Test | Détail |
|---|---|---|
${items.map((c) => `| ${c.passed ? '✅' : '❌'} | ${c.name} | ${c.detail || '-'} |`).join('\n')}
`;
  })
  .filter(Boolean)
  .join('\n')}

## Screenshots E2E

Tous les screenshots de l'E2E Playwright sont dans \`mobile/tests/screens/sprint1-e2e/\` :

1. \`01-initial.png\` — Expo web chargé
2. \`02-after-login.png\` — Login réussi
3. \`03-home-quick-actions.png\` — Home + 4 quick actions
4. \`04-boutique.png\` — Boutique header marocain
5. \`05-achievements.png\` — Achievements header
6. \`06-community.png\` — Communauté header
7. \`07-nutrition.png\` — Nutrition macros marocaines
8. \`08-recipes.png\` — Recettes badge 🇲🇦
9. \`09-coach.png\` — Coach empty state arabe
10. \`10-profile.png\` — Profile avatar dorée + Modifier
11. \`11-profile-edit.png\` — Form rubriques chips

${failed > 0 ? `
## ⚠️ Failures à corriger

${checks
  .filter((c) => !c.passed)
  .map((c) => `- **[${c.category}] ${c.name}** — ${c.detail}`)
  .join('\n')}
` : ''}

---

*Pour relancer: \`node tests/run-sprint1-tests.mjs\`*
*Pour HEADLESS (CI): \`HEADLESS=1 node tests/run-sprint1-tests.mjs\`*
`;

const reportFile = path.join(REPO_ROOT, 'tests', 'SPRINT_1_TEST_RESULTS.md');
await writeFile(reportFile, md);

console.log(`\n${'═'.repeat(60)}`);
console.log(`📊 RÉSULTATS FINAUX : ${passed}/${total} passed (${failed} failed)`);
console.log(`📄 Rapport markdown : tests/SPRINT_1_TEST_RESULTS.md`);
console.log('═'.repeat(60));

process.exit(failed === 0 ? 0 : 1);
