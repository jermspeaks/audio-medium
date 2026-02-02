import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPodcast, updatePodcast } from '../api/podcasts';
import Loading from '../components/Common/Loading';
import ErrorState from '../components/Common/ErrorState';

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
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Edit podcast
      </h1>
      {saveError && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          {saveError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={form.title}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="author" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Author
          </label>
          <input
            id="author"
            name="author"
            type="text"
            value={form.author}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="image_url" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Image URL
          </label>
          <input
            id="image_url"
            name="image_url"
            type="url"
            value={form.image_url}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="feed_url" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Feed URL
          </label>
          <input
            id="feed_url"
            name="feed_url"
            type="url"
            value={form.feed_url}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="website_url" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Website URL
          </label>
          <input
            id="website_url"
            name="website_url"
            type="url"
            value={form.website_url}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="is_ended"
            name="is_ended"
            type="checkbox"
            checked={form.is_ended}
            onChange={handleChange}
            className="rounded border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 focus:ring-slate-500"
          />
          <label htmlFor="is_ended" className="text-sm text-slate-700 dark:text-slate-300">
            Podcast has ended (no longer releasing new episodes)
          </label>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-md bg-slate-700 dark:bg-slate-600 text-white hover:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/podcasts/${uuid}`)}
            className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
