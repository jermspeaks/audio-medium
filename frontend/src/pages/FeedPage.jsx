import { useEffect, useState } from 'react';
import { getEpisodes } from '../api/episodes';
import { refreshFeeds } from '../api/podcasts';
import EpisodeList from '../components/Episodes/EpisodeList';
import Loading from '../components/Common/Loading';
import ErrorState from '../components/Common/ErrorState';
import Pagination from '../components/Common/Pagination';
import StatusFilter from '../components/Filters/StatusFilter';

const LIMIT = 50;

export default function FeedPage() {
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [playingStatus, setPlayingStatus] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshReport, setRefreshReport] = useState(null);
  const [refreshError, setRefreshError] = useState(null);

  useEffect(() => {
    document.title = 'Feed | Audiophile';
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const params = { limit: LIMIT, offset: page * LIMIT };
        if (playingStatus) params.playing_status = playingStatus;
        const data = await getEpisodes(params);
        if (!cancelled) setEpisodes(data);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load episodes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [page, playingStatus]);

  async function handleRefreshFeeds() {
    setRefreshError(null);
    setRefreshReport(null);
    setRefreshing(true);
    try {
      const report = await refreshFeeds();
      setRefreshReport(report);
      const params = { limit: LIMIT, offset: page * LIMIT };
      if (playingStatus) params.playing_status = playingStatus;
      const data = await getEpisodes(params);
      setEpisodes(data);
    } catch (e) {
      setRefreshError(e.response?.data?.detail || e.message || 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }

  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Feed</h1>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handleRefreshFeeds}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-md bg-slate-700 dark:bg-slate-600 text-white text-sm hover:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {refreshing ? 'Refreshing…' : 'Refresh feeds'}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Status:</span>
            <StatusFilter value={playingStatus} onChange={setPlayingStatus} />
          </div>
        </div>
      </div>
      {refreshError && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          {refreshError}
        </div>
      )}
      {refreshReport && !refreshError && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Feeds refreshed: {refreshReport.podcasts_refreshed ?? 0} podcasts, +{refreshReport.episodes_added ?? 0} new episodes, {refreshReport.episodes_updated ?? 0} updated.
          {refreshReport.errors?.length ? ` ${refreshReport.errors.length} errors.` : ''}
        </p>
      )}
      {loading ? <Loading /> : <EpisodeList episodes={episodes} />}
      <Pagination
        page={page}
        setPage={setPage}
        hasMore={episodes.length === LIMIT}
        loading={loading}
      />
    </div>
  );
}
