import api from './api';

export async function getSyncStatus() {
  const { data } = await api.get('/sync/status');
  return data;
}

export async function getSyncHistory(params = {}) {
  const { data } = await api.get('/sync/history', { params });
  return data;
}

export async function triggerSync() {
  const { data } = await api.post('/sync');
  return data;
}

export async function syncFromUpload(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/sync/upload', formData, {
    headers: { 'Content-Type': undefined },
  });
  return data;
}
