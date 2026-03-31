import api from './api';
import { ENDPOINTS, API_CONFIG } from '@/constants/api';

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
import {
  Session,
  SessionExercise,
  SessionSummary,
  GenerateSessionRequest,
  LogSetRequest,
  SkipExerciseRequest,
} from '@/types/session.types';

export const SessionService = {
  async generateSession(data: GenerateSessionRequest): Promise<Session> {
    const response = await api.post<Session>(ENDPOINTS.SESSIONS.GENERATE, data);
    return fixSessionVideos(response.data);
  },

  async getSessions(page = 1, pageSize = 10): Promise<Session[]> {
    const response = await api.get<any>(ENDPOINTS.SESSIONS.LIST, {
      params: { page, pageSize },
    });
    const data = response.data;
    if (Array.isArray(data)) {
      return data.map(fixSessionVideos);
    }
    if (data.items) {
      return data.items.map(fixSessionVideos);
    }
    return [];
  },

  async getSession(id: string): Promise<Session> {
    const response = await api.get<Session>(ENDPOINTS.SESSIONS.DETAIL(id));
    return fixSessionVideos(response.data);
  },

  async startSession(id: string): Promise<Session> {
    const response = await api.post<Session>(ENDPOINTS.SESSIONS.START(id));
    return response.data;
  },

  async logSet(data: LogSetRequest): Promise<SessionExercise> {
    const response = await api.post<SessionExercise>(ENDPOINTS.SESSIONS.LOG_SET, data);
    return response.data;
  },

  async skipExercise(data: SkipExerciseRequest): Promise<SessionExercise> {
    const response = await api.post<SessionExercise>(ENDPOINTS.SESSIONS.SKIP, data);
    return response.data;
  },

  async completeSession(id: string): Promise<SessionSummary> {
    const response = await api.post<SessionSummary>(ENDPOINTS.SESSIONS.COMPLETE(id));
    return response.data;
  },

  async abandonSession(id: string): Promise<Session> {
    const response = await api.post<Session>(ENDPOINTS.SESSIONS.ABANDON(id));
    return response.data;
  },

  async getCurrentSession(): Promise<Session | null> {
    try {
      const response = await api.get<Session>(ENDPOINTS.SESSIONS.CURRENT);
      // Backend returns 204 NoContent when no active session
      if (response.status === 204 || !response.data) {
        return null;
      }
      return response.data;
    } catch {
      return null;
    }
  },
};

export default SessionService;
