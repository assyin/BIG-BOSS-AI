import api, { TokenManager } from './api';
import { ENDPOINTS } from '@/constants/api';
import { AuthResponse, LoginRequest, RegisterRequest, UserProfile } from '@/types/user.types';

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

  async isAuthenticated(): Promise<boolean> {
    const token = await TokenManager.getAccessToken();
    return !!token;
  },
};

export default AuthService;
