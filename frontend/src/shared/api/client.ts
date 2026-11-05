import axios from 'axios';

export const api = axios.create({
  baseURL: (() => {
    let url = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
    if (!url.endsWith('/api')) {
      url = url.replace(/\/$/, '');
      url += '/api';
    }
    return url;
  })(),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest)).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        // ✅ Use axios directly to avoid infinite loops
        const refreshRes = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken }, { withCredentials: true });
        
        // ✅ Save the NEW refresh token
        if (refreshRes.data.refreshToken) {
          localStorage.setItem('refreshToken', refreshRes.data.refreshToken);
        }
        
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('accessToken');
        // ✅ Let React Router handle the redirect (no window.location)
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(error: any): string {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.message) return error.message;
  return 'An unexpected error occurred';
}
