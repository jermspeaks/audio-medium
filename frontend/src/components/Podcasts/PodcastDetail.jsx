import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EpisodeCard from '../Episodes/EpisodeCard';
import { archivePodcast } from '../../api/podcasts';

export default function PodcastDetail({ podcast, episodes }) {
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState(null);
  const navigate = useNavigate();
  const title = podcast?.title || podcast?.uuid;

  async function handleArchive() {
    if (!podcast?.uuid) return;
    if (!window.confirm('Archive this podcast? It will be removed from your list until you restore it.')) return;
    setArchiveError(null);
    setArchiving(true);
    try {
      await archivePodcast(podcast.uuid);
      navigate('/podcasts', { replace: true });
    } catch (e) {
      setArchiveError(e.response?.data?.detail || e.message || 'Failed to archive');
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="space-y-6">
      {archiveError && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
          {archiveError}
        </div>
      )}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex gap-6">
          {podcast?.image_url ? (
            <img
              src={podcast.image_url}
              alt=""
              className="w-24 h-24 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0 flex items-center justify-center text-4xl">
              🎙
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
              {podcast?.is_ended && (
                <span className="rounded px-2 py-0.5 text-xs font-medium bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300">
                  Ended
                </span>
              )}
            </div>
            {podcast?.author && (
              <p className="text-slate-600 dark:text-slate-300 mt-1">{podcast.author}</p>
            )}
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {podcast?.episode_count ?? 0} episodes in history
            </p>
            <p className="mt-2 flex flex-wrap gap-4 items-center">
              {podcast?.uuid && (
                <>
                  <Link
                    to={`/podcasts/${podcast.uuid}/edit`}
                    className="text-sm text-slate-600 dark:text-slate-300 hover:underline inline-flex items-center gap-1"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={handleArchive}
                    disabled={archiving}
                    className="text-sm text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-50"
                  >
                    {archiving ? 'Archiving…' : 'Archive'}
                  </button>
                </>
              )}
              {podcast?.website_url && (
                <a
                  href={podcast.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-600 dark:text-slate-300 hover:underline inline-flex items-center gap-1"
                >
                  Website
                  <span aria-hidden className="text-slate-400">↗</span>
                </a>
              )}
              {podcast?.feed_url && (
                <a
                  href={podcast.feed_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-slate-600 dark:text-slate-300 hover:underline inline-flex items-center gap-1"
                >
                  RSS Feed
                  <span aria-hidden className="text-slate-400">↗</span>
                </a>
              )}
            </p>
            {podcast?.description && (
              <p className="mt-3 text-slate-600 dark:text-slate-300 text-sm line-clamp-3">
                {podcast.description}
              </p>
            )}
          </div>
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Episodes</h2>
        {!episodes?.length ? (
          <p className="text-slate-500 dark:text-slate-400">No episodes.</p>
        ) : (
          <div className="space-y-3">
            {episodes.map((ep) => (
              <EpisodeCard key={ep.uuid} episode={ep} showPodcast={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
