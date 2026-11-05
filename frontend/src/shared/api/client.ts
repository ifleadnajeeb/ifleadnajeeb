import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true, // Crucial for sending cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ SILENT TOKEN REFRESH INTERCEPTOR
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

    // If error is 401 (Unauthorized) and we haven't already tried to refresh this exact request
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      
      if (isRefreshing) {
        // If a refresh is already happening, wait for it to finish
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token
        await api.post('/auth/refresh');
        processQueue(null);
        return api(originalRequest); // Retry the original request
      } catch (refreshError) {
        // If refresh fails (e.g., refresh token expired), force logout
        processQueue(refreshError, null);
        
        // Try to hit the logout endpoint to mark the punch-out
        try { await api.post('/auth/logout'); } catch {} 
        
        // Only redirect if not already on the login page
        if (!window.location.pathname.includes('/login')) {
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
