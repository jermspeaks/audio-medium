import api from './api';

export async function getPodcasts(params = {}) {
  const { data } = await api.get('/podcasts', { params });
  return data?.items != null ? data : { items: Array.isArray(data) ? data : [], total: 0 };
}

export async function getPodcast(uuid) {
  const { data } = await api.get(`/podcasts/${uuid}`);
  return data;
}

export async function getPodcastEpisodes(uuid, params = {}) {
  const { data } = await api.get(`/podcasts/${uuid}/episodes`, { params });
  return data;
}

export async function subscribePodcast(feedUrl) {
  const { data } = await api.post('/podcasts/subscribe', { feed_url: feedUrl });
  return data;
}

export async function archivePodcast(uuid) {
  const { data } = await api.post(`/podcasts/${uuid}/archive`);
  return data;
}

export async function unarchivePodcast(uuid) {
  const { data } = await api.post(`/podcasts/${uuid}/unarchive`);
  return data;
}

export async function refreshFeeds() {
  const { data } = await api.post('/podcasts/refresh-feeds');
  return data;
}

export async function updatePodcast(uuid, body) {
  const { data } = await api.put(`/podcasts/${uuid}`, body);
  return data;
}
