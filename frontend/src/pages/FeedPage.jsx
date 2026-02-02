import { useEffect, useState } from 'react';
import { getEpisodes } from '../api/episodes';
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

  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Feed</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">Status:</span>
          <StatusFilter value={playingStatus} onChange={setPlayingStatus} />
        </div>
      </div>
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
