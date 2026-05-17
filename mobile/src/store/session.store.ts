import { create } from 'zustand';
import { Session, SessionExercise, SessionSummary, GenerateSessionRequest, LogSetRequest } from '@/types/session.types';
import SessionService from '@/services/session.service';
import OfflineQueue from '@/utils/offline-queue';

interface SessionState {
  currentSession: Session | null;
  activeExerciseIndex: number;
  restTimerSeconds: number;
  isRestTimerActive: boolean;
  isLoading: boolean;
  error: string | null;

  // Programme context (set when starting a programme session)
  programmeContext: { programmeId: string; programmeSessionId: string } | null;

  // Sprint 3.2 — offline sync state
  pendingOpsCount: number;
  isSyncing: boolean;

  // Actions
  generateSession: (request: GenerateSessionRequest) => Promise<Session>;
  loadCurrentSession: () => Promise<void>;
  startSession: (sessionId: string) => Promise<void>;
  logSet: (data: LogSetRequest) => Promise<SessionExercise>;
  skipExercise: (exerciseId: string, reason?: string) => Promise<void>;
  nextExercise: () => void;
  previousExercise: () => void;
  completeSession: () => Promise<SessionSummary>;
  abandonSession: () => Promise<void>;
  startRestTimer: (seconds: number) => void;
  stopRestTimer: () => void;
  clearSession: () => void;
  // Sprint 3.2
  syncPendingOps: () => Promise<{ synced: number; failed: number }>;
  refreshPendingCount: () => Promise<void>;
}

// Sprint 3.2 — détecte une erreur réseau (offline) vs erreur métier
function isNetworkError(err: any): boolean {
  if (!err) return false;
  // Axios offline: no response + ECONNABORTED, ENETUNREACH, ERR_NETWORK
  if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || err.code === 'ENETUNREACH') return true;
  if (err.message && /network|timeout|fetch|aborted/i.test(err.message)) return true;
  // Pas de response = pas atteint le serveur
  if (!err.response) return true;
  // 5xx = serveur planté = retry
  if (err.response.status >= 500) return true;
  return false;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  currentSession: null,
  activeExerciseIndex: 0,
  restTimerSeconds: 0,
  isRestTimerActive: false,
  isLoading: false,
  error: null,
  programmeContext: null,
  pendingOpsCount: 0,
  isSyncing: false,

  generateSession: async (request: GenerateSessionRequest) => {
    set({ isLoading: true, error: null });
    try {
      const session = await SessionService.generateSession(request);
      set({ currentSession: session, isLoading: false, activeExerciseIndex: 0 });
      return session;
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Erreur de generation',
      });
      throw err;
    }
  },

  loadCurrentSession: async () => {
    set({ isLoading: true });
    try {
      const session = await SessionService.getCurrentSession();
      if (session) {
        set({ currentSession: session, isLoading: false });
      } else {
        set({ currentSession: null, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  startSession: async (sessionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const session = await SessionService.startSession(sessionId);
      set({ currentSession: session, isLoading: false, activeExerciseIndex: 0 });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Erreur de demarrage',
      });
      throw err;
    }
  },

  logSet: async (data: LogSetRequest) => {
    const { currentSession } = get();
    if (!currentSession) throw new Error('No active session');

    // Sprint 3.2 — toujours assigner un clientUuid pour idempotence
    const clientUuid = data.clientUuid || OfflineQueue.generateUuid();
    const payload = { ...data, clientUuid };

    try {
      const updatedExercise = await SessionService.logSet(payload);

      // Update session with new exercise data
      const updatedExercises = (currentSession.exercises || []).map((ex) =>
        ex.id === updatedExercise.id ? updatedExercise : ex
      );
      set({ currentSession: { ...currentSession, exercises: updatedExercises } });

      // Si on était offline et qu'on revient online, profiter pour replay les ops en attente
      const pendingCount = await OfflineQueue.getCount();
      if (pendingCount > 0) {
        get().syncPendingOps().catch(() => {});
      }

      return updatedExercise;
    } catch (err: any) {
      if (isNetworkError(err)) {
        // Offline ou serveur down → enqueue + optimistic local update
        await OfflineQueue.enqueue({
          id: clientUuid,
          type: 'log_set',
          payload,
          sessionId: currentSession.id,
        });
        await get().refreshPendingCount();

        // Optimistic local update (append au completedSets)
        const updatedExercises = (currentSession.exercises || []).map((ex) => {
          if (ex.id !== data.sessionExerciseId) return ex;
          const existing = ex.completedSets || [];
          return {
            ...ex,
            completedSets: [
              ...existing,
              {
                setNumber: existing.length + 1,
                reps: data.reps,
                weightKg: data.weightKg,
                formScore: data.formScore ?? null,
              },
            ],
          } as SessionExercise;
        });
        set({ currentSession: { ...currentSession, exercises: updatedExercises } });

        // Retourner la version optimistic
        const local = updatedExercises.find((ex) => ex.id === data.sessionExerciseId);
        return local as SessionExercise;
      }
      throw err;
    }
  },

  skipExercise: async (exerciseId: string, reason?: string) => {
    const { currentSession } = get();
    if (!currentSession) throw new Error('No active session');

    const updatedExercise = await SessionService.skipExercise({
      sessionExerciseId: exerciseId,
      reason,
    });

    const updatedExercises = (currentSession.exercises || []).map((ex) =>
      ex.id === updatedExercise.id ? updatedExercise : ex
    );

    set({
      currentSession: { ...currentSession, exercises: updatedExercises },
    });

    // Move to next exercise
    get().nextExercise();
  },

  nextExercise: () => {
    const { currentSession, activeExerciseIndex } = get();
    if (!currentSession) return;

    const nextIndex = activeExerciseIndex + 1;
    if (nextIndex < (currentSession.exercises || []).length) {
      set({ activeExerciseIndex: nextIndex });
    }
  },

  previousExercise: () => {
    const { activeExerciseIndex } = get();
    if (activeExerciseIndex > 0) {
      set({ activeExerciseIndex: activeExerciseIndex - 1 });
    }
  },

  completeSession: async () => {
    const { currentSession } = get();
    if (!currentSession) throw new Error('No active session');

    set({ isLoading: true });
    try {
      const summary = await SessionService.completeSession(currentSession.id);
      set({ currentSession: null, isLoading: false, activeExerciseIndex: 0 });
      return summary;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  abandonSession: async () => {
    const { currentSession } = get();
    if (!currentSession) return;

    await SessionService.abandonSession(currentSession.id);
    set({ currentSession: null, activeExerciseIndex: 0 });
  },

  startRestTimer: (seconds: number) => {
    set({ restTimerSeconds: seconds, isRestTimerActive: true });
  },

  stopRestTimer: () => {
    set({ restTimerSeconds: 0, isRestTimerActive: false });
  },

  clearSession: () => {
    set({ currentSession: null, activeExerciseIndex: 0, restTimerSeconds: 0, isRestTimerActive: false, programmeContext: null });
  },

  // Sprint 3.2 — replay des ops offline en série
  syncPendingOps: async () => {
    const { isSyncing } = get();
    if (isSyncing) return { synced: 0, failed: 0 };

    set({ isSyncing: true });
    let synced = 0;
    let failed = 0;

    try {
      const ops = await OfflineQueue.getAll();
      for (const op of ops) {
        try {
          if (op.type === 'log_set') {
            await SessionService.logSet(op.payload as LogSetRequest);
            await OfflineQueue.remove(op.id);
            synced++;
          } else if (op.type === 'skip_exercise') {
            await SessionService.skipExercise(op.payload as any);
            await OfflineQueue.remove(op.id);
            synced++;
          }
        } catch (err: any) {
          if (isNetworkError(err)) {
            // Toujours offline — on s'arrête (les ops suivantes resteront en queue)
            await OfflineQueue.incrementAttempt(op.id);
            failed++;
            break;
          } else if (err?.response?.status === 404 || err?.response?.status === 400) {
            // Op invalide (session supprimée ou data corrompue) → drop
            await OfflineQueue.remove(op.id);
            failed++;
          } else {
            await OfflineQueue.incrementAttempt(op.id);
            failed++;
            // 5xx → on tente la suivante (peut-être qu'un endpoint marche)
          }
        }
      }

      // Recharger la session pour refléter le serveur
      if (synced > 0) {
        try { await get().loadCurrentSession(); } catch { /* ignore */ }
      }
    } finally {
      await get().refreshPendingCount();
      set({ isSyncing: false });
    }

    return { synced, failed };
  },

  refreshPendingCount: async () => {
    const count = await OfflineQueue.getCount();
    set({ pendingOpsCount: count });
  },
}));

export default useSessionStore;
