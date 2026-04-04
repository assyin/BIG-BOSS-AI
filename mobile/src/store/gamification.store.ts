import { create } from 'zustand';
import PointsService, { PointsBalance, StreakInfo } from '@/services/points.service';

interface GamificationState {
  balance: PointsBalance | null;
  streak: StreakInfo | null;
  loading: boolean;

  loadGamification: () => Promise<void>;
}

export const useGamificationStore = create<GamificationState>((set) => ({
  balance: null,
  streak: null,
  loading: false,

  loadGamification: async () => {
    set({ loading: true });
    try {
      const [balance, streak] = await Promise.all([
        PointsService.getBalance(),
        PointsService.getStreak(),
      ]);
      set({ balance, streak, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
