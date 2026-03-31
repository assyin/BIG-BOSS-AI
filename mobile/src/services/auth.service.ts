import api, { TokenManager } from './api';
import { ENDPOINTS } from '@/constants/api';
import { AuthResponse, LoginRequest, RegisterRequest, UserProfile, UserStats, UpdateProfileRequest } from '@/types/user.types';

export const AuthService = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(ENDPOINTS.AUTH.REGISTER, data);
    await TokenManager.setTokens(response.data.accessToken, response.data.refreshToken);
    return response.data;
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>(ENDPOINTS.AUTH.LOGIN, data);
    await TokenManager.setTokens(response.data.accessToken, response.data.refreshToken);
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post(ENDPOINTS.AUTH.LOGOUT);
    } finally {
      await TokenManager.clearTokens();
    }
  },

  async checkEmail(email: string): Promise<boolean> {
    const response = await api.get<{ available: boolean }>(ENDPOINTS.AUTH.CHECK_EMAIL, {
      params: { email },
    });
    return response.data.available;
  },

  async getProfile(): Promise<UserProfile> {
    const response = await api.get<UserProfile>(ENDPOINTS.USERS.PROFILE);
    return response.data;
  },

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    const response = await api.put<UserProfile>(ENDPOINTS.USERS.PROFILE, data);
    return response.data;
  },

  async getStats(): Promise<UserStats> {
    const response = await api.get<UserStats>(ENDPOINTS.USERS.STATS);
    return response.data;
  },

  async deleteAccount(): Promise<void> {
    await api.delete(ENDPOINTS.USERS.PROFILE);
    await TokenManager.clearTokens();
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await TokenManager.getAccessToken();
    return !!token;
  },
};

export default AuthService;
