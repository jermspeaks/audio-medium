import api from './api';

export async function getPodcasts(params = {}) {
  const { data } = await api.get('/podcasts', { params });
  return data;
}

export async function getPodcast(uuid) {
  const { data } = await api.get(`/podcasts/${uuid}`);
  return data;
}

export async function getPodcastEpisodes(uuid, params = {}) {
  const { data } = await api.get(`/podcasts/${uuid}/episodes`, { params });
  return data;
}
