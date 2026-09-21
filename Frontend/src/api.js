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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Render (plan free) apaga el backend tras ~15 min sin uso y tarda hasta
// ~50s en volver a levantar: las primeras peticiones pueden dar timeout o
// 502/503 mientras arranca. Reintentamos con backoff (GET, no autenticación)
// para que la app se recupere sola en vez de mostrar datos vacíos.
const MAX_RETRIES = 6;
const isRetryableError = (error) =>
  error.config?.method === 'get' &&
  !error.config.url.endsWith('/auth/login') &&
  (!error.response || error.response.status >= 500);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401 && !error.config.url.endsWith('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.reload();
      return Promise.reject(error);
    }

    if (isRetryableError(error)) {
      const retryCount = error.config.__retryCount || 0;
      if (retryCount < MAX_RETRIES) {
        error.config.__retryCount = retryCount + 1;
        await sleep(Math.min(2 ** retryCount * 1000, 16000));
        return api(error.config);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
