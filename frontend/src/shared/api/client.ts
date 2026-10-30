import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// ✅ Use Vercel Proxy so cookies are treated as first-party
const baseURL = '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true, // ✅ Required for cookies
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// ✅ Silent Token Refresh Logic
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    // If 401 Unauthorized, try to refresh the token silently
    if (
      status === 401 && 
      !originalRequest._retry && 
      !originalRequest.url?.includes('/auth/login') && 
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Request new token using the refresh cookie
        await api.post('/auth/refresh');
        processQueue(null);
        return api(originalRequest); // Retry original request
      } catch (refreshError) {
        processQueue(refreshError);
        // Only logout if refresh token is completely dead
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export interface ApiError { error: string; message: string; }

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined;
    return data?.message || err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}
