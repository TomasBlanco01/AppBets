import axios from 'axios';

export const TOKEN_KEY = 'appbets_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401 && !error.config.url.endsWith('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;
