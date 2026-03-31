// API Configuration
export const API_CONFIG = {
  // Base URL - change this based on environment
  // Use your machine's IP for testing on physical device
  BASE_URL: __DEV__
    ? 'http://192.168.79.102:5000'
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

  // Health
  HEALTH: '/health',
} as const;
