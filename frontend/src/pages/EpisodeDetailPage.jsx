import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getEpisode, getEpisodeHistory, getEpisodeSessions } from '../api/episodes';
import EpisodeDetail from '../components/Episodes/EpisodeDetail';
import Loading from '../components/Common/Loading';
import ErrorState from '../components/Common/ErrorState';

export default function EpisodeDetailPage() {
  const { uuid } = useParams();
  const [episode, setEpisode] = useState(null);
  const [history, setHistory] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!uuid) return;
    try {
      const [ep, hist, sess] = await Promise.all([
        getEpisode(uuid),
        getEpisodeHistory(uuid).catch(() => null),
        getEpisodeSessions(uuid).catch(() => []),
      ]);
      setEpisode(ep);
      setHistory(hist ?? null);
      setSessions(Array.isArray(sess) ? sess : []);
    } catch (e) {
      setError(e.message || 'Failed to load episode');
    }
  }, [uuid]);

  useEffect(() => {
    if (!uuid) return;
    let cancelled = false;
    setLoading(true);
    fetchData()
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [uuid, fetchData]);

  const handleHistoryUpdated = useCallback(() => {
    fetchData();
  }, [fetchData]);

  if (error) return <ErrorState message={error} />;
  if (loading || !episode) return <Loading />;

  return (
    <EpisodeDetail
      episode={episode}
      history={history}
      sessions={sessions}
      onHistoryUpdated={handleHistoryUpdated}
    />
  );
}
