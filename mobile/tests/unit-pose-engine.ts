/**
 * Sprint 1.4 — Unit tests pour pose-engine.
 *
 * Run: cd mobile && npx tsx tests/unit-pose-engine.ts
 *
 * Pas de framework de test pour rester léger — un mini runner suffit.
 */
import {
  calculateAngle,
  EXERCISE_CONFIGS,
  KEYPOINTS,
  type Keypoint,
} from '../src/utils/pose-engine';

// ─── Mini test runner ────────────────────────────────────────
const results: { name: string; passed: boolean; error?: string }[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    results.push({ name, passed: false, error: e?.message });
    console.log(`  ✗ ${name}`);
    console.log(`      ${e?.message}`);
  }
}

function assertApprox(actual: number, expected: number, tolerance = 1): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Expected ${expected} ±${tolerance}, got ${actual}`);
  }
}

function assertEqual<T>(actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ─── Helper: keypoint avec score 1.0 ──────────────────────────
function kp(x: number, y: number, score = 1.0): Keypoint {
  return { x, y, score };
}

// ─── 17-point pose builder for testing ────────────────────────
function buildPose(overrides: Partial<Record<number, Keypoint>> = {}): Keypoint[] {
  // Default visible pose centered around (300, 400)
  const defaults: Keypoint[] = new Array(17).fill(null).map((_, i) => kp(300, 400 - i * 20));
  for (const [idx, point] of Object.entries(overrides)) {
    defaults[Number(idx)] = point!;
  }
  return defaults;
}

// ═══════════════════════════════════════════════════════════════
console.log('\n📐 calculateAngle()');
// ═══════════════════════════════════════════════════════════════

test('angle 90° pour vecteurs perpendiculaires', () => {
  // Vertex (0,0), point A à droite (10,0), point C en haut (0,10)
  const angle = calculateAngle(kp(10, 0), kp(0, 0), kp(0, 10));
  assertApprox(angle, 90, 1);
});

test('angle 180° pour 3 points alignés horizontalement', () => {
  const angle = calculateAngle(kp(-10, 0), kp(0, 0), kp(10, 0));
  assertApprox(angle, 180, 1);
});

test('angle 0° pour 3 points superposés au même endroit', () => {
  // Cas dégénéré — calculateAngle retourne 0 pour vecteurs nuls
  const angle = calculateAngle(kp(10, 0), kp(0, 0), kp(10, 0));
  assertApprox(angle, 0, 1);
});

test('angle ~45° pour vecteurs à 45°', () => {
  // Vertex (0,0), A à (10,0), C à (10,10) → angle 45°
  const angle = calculateAngle(kp(10, 0), kp(0, 0), kp(10, 10));
  assertApprox(angle, 45, 2);
});

// ═══════════════════════════════════════════════════════════════
console.log('\n🏋️ EXERCISE_CONFIGS.squat — detectRep cycle');
// ═══════════════════════════════════════════════════════════════

// Squat config: phase=down si kneeAngle < 120, up sinon. Compte si prev=down + new=up
test('squat: position debout (genou tendu) → phase=up, no count', () => {
  // Hanche en haut (y=200), genou au milieu (y=400), cheville en bas (y=600)
  // Angle hip-knee-ankle ≈ 180° (jambe tendue)
  const pose = buildPose({
    [KEYPOINTS.LEFT_HIP]: kp(300, 200),
    [KEYPOINTS.LEFT_KNEE]: kp(300, 400),
    [KEYPOINTS.LEFT_ANKLE]: kp(300, 600),
  });
  const result = EXERCISE_CONFIGS.squat.detectRep(pose, 'neutral');
  assertEqual(result.phase, 'up');
  assertEqual(result.counted, false);
});

test('squat: position basse (genou plié) → phase=down', () => {
  // Genou plié à 90° : hip+knee à même x, ankle décalé
  const pose = buildPose({
    [KEYPOINTS.LEFT_HIP]: kp(300, 350),
    [KEYPOINTS.LEFT_KNEE]: kp(300, 500),
    [KEYPOINTS.LEFT_ANKLE]: kp(450, 500), // pied avancé → angle < 120°
  });
  const result = EXERCISE_CONFIGS.squat.detectRep(pose, 'up');
  assertEqual(result.phase, 'down');
  assertEqual(result.counted, false);
});

test('squat: down → up = 1 rep comptée', () => {
  // Remonter depuis position basse
  const upPose = buildPose({
    [KEYPOINTS.LEFT_HIP]: kp(300, 200),
    [KEYPOINTS.LEFT_KNEE]: kp(300, 400),
    [KEYPOINTS.LEFT_ANKLE]: kp(300, 600),
  });
  const result = EXERCISE_CONFIGS.squat.detectRep(upPose, 'down');
  assertEqual(result.phase, 'up');
  assertEqual(result.counted, true);
});

test('squat: keypoints invisibles → no count', () => {
  const pose = buildPose({
    [KEYPOINTS.LEFT_HIP]: kp(300, 200, 0.1), // score trop bas
    [KEYPOINTS.LEFT_KNEE]: kp(300, 400, 0.1),
    [KEYPOINTS.LEFT_ANKLE]: kp(300, 600, 0.1),
  });
  const result = EXERCISE_CONFIGS.squat.detectRep(pose, 'down');
  assertEqual(result.counted, false);
});

// ═══════════════════════════════════════════════════════════════
console.log('\n💪 EXERCISE_CONFIGS.squat — checkPoints feedback');
// ═══════════════════════════════════════════════════════════════

test('squat checkPoints: position debout → feedback "Position debout"', () => {
  const pose = buildPose({
    [KEYPOINTS.LEFT_SHOULDER]: kp(300, 100),
    [KEYPOINTS.LEFT_HIP]: kp(300, 300),
    [KEYPOINTS.LEFT_KNEE]: kp(300, 500),
    [KEYPOINTS.LEFT_ANKLE]: kp(300, 700),
  });
  const feedback = EXERCISE_CONFIGS.squat.checkPoints(pose);
  const messages = feedback.map((f) => f.message);
  if (!messages.some((m) => m.includes('debout'))) {
    throw new Error(`Expected "debout" in feedback, got: ${messages.join(' | ')}`);
  }
});

test('squat checkPoints: vide si keypoints invisibles', () => {
  const pose = buildPose({
    [KEYPOINTS.LEFT_HIP]: kp(0, 0, 0.1),
    [KEYPOINTS.LEFT_KNEE]: kp(0, 0, 0.1),
    [KEYPOINTS.LEFT_ANKLE]: kp(0, 0, 0.1),
  });
  const feedback = EXERCISE_CONFIGS.squat.checkPoints(pose);
  assertEqual(feedback.length, 0);
});

// ═══════════════════════════════════════════════════════════════
console.log('\n🤸 EXERCISE_CONFIGS — coverage');
// ═══════════════════════════════════════════════════════════════

test('20 exercices configurés au minimum', () => {
  const count = Object.keys(EXERCISE_CONFIGS).length;
  if (count < 20) {
    throw new Error(`Attendu ≥20 exercices, trouvé ${count}`);
  }
});

test('chaque exercice a checkPoints + detectRep + name', () => {
  for (const [key, config] of Object.entries(EXERCISE_CONFIGS)) {
    if (typeof config.checkPoints !== 'function') throw new Error(`${key}.checkPoints manquant`);
    if (typeof config.detectRep !== 'function') throw new Error(`${key}.detectRep manquant`);
    if (!config.name || typeof config.name !== 'string') throw new Error(`${key}.name manquant`);
  }
});

// ═══════════════════════════════════════════════════════════════
// Final report
// ═══════════════════════════════════════════════════════════════
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;

console.log('\n' + '═'.repeat(60));
console.log(`pose-engine tests: ${passed}/${results.length} passed, ${failed} failed`);
console.log('═'.repeat(60));

if (failed > 0) {
  console.log('\nFailures:');
  for (const r of results.filter((r) => !r.passed)) {
    console.log(`  - ${r.name}: ${r.error}`);
  }
  process.exit(1);
}
process.exit(0);
