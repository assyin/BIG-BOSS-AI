import { create } from 'zustand';
import { Session, SessionExercise, SessionSummary, GenerateSessionRequest, LogSetRequest } from '@/types/session.types';
import SessionService from '@/services/session.service';

interface SessionState {
  currentSession: Session | null;
  activeExerciseIndex: number;
  restTimerSeconds: number;
  isRestTimerActive: boolean;
  isLoading: boolean;
  error: string | null;

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
}

export const useSessionStore = create<SessionState>((set, get) => ({
  currentSession: null,
  activeExerciseIndex: 0,
  restTimerSeconds: 0,
  isRestTimerActive: false,
  isLoading: false,
  error: null,

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

    const updatedExercise = await SessionService.logSet(data);

    // Update session with new exercise data
    const updatedExercises = currentSession.exercises.map((ex) =>
      ex.id === updatedExercise.id ? updatedExercise : ex
    );

    set({
      currentSession: { ...currentSession, exercises: updatedExercises },
    });

    return updatedExercise;
  },

  skipExercise: async (exerciseId: string, reason?: string) => {
    const { currentSession } = get();
    if (!currentSession) throw new Error('No active session');

    const updatedExercise = await SessionService.skipExercise({
      sessionExerciseId: exerciseId,
      reason,
    });

    const updatedExercises = currentSession.exercises.map((ex) =>
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
    if (nextIndex < currentSession.exercises.length) {
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
    set({ currentSession: null, activeExerciseIndex: 0, restTimerSeconds: 0, isRestTimerActive: false });
  },
}));

export default useSessionStore;
