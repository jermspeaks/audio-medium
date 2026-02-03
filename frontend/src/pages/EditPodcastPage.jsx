import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPodcast, updatePodcast } from '../api/podcasts';
import Loading from '../components/Common/Loading';
import ErrorState from '../components/Common/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function EditPodcastPage() {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [podcast, setPodcast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [form, setForm] = useState({
    title: '',
    author: '',
    description: '',
    image_url: '',
    feed_url: '',
    website_url: '',
    is_ended: false,
  });

  useEffect(() => {
    if (!uuid) return;
    let cancelled = false;
    async function fetchPodcast() {
      try {
        const data = await getPodcast(uuid);
        if (!cancelled) {
          setPodcast(data);
          setForm({
            title: data.title ?? '',
            author: data.author ?? '',
            description: data.description ?? '',
            image_url: data.image_url ?? '',
            feed_url: data.feed_url ?? '',
            website_url: data.website_url ?? '',
            is_ended: Boolean(data.is_ended),
          });
        }
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.detail || e.message || 'Failed to load podcast');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPodcast();
    return () => { cancelled = true; };
  }, [uuid]);

  useEffect(() => {
    if (podcast?.title) {
      document.title = `Edit ${podcast.title} | Audiophile`;
      return () => { document.title = 'Audiophile'; };
    }
  }, [podcast?.title]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!uuid) return;
    setSaveError(null);
    setSaving(true);
    try {
      await updatePodcast(uuid, {
        title: form.title || undefined,
        author: form.author || undefined,
        description: form.description || undefined,
        image_url: form.image_url || undefined,
        feed_url: form.feed_url || undefined,
        website_url: form.website_url || undefined,
        is_ended: form.is_ended,
      });
      navigate(`/podcasts/${uuid}`, { replace: true });
    } catch (e) {
      const detail = e.response?.data?.detail;
      setSaveError(Array.isArray(detail) ? detail.join(', ') : detail || e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;
  if (!podcast) return null;

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold text-foreground">
        Edit podcast
      </h1>
      {saveError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {saveError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1">
            Title
          </label>
          <Input
            id="title"
            name="title"
            type="text"
            value={form.title}
            onChange={handleChange}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="author" className="block text-sm font-medium text-foreground mb-1">
            Author
          </label>
          <Input
            id="author"
            name="author"
            type="text"
            value={form.author}
            onChange={handleChange}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-foreground"
          />
        </div>
        <div>
          <label htmlFor="image_url" className="block text-sm font-medium text-foreground mb-1">
            Image URL
          </label>
          <Input
            id="image_url"
            name="image_url"
            type="url"
            value={form.image_url}
            onChange={handleChange}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="feed_url" className="block text-sm font-medium text-foreground mb-1">
            Feed URL
          </label>
          <Input
            id="feed_url"
            name="feed_url"
            type="url"
            value={form.feed_url}
            onChange={handleChange}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="website_url" className="block text-sm font-medium text-foreground mb-1">
            Website URL
          </label>
          <Input
            id="website_url"
            name="website_url"
            type="url"
            value={form.website_url}
            onChange={handleChange}
            className="w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="is_ended"
            name="is_ended"
            type="checkbox"
            checked={form.is_ended}
            onChange={handleChange}
            className="rounded border-input text-foreground focus-visible:ring-ring"
          />
          <label htmlFor="is_ended" className="text-sm text-foreground">
            Podcast has ended (no longer releasing new episodes)
          </label>
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(`/podcasts/${uuid}`)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
