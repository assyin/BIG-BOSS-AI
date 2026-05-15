/**
 * Admin API configuration
 * Reads from NEXT_PUBLIC_API_URL env var, falls back to localhost:5050
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';

export const getAuthHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};
