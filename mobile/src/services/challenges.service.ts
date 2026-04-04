import api from './api';

export interface ChallengeItem {
  id: string;
  title: string;
  titleAr: string | null;
  description: string;
  type: number;
  metric: number;
  metricName: string;
  metricUnit: string;
  targetValue: number | null;
  pointsForParticipation: number;
  pointsForCompletion: number;
  pointsForTop3: number;
  startDate: string;
  endDate: string;
  imageUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  maxParticipants: number | null;
}

export interface ChallengeParticipation {
  id: string;
  challengeId: string;
  userId: string;
  joinedAt: string;
  currentProgress: number;
  isCompleted: boolean;
  completedAt: string | null;
  finalRank: number | null;
  pointsAwarded: number;
  challenge?: ChallengeItem;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  progress: number;
  isCompleted: boolean;
}

const BASE = '/api/challenges';

export const ChallengesService = {
  async getActive(): Promise<ChallengeItem[]> {
    const res = await api.get<ChallengeItem[]>(BASE);
    return res.data || [];
  },

  async getById(id: string): Promise<ChallengeItem> {
    const res = await api.get<ChallengeItem>(`${BASE}/${id}`);
    return res.data;
  },

  async join(id: string): Promise<ChallengeParticipation> {
    const res = await api.post<ChallengeParticipation>(`${BASE}/${id}/join`);
    return res.data;
  },

  async leave(id: string): Promise<void> {
    await api.post(`${BASE}/${id}/leave`);
  },

  async getMyProgress(id: string): Promise<ChallengeParticipation | null> {
    try {
      const res = await api.get<ChallengeParticipation>(`${BASE}/${id}/my-progress`);
      return res.data;
    } catch { return null; }
  },

  async getLeaderboard(id: string, top = 50): Promise<LeaderboardEntry[]> {
    const res = await api.get<LeaderboardEntry[]>(`${BASE}/${id}/leaderboard`, { params: { top } });
    return res.data || [];
  },

  async getMyChallenges(): Promise<ChallengeParticipation[]> {
    const res = await api.get<ChallengeParticipation[]>(`${BASE}/my-challenges`);
    return res.data || [];
  },
};

export default ChallengesService;
