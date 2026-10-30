import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:4000' : 'https://ifleadnajeeb.onrender.com');
const baseURL = `${API_BASE}/api`;

export const api = axios.create({
  baseURL,
  withCredentials: true, // Keep for local dev, but we rely on headers now
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

// ✅ Attach token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';

    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/me');

    if (status === 401 && !isAuthCall) {
      // Try refresh (optional, but we can skip if we just force re-login)
      localStorage.removeItem('accessToken');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface ApiError { error: string; message: string; }

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined;
    return data?.message ?? err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}
