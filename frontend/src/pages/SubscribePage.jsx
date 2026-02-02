import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribePodcast } from '../api/podcasts';
import ErrorState from '../components/Common/ErrorState';

export default function SubscribePage() {
  const [feedUrl, setFeedUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    const url = (feedUrl || '').trim();
    if (!url) {
      setError('Please enter an RSS feed URL');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('URL must start with http:// or https://');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const podcast = await subscribePodcast(url);
      navigate(`/podcasts/${podcast.uuid}`, { replace: true });
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(Array.isArray(detail) ? detail.join(', ') : detail || e.message || 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Subscribe to a podcast
      </h1>
      <p className="text-slate-600 dark:text-slate-300">
        Enter the RSS feed URL of the podcast. Episodes and metadata will be fetched and stored.
      </p>
      {error && <ErrorState message={error} />}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="feed_url" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Feed URL
          </label>
          <input
            id="feed_url"
            type="url"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            disabled={loading}
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-md bg-slate-700 dark:bg-slate-600 text-white hover:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>
    </div>
  );
}
