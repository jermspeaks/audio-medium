import { Link } from 'react-router-dom';
import EpisodeCard from '../Episodes/EpisodeCard';

export default function PodcastDetail({ podcast, episodes }) {
  const title = podcast?.title || podcast?.uuid;
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex gap-6">
          {podcast?.image_url ? (
            <img
              src={podcast.image_url}
              alt=""
              className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center text-4xl">
              🎙
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
            {podcast?.author && (
              <p className="text-slate-600 dark:text-slate-300 mt-1">{podcast.author}</p>
            )}
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              {podcast?.episode_count ?? 0} episodes in history
            </p>
            <p className="mt-2 flex flex-wrap gap-4">
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
