import api from './api';
import { API_CONFIG } from '@/constants/api';

export interface ShopReward {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  category: number;
  pointsCost: number;
  realValueMad: number | null;
  stock: number | null;
  maxPerUser: number | null;
  isActive: boolean;
  isFeatured: boolean;
  redemptionInstructions: string | null;
}

export interface RewardRedemption {
  id: string;
  shopRewardId: string;
  pointsSpent: number;
  status: string;
  redemptionCode: string | null;
  createdAt: string;
  shopReward?: ShopReward;
}

const CATEGORY_LABELS: Record<number, string> = {
  1: 'Reduction', 2: 'Produit', 3: 'Digital', 4: 'Abonnement', 5: 'Experience',
};

export { CATEGORY_LABELS };

const BASE = '/api/shop';

export const ShopService = {
  async getRewards(category?: number): Promise<ShopReward[]> {
    const res = await api.get<ShopReward[]>(`${BASE}/rewards`, { params: category ? { category } : {} });
    return (res.data || []).map(r => ({ ...r, imageUrl: r.imageUrl ? (r.imageUrl.startsWith('http') ? r.imageUrl : `${API_CONFIG.BASE_URL}${r.imageUrl}`) : null }));
  },

  async getReward(id: string): Promise<ShopReward> {
    const res = await api.get<ShopReward>(`${BASE}/rewards/${id}`);
    return res.data;
  },

  async redeem(rewardId: string, shippingAddress?: string): Promise<RewardRedemption> {
    const res = await api.post<RewardRedemption>(`${BASE}/redeem`, { rewardId, shippingAddress });
    return res.data;
  },

  async getRedemptions(): Promise<RewardRedemption[]> {
    const res = await api.get<RewardRedemption[]>(`${BASE}/redemptions`);
    return res.data || [];
  },
};

export default ShopService;
