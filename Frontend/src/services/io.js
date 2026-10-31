import api from '../api';

const getAll = () => api.get('/io');
const create = (movement, config) => api.post('/io', movement, config);
const update = (id, data) => api.put(`/io/${id}`, data);
const remove = (id) => api.delete(`/io/${id}`);
const getBudgets = () => api.get('/io/budgets');
const saveBudgets = (budgets) => api.put('/io/budgets', { budgets });

export default { getAll, create, update, remove, getBudgets, saveBudgets };
