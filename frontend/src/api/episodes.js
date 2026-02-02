import api from './api';

export async function getEpisodes(params = {}) {
  const { data } = await api.get('/episodes', { params });
  return data;
}

export async function getEpisode(uuid) {
  const { data } = await api.get(`/episodes/${uuid}`);
  return data;
}

export async function getEpisodeHistory(uuid) {
  const { data } = await api.get(`/episodes/${uuid}/history`);
  return data;
}

export async function updateEpisodeHistory(uuid, data) {
  const { data: result } = await api.put(`/episodes/${uuid}/history`, data);
  return result;
}

export async function getEpisodeSessions(uuid, params = {}) {
  const { data } = await api.get(`/episodes/${uuid}/sessions`, { params });
  return data;
}
