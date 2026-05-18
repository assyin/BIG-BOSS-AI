import api from './api';
import { API_CONFIG } from '@/constants/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProgrammeStatus = 'Active' | 'Completed' | 'Paused' | 'Abandoned';
export type ProgrammeSessionStatus = 'Planned' | 'InProgress' | 'Completed' | 'Missed' | 'Skipped';

export interface Programme {
  id: string;
  title: string;
  description: string | null;
  type: string;
  durationWeeks: number;
  currentWeek: number;
  split: string;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  mealPlanJson: string | null;
  status: ProgrammeStatus;
  startDate: string;
  endDate: string | null;
  completedSessions: number;
  totalSessions: number;
  progressPercent: number;
  weeklyScheduleJson: string | null;
  programmeSessions: ProgrammeSession[];
}

export interface ProgrammeSession {
  id: string;
  programmeId: string;
  weekNumber: number;
  dayOfWeek: number; // 0=Mon, 6=Sun
  plannedDate: string;
  title: string;
  muscleGroups: string[];
  exercisesJson: string;
  estimatedDuration: number;
  orderInWeek: number;
  sessionId: string | null;
  status: ProgrammeSessionStatus;
  completedAt: string | null;
}

export interface ProgrammeProgress {
  completedSessions: number;
  missedSessions: number;
  totalSessions: number;
  progressPercent: number;
  adherencePercent: number;
  currentWeek: number;
  durationWeeks: number;
}

export interface NutritionPlan {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  mealPlan: any | null;
}

// ---------------------------------------------------------------------------
// URL fix helper (same pattern as session.service.ts)
// ---------------------------------------------------------------------------

function fixUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${API_CONFIG.BASE_URL}${url}`;
  return url;
}

function fixSessionVideos(session: any): any {
  if (session?.exercises) {
    session.exercises = session.exercises.map((ex: any) => ({
      ...ex,
      videoDemoUrl: fixUrl(ex.videoDemoUrl),
      thumbnailUrl: fixUrl(ex.thumbnailUrl) || ex.thumbnailUrl,
    }));
  }
  return session;
}

// Backend renvoie les enums en int (convention projet) → on les remap en string côté client
const PROGRAMME_STATUS_MAP: Record<number, ProgrammeStatus> = {
  1: 'Active',
  2: 'Paused',
  3: 'Completed',
  4: 'Abandoned',
};
const PROGRAMME_SESSION_STATUS_MAP: Record<number, ProgrammeSessionStatus> = {
  1: 'Planned',
  2: 'InProgress',
  3: 'Completed',
  4: 'Missed',
  5: 'Skipped',
};

function mapProgrammeStatus(raw: any): Programme | null {
  if (!raw) return null;
  return {
    ...raw,
    status: typeof raw.status === 'number' ? (PROGRAMME_STATUS_MAP[raw.status] ?? raw.status) : raw.status,
    programmeSessions: (raw.programmeSessions ?? []).map((ps: any) => ({
      ...ps,
      status: typeof ps.status === 'number' ? (PROGRAMME_SESSION_STATUS_MAP[ps.status] ?? ps.status) : ps.status,
    })),
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const BASE = '/api/programmes';

export const ProgrammeService = {
  /**
   * Get the user's currently active programme.
   * Returns null when the backend replies 204 No Content.
   */
  async getActiveProgramme(): Promise<Programme | null> {
    try {
      const response = await api.get<Programme>(`${BASE}/active`);
      if (response.status === 204 || !response.data) return null;
      return mapProgrammeStatus(response.data);
    } catch {
      return null;
    }
  },

  /**
   * Get today's planned session for a programme (or null for rest day / 204).
   */
  async getTodaySession(programmeId: string): Promise<ProgrammeSession | null> {
    try {
      const response = await api.get<ProgrammeSession>(`${BASE}/${programmeId}/today`);
      if (response.status === 204 || !response.data) return null;
      return response.data;
    } catch {
      return null;
    }
  },

  /**
   * Get all sessions for a specific week.
   */
  async getWeekSessions(programmeId: string, weekNumber: number): Promise<ProgrammeSession[]> {
    const response = await api.get<ProgrammeSession[]>(`${BASE}/${programmeId}/week/${weekNumber}`);
    return response.data ?? [];
  },

  /**
   * Get progress stats for the programme.
   */
  async getProgress(programmeId: string): Promise<ProgrammeProgress> {
    const response = await api.get<ProgrammeProgress>(`${BASE}/${programmeId}/progress`);
    return response.data;
  },

  /**
   * Start a programme session -- creates a real Session and returns it.
   */
  async startSession(programmeId: string, psId: string): Promise<any> {
    const response = await api.post(`${BASE}/${programmeId}/sessions/${psId}/start`);
    return fixSessionVideos(response.data);
  },

  /**
   * Generate a new programme based on user profile.
   */
  async generateProgramme(): Promise<Programme> {
    const response = await api.post<Programme>(`${BASE}/generate`);
    return response.data;
  },

  /**
   * Pause the programme.
   */
  async pauseProgramme(programmeId: string): Promise<void> {
    await api.put(`${BASE}/${programmeId}/pause`);
  },

  /**
   * Resume a paused programme.
   */
  async resumeProgramme(programmeId: string): Promise<void> {
    await api.put(`${BASE}/${programmeId}/resume`);
  },

  /**
   * Abandon the programme.
   */
  async abandonProgramme(programmeId: string): Promise<void> {
    await api.put(`${BASE}/${programmeId}/abandon`);
  },

  /**
   * Get the nutrition plan attached to the programme.
   */
  async getNutritionPlan(programmeId: string): Promise<NutritionPlan> {
    const response = await api.get<NutritionPlan>(`${BASE}/${programmeId}/nutrition`);
    return response.data;
  },

  /**
   * Mark a programme session as completed.
   */
  async completeProgrammeSession(programmeId: string, psId: string): Promise<void> {
    await api.post(`${BASE}/${programmeId}/sessions/${psId}/complete`);
  },

  /**
   * Get a specific programme by id.
   */
  async getProgramme(programmeId: string): Promise<Programme> {
    const response = await api.get<Programme>(`${BASE}/${programmeId}`);
    return response.data;
  },
};

export default ProgrammeService;
