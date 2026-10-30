import axios, { AxiosError } from 'axios';

// ✅ Use relative path so Vercel's proxy handles the backend connection
const baseURL = '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 60000, // ✅ Increased to 60s to survive Render cold starts
  headers: { 'Content-Type': 'application/json' },
});

// ✅ Attach Bearer token from localStorage to every request
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
