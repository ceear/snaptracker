import axios from 'axios';
import { useAuthStore } from '../store/auth.js';

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
});

// Attach JWT token to every request
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear auth and redirect to login
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;
