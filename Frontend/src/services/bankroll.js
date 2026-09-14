import api from '../api';

const get = () => api.get('/bankroll');
const getHistory = () => api.get('/bankroll/history');
const addEntry = (amount, date) => api.post('/bankroll', { amount, date });

export default { get, getHistory, addEntry };
