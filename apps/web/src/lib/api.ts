import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';

// Create an Axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
});

// Add a request interceptor to inject the JWT token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// Add a response interceptor to handle retries on network error and 401 errors gracefully
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Retry once or twice if network error occurs (e.g. backend is starting up)
    if ((!error.response || error.code === 'ERR_NETWORK') && config && !config._retryCount) {
      config._retryCount = (config._retryCount || 0) + 1;
      if (config._retryCount <= 2) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * config._retryCount));
        return api(config);
      }
    }

    if (error.response && error.response.status === 401) {
      // If the 401 is on auth endpoints (like invalid credentials on login), do not trigger global session logout
      const isAuthEndpoint = config?.url?.includes('/auth/login') || config?.url?.includes('/auth/register');
      if (!isAuthEndpoint) {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
