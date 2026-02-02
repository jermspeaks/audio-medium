import api from './api';

/**
 * Upload OPML file and run import. Returns import report.
 * @param {File} file - OPML file (.opml or .xml)
 * @returns {Promise<{ podcasts_found: number, podcasts_added: number, podcasts_updated: number, metadata_enriched: number, errors: string[] }>}
 */
export async function importOPML(file) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/settings/opml/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/**
 * Remove duplicate podcasts (keeps the one with episodes for each feed).
 * @returns {Promise<{ deleted_count: number, deleted_titles: string[] }>}
 */
export async function removeDuplicatePodcasts() {
  const { data } = await api.post('/settings/podcasts/remove-duplicates');
  return data;
}
