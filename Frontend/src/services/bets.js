import api from '../api';

const getAll = () => api.get('/bets');
const create = (bet) => api.post('/bets', bet);
const update = (id, data) => api.put(`/bets/${id}`, data);
const remove = (id) => api.delete(`/bets/${id}`);

export default { getAll, create, update, remove };
