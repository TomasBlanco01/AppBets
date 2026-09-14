import api from '../api';

const getAll = () => api.get('/sports');
const create = (sport) => api.post('/sports', sport);
const remove = (id) => api.delete(`/sports/${id}`);

export default { getAll, create, remove };
