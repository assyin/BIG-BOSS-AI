export type SubscriptionTier = 'Free' | 'Premium' | 'Elite';
export type UserGoal = 'BuildMuscle' | 'LoseFat' | 'BuildStrength' | 'Endurance' | 'Maintenance' | 'Recomposition';
export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
export type Gender = 'male' | 'female' | 'other';
export type Language = 'fr' | 'ar' | 'darija';

export interface UserBasic {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  subscriptionTier: SubscriptionTier;
}

export interface UserProfile extends UserBasic {
  phone: string | null;
  birthDate: string | null;
  weightKg: number | null;
  heightCm: number | null;
  gender: Gender | null;
  goal: UserGoal;
  level: DifficultyLevel;
  subscriptionExpiresAt: string | null;
  preferredLanguage: Language;
  notificationsEnabled: boolean;
  createdAt: string;
  stats: UserStats;
}

export interface UserStats {
  totalSessions: number;
  totalExercisesCompleted: number;
  totalVolumeKg: number;
  currentStreak: number;
  longestStreak: number;
  personalRecordsCount: number;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  birthDate?: string;
  weightKg?: number;
  heightCm?: number;
  gender?: Gender;
  goal?: UserGoal | number;
  level?: DifficultyLevel | number;
  availableEquipment?: number;
  preferredLanguage?: Language;
  notificationsEnabled?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: UserBasic;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
}
