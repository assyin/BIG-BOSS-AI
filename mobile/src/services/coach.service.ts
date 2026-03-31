import api from './api';
import { ENDPOINTS } from '@/constants/api';

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface CoachQuota {
  used: number;
  limit: number;
  remaining: number;
}

export interface CoachHistoryResponse {
  messages: CoachMessage[];
  totalCount: number;
}

export interface SendMessageResponse {
  userMessage: CoachMessage;
  assistantMessage: CoachMessage;
  quota: CoachQuota;
}

// Map a raw backend message to our CoachMessage type
function mapMessage(raw: any, index?: number): CoachMessage {
  return {
    id: raw.id?.toString() || raw.Id?.toString() || `msg-${index || Date.now()}`,
    role: raw.role === 'assistant' || raw.role === 'Assistant' ? 'assistant' : 'user',
    content: raw.content || raw.Content || '',
    createdAt: raw.createdAt || raw.CreatedAt || new Date().toISOString(),
  };
}

export const CoachService = {
  async sendMessage(content: string): Promise<SendMessageResponse> {
    const response = await api.post(ENDPOINTS.COACH.MESSAGE, { message: content });
    const data = response.data;

    // Backend returns: { message: "AI response text", audioUrl: null, metadata: {...} }
    const aiText = typeof data.message === 'string'
      ? data.message
      : data.message?.content || data.content || '';

    const userMsg: CoachMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    const assistantMsg: CoachMessage = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: aiText,
      createdAt: new Date().toISOString(),
    };

    // Get updated quota
    let quota: CoachQuota;
    try {
      quota = await this.getQuota();
    } catch {
      quota = { used: 0, limit: 50, remaining: 50 };
    }

    return { userMessage: userMsg, assistantMessage: assistantMsg, quota };
  },

  async getHistory(page = 1, pageSize = 20): Promise<CoachHistoryResponse> {
    const response = await api.get(ENDPOINTS.COACH.HISTORY, {
      params: { page, pageSize },
    });
    const data = response.data;
    const rawMessages = data.messages || data.Messages || [];
    const messages = rawMessages.map((m: any, i: number) => mapMessage(m, i));
    return {
      messages,
      totalCount: data.totalCount || data.TotalCount || messages.length,
    };
  },

  async getQuota(): Promise<CoachQuota> {
    const response = await api.get(ENDPOINTS.COACH.QUOTA);
    const data = response.data;
    return {
      used: data.used ?? data.Used ?? 0,
      limit: data.limit ?? data.Limit ?? 20,
      remaining: data.remaining ?? data.Remaining ?? 20,
    };
  },

  async clearHistory(): Promise<void> {
    await api.delete(ENDPOINTS.COACH.CLEAR);
  },
};

export default CoachService;
