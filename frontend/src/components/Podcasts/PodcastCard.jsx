import { Link } from 'react-router-dom';

export default function PodcastCard({ podcast }) {
  const title = podcast.title || podcast.uuid;
  return (
    <Link
      to={`/podcasts/${podcast.uuid}`}
      className="block rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex gap-4">
        {podcast.image_url ? (
          <img
            src={podcast.image_url}
            alt=""
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center text-slate-500 text-2xl">
            🎙
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</h3>
          {podcast.author && (
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{podcast.author}</p>
          )}
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            {podcast.episode_count ?? 0} episodes
          </p>
        </div>
      </div>
    </Link>
  );
}
