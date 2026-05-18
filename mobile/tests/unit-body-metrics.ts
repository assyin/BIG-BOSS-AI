/**
 * Sprint 3.4 — Unit tests body-metrics.
 *
 * Run: cd mobile && npx tsx tests/unit-body-metrics.ts
 */
import { calcIMC, calcFFMI, targetWeightForImc } from '../src/utils/body-metrics';

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

function assertEq<T>(actual: T, expected: T, msg = ''): void {
  if (actual !== expected) throw new Error(`${msg} expected ${expected} got ${actual}`);
}

function assertApprox(actual: number, expected: number, tolerance = 0.5): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`expected ~${expected} (±${tolerance}) got ${actual}`);
  }
}

console.log('\n=== body-metrics.ts ===\n');

// ─── IMC ──────────────────────────────────────────────────
test('calcIMC(70, 175) = 22.9 normal', () => {
  const r = calcIMC(70, 175);
  if (!r) throw new Error('null result');
  assertApprox(r.value, 22.9, 0.1);
  assertEq(r.category, 'normal');
});

test('calcIMC(50, 175) underweight', () => {
  const r = calcIMC(50, 175)!;
  assertEq(r.category, 'underweight');
});

test('calcIMC(90, 175) overweight', () => {
  const r = calcIMC(90, 175)!;
  assertEq(r.category, 'overweight');
});

test('calcIMC(110, 175) obese', () => {
  const r = calcIMC(110, 175)!;
  assertEq(r.category, 'obese');
});

test('calcIMC(0, 175) = null', () => {
  if (calcIMC(0, 175) !== null) throw new Error('should be null');
});

test('calcIMC(70, 0) = null', () => {
  if (calcIMC(70, 0) !== null) throw new Error('should be null');
});

test('calcIMC label darija présent', () => {
  const r = calcIMC(70, 175)!;
  if (!r.labelAr || r.labelAr.length === 0) throw new Error('labelAr missing');
});

// ─── FFMI ─────────────────────────────────────────────────
test('calcFFMI(70, 175, 15) ≈ 19.4 good', () => {
  const r = calcFFMI(70, 175, 15);
  if (!r) throw new Error('null result');
  assertApprox(r.value, 19.4, 0.3);
  assertEq(r.category, 'good');
});

test('calcFFMI(70, 175, null) = null', () => {
  // @ts-expect-error testing null
  if (calcFFMI(70, 175, null) !== null) throw new Error('should be null');
});

test('calcFFMI(70, 175, 0) = null (bodyFat invalide)', () => {
  if (calcFFMI(70, 175, 0) !== null) throw new Error('should be null');
});

test('calcFFMI très haut → elite', () => {
  const r = calcFFMI(110, 175, 5);
  if (!r) throw new Error('null');
  if (!['high', 'elite'].includes(r.category)) {
    throw new Error(`expected high/elite got ${r.category}`);
  }
});

// ─── targetWeight ─────────────────────────────────────────
test('targetWeightForImc(175, 22) ≈ 67.4', () => {
  const r = targetWeightForImc(175, 22);
  if (r === null) throw new Error('null');
  assertApprox(r, 67.4, 0.1);
});

test('targetWeightForImc(0, 22) = null', () => {
  if (targetWeightForImc(0, 22) !== null) throw new Error('should be null');
});

// ─── Summary ──────────────────────────────────────────────
const passed = results.filter((r) => r.passed).length;
const total = results.length;
console.log(`\n${passed === total ? '✅' : '❌'} body-metrics: ${passed}/${total}\n`);

if (passed !== total) process.exit(1);
