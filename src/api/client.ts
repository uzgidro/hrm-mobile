import axios from 'axios';
import { API_BASE_URL } from '../constants';
import { storage } from './storage';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await storage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = await storage.getItem('refresh_token');
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh?refresh_token=${refreshToken}`
        );
        await storage.setItem('access_token', data.access_token);
        if (data.refresh_token) {
          await storage.setItem('refresh_token', data.refresh_token);
        }
        original.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(original);
      } catch {
        await storage.deleteItem('access_token');
        await storage.deleteItem('refresh_token');
      }
    }
    return Promise.reject(error);
  }
);
