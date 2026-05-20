import { Platform } from 'react-native';
import api from './api';
import Constants from 'expo-constants';

/**
 * Sprint 6.5 — Service feedback in-app.
 */

export interface FeedbackSubmit {
  rating: number;       // 1-5
  category: 'bug' | 'feature' | 'general' | 'praise';
  content: string;
  screenshotBase64?: string;
}

export const FeedbackService = {
  async submit(data: FeedbackSubmit): Promise<{ id: string }> {
    const appVersion = Constants.expoConfig?.version ?? 'dev';
    const deviceInfo = JSON.stringify({
      platform: Platform.OS,
      version: Platform.Version,
    });
    const r = await api.post<{ received: boolean; id: string }>('/api/feedback', {
      ...data,
      appVersion,
      deviceInfo,
    });
    return { id: r.data.id };
  },

  async getMy(): Promise<any[]> {
    const r = await api.get('/api/feedback/my');
    return r.data || [];
  },
};

export default FeedbackService;
