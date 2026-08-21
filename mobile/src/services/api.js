import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.API_URL || 'https://ai-smart-dine-backend.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Non-blocking background health ping to keep backend warm
setTimeout(() => {
  axios.get(`${BASE_URL}/health`, { timeout: 8000 }).catch(() => {});
}, 100);

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('asd_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Track retry counts per request
const retryCounts = new Map();

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Handle 401 Token Expired
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED') {
      await AsyncStorage.multiRemove(['asd_token', 'asd_user']);
      return Promise.reject(error);
    }

    // Handle 429 Too Many Requests — auto retry after delay
    if (error.response?.status === 429 && config) {
      const retryKey = `${config.method}:${config.url}`;
      const retries = retryCounts.get(retryKey) || 0;
      if (retries < 3) {
        retryCounts.set(retryKey, retries + 1);
        const delay = Math.pow(2, retries) * 2000; // 2s, 4s, 8s backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        retryCounts.delete(retryKey);
        return api(config);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
