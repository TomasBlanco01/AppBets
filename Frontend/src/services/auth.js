import api, { TOKEN_KEY } from '../api';

const login = async (password) => {
  const { data } = await api.post('/auth/login', { password });
  localStorage.setItem(TOKEN_KEY, data.token);
};

const isAuthenticated = () => !!localStorage.getItem(TOKEN_KEY);

const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  window.location.reload();
};

// Cierra la sesión en todos los dispositivos (incluido este).
const logoutAll = async () => {
  await api.post('/auth/logout-all');
  logout();
};

// --- Passkeys (Face ID / huella / PIN del dispositivo) ---
// La librería del navegador se carga recién cuando se usa.

const supportsPasskeys = () => typeof window !== 'undefined' && typeof window.PublicKeyCredential === 'function';

const guessDeviceName = () => {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'Dispositivo';
};

const loginWithPasskey = async () => {
  const { startAuthentication } = await import('@simplewebauthn/browser');
  const { data } = await api.post('/auth/passkey/login/options');
  const response = await startAuthentication({ optionsJSON: data.options });
  const { data: result } = await api.post('/auth/passkey/login/verify', { challengeId: data.challengeId, response });
  localStorage.setItem(TOKEN_KEY, result.token);
};

const registerPasskey = async () => {
  const { startRegistration } = await import('@simplewebauthn/browser');
  const { data } = await api.post('/auth/passkey/register/options');
  const response = await startRegistration({ optionsJSON: data.options });
  await api.post('/auth/passkey/register/verify', {
    challengeId: data.challengeId,
    response,
    deviceName: guessDeviceName(),
  });
};

const listPasskeys = () => api.get('/auth/passkeys').then(({ data }) => data);
const deletePasskey = (id) => api.delete(`/auth/passkeys/${encodeURIComponent(id)}`);

// El navegador avisa con NotAllowedError cuando el usuario cancela el diálogo.
const isPasskeyCancel = (error) => error?.name === 'NotAllowedError' || error?.name === 'AbortError';

export default {
  login,
  isAuthenticated,
  logout,
  logoutAll,
  supportsPasskeys,
  loginWithPasskey,
  registerPasskey,
  listPasskeys,
  deletePasskey,
  isPasskeyCancel,
};
