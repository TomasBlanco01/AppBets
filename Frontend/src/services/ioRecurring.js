import api from '../api';

const getAll = () => api.get('/io/recurring');
const create = (template) => api.post('/io/recurring', template);
const update = (id, data) => api.put(`/io/recurring/${id}`, data);
const remove = (id) => api.delete(`/io/recurring/${id}`);

export default { getAll, create, update, remove };
