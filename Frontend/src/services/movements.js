import api from '../api';

const getAll = (pageId) => {
  const params = pageId ? { pageId } : {};
  return api.get('/movements', { params });
};

const create = (movement) => api.post('/movements', movement);
const update = (id, data) => api.put(`/movements/${id}`, data);
const remove = (id) => api.delete(`/movements/${id}`);

export default { getAll, create, update, remove };
