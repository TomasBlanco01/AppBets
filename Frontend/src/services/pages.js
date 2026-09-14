import api from '../api';

const getAll = () => api.get('/pages');
const create = (page) => api.post('/pages', page);
const remove = (id) => api.delete(`/pages/${id}`);

export default { getAll, create, remove };
