import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPodcasts } from '../api/podcasts';
import PodcastList from '../components/Podcasts/PodcastList';
import Loading from '../components/Common/Loading';
import ErrorState from '../components/Common/ErrorState';
import Pagination from '../components/Common/Pagination';
import PodcastFilter from '../components/Filters/PodcastFilter';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const LIMIT = 24;

export default function PodcastsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page1 = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
  const page0 = page1 - 1;
  const q = searchParams.get('q') ?? '';
  const filter = searchParams.get('filter') ?? '';

  const [podcasts, setPodcasts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const setFilterParam = (value) => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      if (!value) nextParams.delete('filter');
      else nextParams.set('filter', value);
      nextParams.delete('page');
      return nextParams;
    });
  };

  useEffect(() => {
    document.title = 'Podcasts | Audiophile';
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const params = {
          search: q || undefined,
          limit: LIMIT,
          offset: page0 * LIMIT,
        };
        if (filter) {
          params.filter = filter;
        }
        const data = await getPodcasts(params);
        if (!cancelled) {
          setPodcasts(data.items ?? []);
          setTotal(data.total ?? 0);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load podcasts');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [page0, q, filter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = e.target.query?.value?.trim() ?? '';
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      if (!trimmed) nextParams.delete('q');
      else nextParams.set('q', trimmed);
      nextParams.delete('page');
      return nextParams;
    });
  };

  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Podcasts</h1>
        <div className="flex flex-wrap items-center gap-4">
          <form onSubmit={handleSearchSubmit} className="flex gap-2" key={q}>
            <Input
              name="query"
              type="search"
              defaultValue={q}
              placeholder="Search by title or author"
              className="w-64"
            />
            <Button type="submit">Search</Button>
          </form>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filter:</span>
            <PodcastFilter value={filter} onChange={setFilterParam} />
          </div>
        </div>
      </div>
      {loading ? <Loading /> : <PodcastList podcasts={podcasts} />}
      <Pagination
        page={page0}
        setPage={setPage}
        hasMore={podcasts.length === LIMIT}
        loading={loading}
        total={total}
        totalPages={total > 0 ? Math.ceil(total / LIMIT) : null}
      />
    </div>
  );
}
