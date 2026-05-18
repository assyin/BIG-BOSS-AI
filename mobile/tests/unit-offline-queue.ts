/**
 * Sprint 3.2 — Unit tests offline-queue.
 *
 * Run: cd mobile && npx tsx tests/unit-offline-queue.ts
 *
 * Note: SecureStore est mocké via interception Module._load avant le require.
 */

// ─── Mock SecureStore avant import ────────────────────────────
import { Module } from 'node:module';

const storage = new Map<string, string>();
const secureStoreMock = {
  getItemAsync: async (k: string) => storage.get(k) ?? null,
  setItemAsync: async (k: string, v: string) => { storage.set(k, v); },
  deleteItemAsync: async (k: string) => { storage.delete(k); },
};

const Module2: any = Module;
const realLoad = Module2._load;
Module2._load = function (req: string, ...rest: any[]) {
  if (req === 'expo-secure-store') return secureStoreMock;
  return realLoad.call(this, req, ...rest);
};

async function main(): Promise<void> {
  const { default: OfflineQueue } = await import('../src/utils/offline-queue');

  const results: { name: string; passed: boolean; error?: string }[] = [];

  async function test(name: string, fn: () => Promise<void> | void): Promise<void> {
    try {
      await fn();
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

  console.log('\n=== offline-queue.ts ===\n');

  await test('generateUuid format v4 valide', () => {
    const uuid = OfflineQueue.generateUuid();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) {
      throw new Error(`invalid uuid: ${uuid}`);
    }
  });

  await test('enqueue ajoute une op', async () => {
    await OfflineQueue.clear();
    await OfflineQueue.enqueue({ id: 'a', type: 'log_set', payload: { x: 1 } });
    assertEq(await OfflineQueue.getCount(), 1);
  });

  await test('enqueue dédupe par id (replay safe)', async () => {
    await OfflineQueue.clear();
    await OfflineQueue.enqueue({ id: 'a', type: 'log_set', payload: { x: 1 } });
    await OfflineQueue.enqueue({ id: 'a', type: 'log_set', payload: { x: 2 } });
    assertEq(await OfflineQueue.getCount(), 1, 'doublon ignoré');
  });

  await test('getAll retourne dans l\'ordre d\'insertion', async () => {
    await OfflineQueue.clear();
    await OfflineQueue.enqueue({ id: 'first', type: 'log_set', payload: {} });
    await OfflineQueue.enqueue({ id: 'second', type: 'log_set', payload: {} });
    const all = await OfflineQueue.getAll();
    assertEq(all[0].id, 'first');
    assertEq(all[1].id, 'second');
  });

  await test('remove cible le bon id', async () => {
    await OfflineQueue.clear();
    await OfflineQueue.enqueue({ id: 'a', type: 'log_set', payload: {} });
    await OfflineQueue.enqueue({ id: 'b', type: 'log_set', payload: {} });
    await OfflineQueue.remove('a');
    const all = await OfflineQueue.getAll();
    assertEq(all.length, 1);
    assertEq(all[0].id, 'b');
  });

  await test('incrementAttempt incrémente le compteur', async () => {
    await OfflineQueue.clear();
    await OfflineQueue.enqueue({ id: 'x', type: 'log_set', payload: {} });
    await OfflineQueue.incrementAttempt('x');
    await OfflineQueue.incrementAttempt('x');
    const all = await OfflineQueue.getAll();
    assertEq(all[0].attempts, 2);
  });

  await test('dropForSession filtre par sessionId', async () => {
    await OfflineQueue.clear();
    await OfflineQueue.enqueue({ id: 'a', type: 'log_set', payload: {}, sessionId: 's1' });
    await OfflineQueue.enqueue({ id: 'b', type: 'log_set', payload: {}, sessionId: 's2' });
    await OfflineQueue.enqueue({ id: 'c', type: 'log_set', payload: {}, sessionId: 's1' });
    const dropped = await OfflineQueue.dropForSession('s1');
    assertEq(dropped, 2);
    assertEq(await OfflineQueue.getCount(), 1);
  });

  await test('clear vide la queue', async () => {
    await OfflineQueue.enqueue({ id: 'foo', type: 'log_set', payload: {} });
    await OfflineQueue.clear();
    assertEq(await OfflineQueue.getCount(), 0);
  });

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`\n${passed === total ? '✅' : '❌'} offline-queue: ${passed}/${total}\n`);

  if (passed !== total) process.exit(1);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
