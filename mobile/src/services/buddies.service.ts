import api from './api';

/**
 * Sprint 5.2 — Service Gym Buddies matching.
 */

export interface BuddyProfile {
  hasProfile: boolean;
  bio?: string;
  city?: string;
  gymName?: string | null;
  goals?: string[];
  availableSlots?: string[];
  preferredLanguage?: string | null;
  visible?: boolean;
}

export interface BuddyRecommendation {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  bio: string;
  city: string;
  gymName?: string | null;
  goals: string[];
  availableSlots: string[];
  matchScore: number;
  matchReasons: string[];
  level?: string | null;
  isConnected: boolean;
  requestPending: boolean;
}

export interface BuddyConnection {
  connectionId: string;
  otherUserId: string;
  otherUserName: string;
  otherAvatarUrl?: string | null;
  otherCity?: string | null;
  status: number;        // 1=Pending, 2=Accepted, 3=Declined, 4=Blocked
  isIncoming: boolean;
  message?: string | null;
  createdAt: string;
}

export const SLOT_LABELS: Record<string, string> = {
  weekday_morning: 'Sem. matin',
  weekday_evening: 'Sem. soir',
  weekday_lunch: 'Sem. midi',
  weekend_morning: 'WE matin',
  weekend_afternoon: 'WE après-midi',
};

export const GOAL_LABELS: Record<string, string> = {
  BuildMuscle: 'Muscle',
  LoseWeight: 'Perte poids',
  Performance: 'Performance',
  Endurance: 'Endurance',
  Mobility: 'Mobilité',
  Maintain: 'Maintien',
};

const BASE = '/api/buddies';

export const BuddiesService = {
  async getMyProfile(): Promise<BuddyProfile> {
    const r = await api.get<BuddyProfile>(`${BASE}/me`);
    return r.data;
  },

  async upsertMyProfile(data: {
    bio: string;
    city: string;
    gymName?: string | null;
    goals: string[];
    availableSlots: string[];
    preferredLanguage?: string | null;
    visible: boolean;
  }): Promise<void> {
    await api.put(`${BASE}/me`, data);
  },

  async getRecommended(count = 20): Promise<BuddyRecommendation[]> {
    const r = await api.get<BuddyRecommendation[]>(`${BASE}/recommended?count=${count}`);
    return r.data || [];
  },

  async connect(userId: string, message?: string): Promise<{ connectionId: string; status: string; autoAccepted: boolean }> {
    const r = await api.post(`${BASE}/connect/${userId}`, message ? { message } : {});
    return r.data;
  },

  async respond(connectionId: string, accept: boolean): Promise<void> {
    await api.post(`${BASE}/connections/${connectionId}/respond?accept=${accept}`);
  },

  async getMyConnections(): Promise<BuddyConnection[]> {
    const r = await api.get<BuddyConnection[]>(`${BASE}/my`);
    return r.data || [];
  },

  async getPendingRequests(): Promise<BuddyConnection[]> {
    const r = await api.get<BuddyConnection[]>(`${BASE}/pending`);
    return r.data || [];
  },
};

export default BuddiesService;
