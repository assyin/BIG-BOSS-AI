import { Platform } from 'react-native';

// API Configuration
// For physical Android device: use your machine's LAN IP (run `hostname -I` to find it)
const DEV_API_HOST = Platform.OS === 'android' ? '192.168.100.213' : 'localhost';

export const API_CONFIG = {
  // Base URL - change DEV_API_HOST above when your IP changes
  BASE_URL: __DEV__
    ? `http://${DEV_API_HOST}:5050`
    : 'https://api.bigbossfitness.ma',

  // API Version
  VERSION: 'v1',

  // Timeouts (in milliseconds)
  TIMEOUT: 30000,
  UPLOAD_TIMEOUT: 60000,

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
} as const;

// API Endpoints
export const ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
    CHECK_EMAIL: '/api/auth/check-email',
  },

  // Users
  USERS: {
    PROFILE: '/api/users/me',
    STATS: '/api/users/me/stats',
  },

  // Exercises
  EXERCISES: {
    LIST: '/api/exercises',
    DETAIL: (id: string) => `/api/exercises/${id}`,
    BY_MUSCLE: (muscle: string) => `/api/exercises/muscle-group/${muscle}`,
    ALTERNATIVES: (id: string) => `/api/exercises/${id}/alternatives`,
    SEARCH: '/api/exercises/search',
    VIDEO: (id: string, type: string) => `/api/exercises/${id}/video/${type}`,
  },

  // Sessions
  SESSIONS: {
    LIST: '/api/sessions',
    GENERATE: '/api/sessions/generate',
    DETAIL: (id: string) => `/api/sessions/${id}`,
    START: (id: string) => `/api/sessions/${id}/start`,
    COMPLETE: (id: string) => `/api/sessions/${id}/complete`,
    ABANDON: (id: string) => `/api/sessions/${id}/abandon`,
    LOG_SET: '/api/sessions/log-set',
    SKIP: '/api/sessions/skip',
    CURRENT: '/api/sessions/current',
  },

  // Nutrition
  NUTRITION: {
    LOG_MEAL: '/api/nutrition/meals',
    SCAN: '/api/nutrition/scan',
    DAY: '/api/nutrition/day',
    WEEK: '/api/nutrition/week',
    TARGETS: '/api/nutrition/targets',
    DELETE_MEAL: (id: string) => `/api/nutrition/meals/${id}`,
  },

  // Coach
  COACH: {
    MESSAGE: '/api/coach/message',
    HISTORY: '/api/coach/history',
    QUOTA: '/api/coach/quota',
    CLEAR: '/api/coach/history',
  },

  // Programmes
  PROGRAMMES: {
    ACTIVE: '/api/programmes/active',
    GENERATE: '/api/programmes/generate',
    DETAIL: (id: string) => `/api/programmes/${id}`,
    TODAY: (id: string) => `/api/programmes/${id}/today`,
    WEEK: (id: string, week: number) => `/api/programmes/${id}/week/${week}`,
    PROGRESS: (id: string) => `/api/programmes/${id}/progress`,
    START_SESSION: (id: string, psId: string) => `/api/programmes/${id}/sessions/${psId}/start`,
    PAUSE: (id: string) => `/api/programmes/${id}/pause`,
    RESUME: (id: string) => `/api/programmes/${id}/resume`,
    ABANDON: (id: string) => `/api/programmes/${id}/abandon`,
    NUTRITION: (id: string) => `/api/programmes/${id}/nutrition`,
  },

  // Health
  HEALTH: '/health',
} as const;
