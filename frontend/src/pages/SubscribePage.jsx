import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribePodcast } from '../api/podcasts';
import ErrorState from '../components/Common/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
      <h1 className="text-2xl font-bold text-foreground">
        Subscribe to a podcast
      </h1>
      <p className="text-muted-foreground">
        Enter the RSS feed URL of the podcast. Episodes and metadata will be fetched and stored.
      </p>
      {error && <ErrorState message={error} />}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="feed_url" className="block text-sm font-medium text-foreground mb-1">
            Feed URL
          </label>
          <Input
            id="feed_url"
            type="url"
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            className="w-full"
            disabled={loading}
            autoFocus
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? 'Subscribing…' : 'Subscribe'}
        </Button>
      </form>
    </div>
  );
}
