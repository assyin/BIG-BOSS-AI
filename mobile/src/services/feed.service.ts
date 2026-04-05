import api from './api';

export interface FeedPost {
  id: string;
  userId: string;
  userName: string;
  postType: number;
  content: string;
  imageUrl: string | null;
  autoTitle: string | null;
  autoStats: string | null;
  createdAt: string;
  fireCount: number;
  muscleCount: number;
  lightningCount: number;
  trophyCount: number;
  commentCount: number;
  myReaction: number | null;
}

export interface FeedComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export const REACTION_EMOJIS: Record<number, string> = {
  1: '🔥', 2: '💪', 3: '⚡', 4: '🏆',
};

export const POST_TYPE_LABELS: Record<number, string> = {
  1: 'Seance terminee', 2: 'Record battu', 3: 'Badge debloque',
  4: 'Challenge rejoint', 5: 'Challenge termine', 6: 'Photo progression', 10: '',
};

const BASE = '/api/feed';

export const FeedService = {
  async getFeed(page = 1, pageSize = 20): Promise<FeedPost[]> {
    const res = await api.get<FeedPost[]>(BASE, { params: { page, pageSize } });
    return res.data || [];
  },

  async getPost(id: string): Promise<FeedPost> {
    const res = await api.get<FeedPost>(`${BASE}/${id}`);
    return res.data;
  },

  async createPost(content: string, imageUrl?: string): Promise<any> {
    const res = await api.post(BASE, { content, imageUrl });
    return res.data;
  },

  async react(postId: string, type: number): Promise<boolean> {
    const res = await api.post<{ reacted: boolean }>(`${BASE}/${postId}/react`, { type });
    return res.data.reacted;
  },

  async comment(postId: string, content: string): Promise<FeedComment> {
    const res = await api.post<FeedComment>(`${BASE}/${postId}/comment`, { content });
    return res.data;
  },

  async getComments(postId: string, page = 1): Promise<FeedComment[]> {
    const res = await api.get<FeedComment[]>(`${BASE}/${postId}/comments`, { params: { page } });
    return res.data || [];
  },

  async flagPost(postId: string, reason: string): Promise<void> {
    await api.post(`${BASE}/${postId}/flag`, { reason });
  },

  async deletePost(postId: string): Promise<void> {
    await api.delete(`${BASE}/${postId}`);
  },
};

export default FeedService;
