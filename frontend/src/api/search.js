import api from './api';

export async function search(params) {
  const { data } = await api.get('/search', { params });
  return data;
}
