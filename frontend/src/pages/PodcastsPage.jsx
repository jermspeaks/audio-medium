import { useEffect, useState } from 'react';
import { getPodcasts } from '../api/podcasts';
import PodcastList from '../components/Podcasts/PodcastList';
import Loading from '../components/Common/Loading';
import ErrorState from '../components/Common/ErrorState';
import Pagination from '../components/Common/Pagination';

const LIMIT = 24;

export default function PodcastsPage() {
  const [podcasts, setPodcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getPodcasts({
          search: search || undefined,
          limit: LIMIT,
          offset: page * LIMIT,
        });
        if (!cancelled) setPodcasts(data);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load podcasts');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [page, search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = e.target.query?.value?.trim() ?? '';
    setSearch(q);
    setPage(0);
  };

  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Podcasts</h1>
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            name="query"
            type="search"
            defaultValue={search}
            placeholder="Search by title or author"
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 w-64 text-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-700 dark:bg-slate-600 text-white px-4 py-2"
          >
            Search
          </button>
        </form>
      </div>
      {loading ? <Loading /> : <PodcastList podcasts={podcasts} />}
      <Pagination
        page={page}
        setPage={setPage}
        hasMore={podcasts.length === LIMIT}
        loading={loading}
      />
    </div>
  );
}
