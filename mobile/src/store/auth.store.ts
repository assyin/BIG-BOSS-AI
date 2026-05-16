import { create } from 'zustand';
import { UserBasic, UserProfile, UserStats, LoginRequest, RegisterRequest, UpdateProfileRequest } from '@/types/user.types';
import AuthService from '@/services/auth.service';
import { handleApiError } from '@/services/api';
import NotificationsService from '@/services/notifications.service';

// Fire-and-forget push token registration (non blocking).
function registerPushQuiet() {
  NotificationsService.registerAsync().catch((err) => {
    console.log('[push] register skipped:', err?.message || err);
  });
}

interface AuthState {
  user: UserBasic | null;
  profile: UserProfile | null;
  stats: UserStats | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  loadProfile: () => Promise<void>;
  loadStats: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  deleteAccount: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
}

const extractErrorMessage = (err: unknown, fallback: string): string => {
  const apiError = handleApiError(err);
  return apiError.message || fallback;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  stats: null,
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
      // Load full profile and stats
      await Promise.all([get().loadProfile(), get().loadStats()]);
      // Register push token (non blocking)
      registerPushQuiet();
    } catch (err) {
      const message = extractErrorMessage(err, 'Email ou mot de passe incorrect');
      set({
        isLoading: false,
        error: message,
      });
      throw new Error(message);
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
      // Register push token (non blocking)
      registerPushQuiet();
    } catch (err) {
      const message = extractErrorMessage(err, "Impossible de creer le compte");
      set({
        isLoading: false,
        error: message,
      });
      throw new Error(message);
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
        stats: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  loadProfile: async () => {
    try {
      const profile = await AuthService.getProfile();
      set({
        profile,
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          subscriptionTier: profile.subscriptionTier,
        },
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  },

  loadStats: async () => {
    try {
      const stats = await AuthService.getStats();
      set({ stats });
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  },

  updateProfile: async (data: UpdateProfileRequest) => {
    set({ isLoading: true, error: null });
    try {
      const profile = await AuthService.updateProfile(data);
      set({
        profile,
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          subscriptionTier: profile.subscriptionTier,
        },
        isLoading: false,
      });
    } catch (err) {
      const message = extractErrorMessage(err, 'Impossible de mettre a jour le profil');
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  deleteAccount: async () => {
    set({ isLoading: true });
    try {
      await AuthService.deleteAccount();
      set({
        user: null,
        profile: null,
        stats: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (err) {
      const message = extractErrorMessage(err, 'Impossible de supprimer le compte');
      set({ isLoading: false, error: message });
      throw new Error(message);
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
        // Load stats in background
        get().loadStats();
        // Register push token (non blocking)
        registerPushQuiet();
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
