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
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {archiveError}
        </div>
      )}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex gap-6">
          {podcast?.image_url ? (
            <img
              src={podcast.image_url}
              alt=""
              className="w-24 h-24 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-muted shrink-0 flex items-center justify-center text-4xl text-muted-foreground">
              🎙
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              {podcast?.is_ended && (
                <span className="rounded px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground">
                  Ended
                </span>
              )}
            </div>
            {podcast?.author && (
              <p className="text-muted-foreground mt-1">{podcast.author}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {podcast?.episode_count ?? 0} episodes in history
            </p>
            <p className="mt-2 flex flex-wrap gap-4 items-center">
              {podcast?.uuid && (
                <>
                  <Link
                    to={`/podcasts/${podcast.uuid}/edit`}
                    className="text-sm text-muted-foreground hover:text-foreground hover:underline inline-flex items-center gap-1"
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
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline inline-flex items-center gap-1"
                >
                  Website
                  <span aria-hidden className="opacity-70">↗</span>
                </a>
              )}
              {podcast?.feed_url && (
                <a
                  href={podcast.feed_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline inline-flex items-center gap-1"
                >
                  RSS Feed
                  <span aria-hidden className="opacity-70">↗</span>
                </a>
              )}
            </p>
            {podcast?.description && (
              <p className="mt-3 text-muted-foreground text-sm line-clamp-3">
                {podcast.description}
              </p>
            )}
          </div>
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Episodes</h2>
        {!episodes?.length ? (
          <p className="text-muted-foreground">No episodes.</p>
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
