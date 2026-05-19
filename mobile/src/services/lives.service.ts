import api from './api';
import { API_CONFIG } from '@/constants/api';

export interface LiveItem {
  id: string;
  title: string;
  type: number;
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  thumbnailUrl: string | null;
  totalViews: number;
}

export interface LiveDetail extends LiveItem {
  description: string | null;
  streamUrl: string | null;
  replayUrl: string | null;
  chaptersJson: string | null;
  peakViewers: number;
  totalLikes: number;
  totalComments: number;
  generatedSessionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const LIVE_TYPE_LABELS: Record<number, string> = {
  1: 'Workout',
  2: 'Nutrition',
  3: 'Q&A',
  4: 'Résultats Challenge',
  5: 'Masterclass',
};

export const LIVE_TYPE_ICONS: Record<number, string> = {
  1: 'barbell',
  2: 'nutrition',
  3: 'chatbubbles',
  4: 'trophy',
  5: 'school',
};

function fixUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return `${API_CONFIG.BASE_URL}${url}`;
  return url;
}

// Sprint 5.3
export interface LiveStreamInfo {
  liveInputUid: string;
  rtmpUrl?: string;
  rtmpKey?: string;
  hlsUrl: string;
  dashUrl?: string;
  playbackId?: string;
  isMock?: boolean;
}

export interface LiveChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  isFlagged?: boolean;
}

const BASE = '/api/lives';

export const LivesService = {
  async getAll(): Promise<LiveItem[]> {
    const res = await api.get<LiveItem[]>(BASE);
    return (res.data || []).map((l) => ({ ...l, thumbnailUrl: fixUrl(l.thumbnailUrl) }));
  },

  async getUpcoming(count = 10): Promise<LiveItem[]> {
    const res = await api.get<LiveItem[]>(`${BASE}/upcoming`, { params: { count } });
    return (res.data || []).map((l) => ({ ...l, thumbnailUrl: fixUrl(l.thumbnailUrl) }));
  },

  async getById(id: string): Promise<LiveDetail> {
    const res = await api.get<LiveDetail>(`${BASE}/${id}`);
    const live = res.data;
    return {
      ...live,
      thumbnailUrl: fixUrl(live.thumbnailUrl),
      streamUrl: fixUrl(live.streamUrl),
      replayUrl: fixUrl(live.replayUrl),
    };
  },

  // Sprint 5.3 — Admin only
  async startStream(id: string): Promise<LiveStreamInfo> {
    const r = await api.post<LiveStreamInfo>(`${BASE}/${id}/start-stream`);
    return r.data;
  },

  async stopStream(id: string): Promise<void> {
    await api.post(`${BASE}/${id}/stop-stream`);
  },

  async streamStatus(id: string): Promise<{ state: string; liveInputUid?: string; currentViewers?: number }> {
    const r = await api.get(`${BASE}/${id}/stream-status`);
    return r.data;
  },
};

/** URL du Hub SignalR chat live. */
export function getLiveChatHubUrl(): string {
  return `${API_CONFIG.BASE_URL}/hubs/live-chat`;
}

export default LivesService;
