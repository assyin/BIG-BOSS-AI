import api from './api';

export interface PointsBalance {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  currentStreak: number;
  longestStreak: number;
}

export interface PointTransaction {
  id: string;
  amount: number;
  type: string;
  reason: string;
  balanceAfter: number;
  createdAt: string;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  isActiveToday: boolean;
}

const BASE = '/api/points';

export const PointsService = {
  async getBalance(): Promise<PointsBalance> {
    const res = await api.get<PointsBalance>(`${BASE}/balance`);
    return res.data;
  },

  async getHistory(page = 1, pageSize = 20): Promise<PointTransaction[]> {
    const res = await api.get<PointTransaction[]>(`${BASE}/history`, { params: { page, pageSize } });
    return res.data || [];
  },

  async getMonthlySummary(): Promise<Record<string, number>> {
    const res = await api.get<Record<string, number>>(`${BASE}/summary`);
    return res.data || {};
  },

  async getStreak(): Promise<StreakInfo> {
    const res = await api.get<StreakInfo>(`${BASE}/streak`);
    return res.data;
  },

  async getStreakCalendar(year: number, month: number): Promise<string[]> {
    const res = await api.get<string[]>(`${BASE}/streak/calendar`, { params: { year, month } });
    return res.data || [];
  },
};

export default PointsService;
