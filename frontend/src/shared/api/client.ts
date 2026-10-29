import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// ✅ In dev: use localhost:4000. In prod: use Vercel env or Render URL
const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:4000' : 'https://ifleadnajeeb.onrender.com');
const baseURL = `${API_BASE}/api`;

export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';

    const isAuthCall =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/me');

    if (status === 401 && !isAuthCall) {
      try {
        await api.post('/auth/refresh');
        return api.request(error.config as InternalAxiosRequestConfig);
      } catch {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export interface ApiError {
  error: string;
  message: string;
}

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined;
    return data?.message ?? err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}
