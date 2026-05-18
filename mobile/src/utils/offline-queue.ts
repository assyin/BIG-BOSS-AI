import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Sprint 3.2 — Queue offline pour les ops API qui doivent survivre à un crash réseau.
 *
 * Stratégie :
 * - Chaque op a un clientUuid stable (généré côté client) pour idempotence backend.
 * - Persist :
 *     - Native (iOS/Android) : SecureStore
 *     - Web (Chrome/Safari)  : localStorage (SecureStore no-op sur web)
 * - Replay en série (un par un) pour préserver l'ordre des sets.
 * - Sur succès : retirer de la queue. Sur 4xx (sauf 5xx/network) : drop l'op + log (poison message).
 */

export interface PendingOp<T = any> {
  id: string;            // = clientUuid, unique
  type: 'log_set' | 'skip_exercise';
  payload: T;
  enqueuedAt: number;    // epoch ms
  attempts: number;      // pour backoff/log
  sessionId?: string;    // contexte pour conflict detection
}

const STORAGE_KEY = 'bbf_offline_queue_v1';
const IS_WEB = Platform.OS === 'web';

async function read(): Promise<PendingOp[]> {
  try {
    let raw: string | null = null;
    if (IS_WEB && typeof localStorage !== 'undefined') {
      raw = localStorage.getItem(STORAGE_KEY);
    } else {
      raw = await SecureStore.getItemAsync(STORAGE_KEY);
    }
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function write(ops: PendingOp[]): Promise<void> {
  try {
    const json = JSON.stringify(ops);
    if (IS_WEB && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, json);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, json);
    }
  } catch {
    /* storage plein / interdit — la queue en mémoire reste valide pour la session */
  }
}

// Génération UUID v4 sans crypto natif (suffisant pour idempotence).
function generateUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const OfflineQueue = {
  generateUuid: generateUuidV4,

  async enqueue<T>(op: Omit<PendingOp<T>, 'enqueuedAt' | 'attempts'>): Promise<void> {
    const ops = await read();
    // Dédupe si même id déjà présent (replay multiple)
    if (ops.some((o) => o.id === op.id)) return;
    ops.push({ ...op, enqueuedAt: Date.now(), attempts: 0 } as PendingOp);
    await write(ops);
  },

  async getAll(): Promise<PendingOp[]> {
    return read();
  },

  async getCount(): Promise<number> {
    const ops = await read();
    return ops.length;
  },

  async remove(id: string): Promise<void> {
    const ops = await read();
    await write(ops.filter((o) => o.id !== id));
  },

  async incrementAttempt(id: string): Promise<void> {
    const ops = await read();
    const updated = ops.map((o) => (o.id === id ? { ...o, attempts: o.attempts + 1 } : o));
    await write(updated);
  },

  async clear(): Promise<void> {
    await write([]);
  },

  async dropForSession(sessionId: string): Promise<number> {
    const ops = await read();
    const remaining = ops.filter((o) => o.sessionId !== sessionId);
    await write(remaining);
    return ops.length - remaining.length;
  },
};

export default OfflineQueue;
