import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getEpisodes } from '../api/episodes';
import { refreshFeeds } from '../api/podcasts';
import EpisodeList from '../components/Episodes/EpisodeList';
import Loading from '../components/Common/Loading';
import ErrorState from '../components/Common/ErrorState';
import Pagination from '../components/Common/Pagination';
import StatusFilter from '../components/Filters/StatusFilter';
import SortOrderFilter from '../components/Filters/SortOrderFilter';
import { Button } from '@/components/ui/button';

const LIMIT = 50;

export default function FeedPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page1 = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
  const page0 = page1 - 1;
  const playingStatus = searchParams.get('status') ?? '';
  const sort = searchParams.get('sort') ?? 'last_played';

  const [episodes, setEpisodes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshReport, setRefreshReport] = useState(null);
  const [refreshError, setRefreshError] = useState(null);

  const setPage = (updater) => {
    const next = typeof updater === 'function' ? updater(page0) : updater;
    const next1 = Math.max(1, next + 1);
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      if (next1 === 1) nextParams.delete('page');
      else nextParams.set('page', String(next1));
      return nextParams;
    });
  };

  const setPlayingStatusParam = (value) => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      if (!value) nextParams.delete('status');
      else nextParams.set('status', value);
      nextParams.delete('page');
      return nextParams;
    });
  };

  const setSortParam = (value) => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      if (!value || value === 'last_played') nextParams.delete('sort');
      else nextParams.set('sort', value);
      nextParams.delete('page');
      return nextParams;
    });
  };

  useEffect(() => {
    document.title = 'Feed | Audiophile';
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const params = { limit: LIMIT, offset: page0 * LIMIT, sort };
        if (playingStatus) params.playing_status = playingStatus;
        const data = await getEpisodes(params);
        if (!cancelled) {
          setEpisodes(data.items ?? []);
          setTotal(data.total ?? 0);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load episodes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [page0, playingStatus, sort]);

  async function handleRefreshFeeds() {
    setRefreshError(null);
    setRefreshReport(null);
    setRefreshing(true);
    try {
      const report = await refreshFeeds();
      setRefreshReport(report);
      const params = { limit: LIMIT, offset: page0 * LIMIT, sort };
      if (playingStatus) params.playing_status = playingStatus;
      const data = await getEpisodes(params);
      setEpisodes(data.items ?? []);
      setTotal(data.total ?? 0);
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
        <h1 className="text-2xl font-bold text-foreground">Feed</h1>
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={handleRefreshFeeds} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh feeds'}
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <StatusFilter value={playingStatus} onChange={setPlayingStatusParam} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort order:</span>
            <SortOrderFilter value={sort} onChange={setSortParam} />
          </div>
        </div>
      </div>
      {refreshError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {refreshError}
        </div>
      )}
      {refreshReport && !refreshError && (
        <p className="text-sm text-muted-foreground">
          Feeds refreshed: {refreshReport.podcasts_refreshed ?? 0} podcasts, +{refreshReport.episodes_added ?? 0} new episodes, {refreshReport.episodes_updated ?? 0} updated.
          {refreshReport.errors?.length ? ` ${refreshReport.errors.length} errors.` : ''}
        </p>
      )}
      {loading ? <Loading /> : <EpisodeList episodes={episodes} />}
      <Pagination
        page={page0}
        setPage={setPage}
        hasMore={episodes.length === LIMIT}
        loading={loading}
        total={total}
        totalPages={total > 0 ? Math.ceil(total / LIMIT) : null}
      />
    </div>
  );
}
