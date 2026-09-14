import api from '../api';

const getAll = () => api.get('/tipsters');
const create = (tipster) => api.post('/tipsters', tipster);
const remove = (id) => api.delete(`/tipsters/${id}`);

export default { getAll, create, remove };
