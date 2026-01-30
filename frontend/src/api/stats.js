import api from './api';

export async function getStatsSummary() {
  const { data } = await api.get('/stats/summary');
  return data;
}

export async function getTopPodcasts(params = {}) {
  const { data } = await api.get('/stats/top-podcasts', { params });
  return data;
}
