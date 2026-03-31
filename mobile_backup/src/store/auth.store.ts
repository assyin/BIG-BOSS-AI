import { create } from 'zustand';
import { UserBasic, UserProfile, LoginRequest, RegisterRequest } from '@/types/user.types';
import AuthService from '@/services/auth.service';

interface AuthState {
  user: UserBasic | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  loadProfile: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (data: LoginRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await AuthService.login(data);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
      // Load full profile
      await get().loadProfile();
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Erreur de connexion',
      });
      throw err;
    }
  },

  register: async (data: RegisterRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await AuthService.register(data);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Erreur d'inscription",
      });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await AuthService.logout();
    } finally {
      set({
        user: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  loadProfile: async () => {
    try {
      const profile = await AuthService.getProfile();
      set({ profile });
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    const isAuth = await AuthService.isAuthenticated();
    if (isAuth) {
      try {
        const profile = await AuthService.getProfile();
        set({
          user: {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
            subscriptionTier: profile.subscriptionTier,
          },
          profile,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      } catch {
        set({ isAuthenticated: false, isLoading: false });
        return false;
      }
    }
    set({ isAuthenticated: false, isLoading: false });
    return false;
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
