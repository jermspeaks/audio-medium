import { useEffect, useState } from 'react';
import { getStatsSummary, getTopPodcasts } from '../api/stats';
import StatsDashboard from '../components/Stats/StatsDashboard';
import Loading from '../components/Common/Loading';
import ErrorState from '../components/Common/ErrorState';

export default function StatsPage() {
  const [summary, setSummary] = useState(null);
  const [topPodcasts, setTopPodcasts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = 'Stats | Audiophile';
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const [s, t] = await Promise.all([
          getStatsSummary(),
          getTopPodcasts({ sort: 'hours', limit: 20 }),
        ]);
        if (!cancelled) {
          setSummary(s);
          setTopPodcasts(t);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load stats');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;
  return <StatsDashboard summary={summary} topPodcasts={topPodcasts} />;
}
