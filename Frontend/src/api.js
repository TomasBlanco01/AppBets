import axios from 'axios';

export const TOKEN_KEY = 'geseco_token';
const LEGACY_TOKEN_KEY = 'appbets_token';

// Conserva la sesión de la versión anterior al renombrar la app.
if (!localStorage.getItem(TOKEN_KEY)) {
  const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacyToken) {
    localStorage.setItem(TOKEN_KEY, legacyToken);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }
}

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

// Ante un corte de red o un error 5xx puntual (p. ej. Turso tarda en
// responder) reintentamos con backoff (solo GET, no login): 1s, 2s y 4s.
// Si sigue fallando, la app muestra el aviso de sin conexión.
const MAX_RETRIES = 3;

// Endpoints para entrar (contraseña o passkey): un 401 ahí es "credenciales
// incorrectas", no "sesión vencida", así que no se cierra sesión ni se reintenta.
const isLoginRequest = (config) => /\/auth\/(login|passkey\/login\/)/.test(config?.url || '');
const isRetryableError = (error) =>
  error.config?.method === 'get' &&
  !isLoginRequest(error.config) &&
  (!error.response || error.response.status >= 500);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401 && !isLoginRequest(error.config)) {
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
