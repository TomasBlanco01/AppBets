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

export default { login, isAuthenticated, logout };
