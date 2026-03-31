import api from './api';
import { ENDPOINTS } from '@/constants/api';
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
    return response.data;
  },

  async getSessions(page = 1, pageSize = 10): Promise<Session[]> {
    const response = await api.get<Session[]>(ENDPOINTS.SESSIONS.LIST, {
      params: { page, pageSize },
    });
    return response.data;
  },

  async getSession(id: string): Promise<Session> {
    const response = await api.get<Session>(ENDPOINTS.SESSIONS.DETAIL(id));
    return response.data;
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
      return response.data;
    } catch {
      return null;
    }
  },
};

export default SessionService;
