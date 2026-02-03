import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { search } from '../api/search';
import SearchBar from '../components/Search/SearchBar';
import SearchResults from '../components/Search/SearchResults';
import Loading from '../components/Common/Loading';
import ErrorState from '../components/Common/ErrorState';
import StatusFilter from '../components/Filters/StatusFilter';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const [results, setResults] = useState({ podcasts: [], episodes: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playingStatus, setPlayingStatus] = useState('');

  useEffect(() => {
    document.title = q.trim() ? `Search: ${q} | Audiophile` : 'Search | Audiophile';
  }, [q]);

  useEffect(() => {
    if (!q.trim()) {
      setResults({ podcasts: [], episodes: [] });
      return;
    }
    let cancelled = false;
    async function doSearch() {
      setLoading(true);
      setError(null);
      try {
        const params = { q: q.trim(), limit: 30 };
        if (playingStatus) params.playing_status = playingStatus;
        const data = await search(params);
        if (!cancelled) setResults(data);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Search failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    doSearch();
    return () => { cancelled = true; };
  }, [q, playingStatus]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Search</h1>
      <SearchBar initialQuery={q} placeholder="Search podcasts and episodes..." />
      {q.trim() && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter episodes by status:</span>
          <StatusFilter value={playingStatus} onChange={setPlayingStatus} />
        </div>
      )}
      {error && <ErrorState message={error} />}
      {loading ? (
        <Loading />
      ) : (
        <SearchResults podcasts={results.podcasts} episodes={results.episodes} />
      )}
    </div>
  );
}
