import { Link } from 'react-router-dom';

const STATUS_LABELS = { 1: 'Not played', 2: 'In progress', 3: 'Completed' };

function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function EpisodeCard({ episode, showPodcast = true }) {
  const title = episode.title || episode.uuid;
  const statusLabel = STATUS_LABELS[episode.playing_status] ?? '—';
  return (
    <Link
      to={`/feed/${episode.uuid}`}
      className="block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex gap-4">
        {episode.podcast_image_url ? (
          <img
            src={episode.podcast_image_url}
            alt=""
            className="w-16 h-16 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0 flex items-center justify-center text-slate-500 text-2xl">
            🎙
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2">{title}</h3>
          {showPodcast && episode.podcast_title && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{episode.podcast_title}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-600 dark:text-slate-300">
            <span>{statusLabel}</span>
            {episode.completion_percentage != null && (
              <span>{Number(episode.completion_percentage).toFixed(0)}%</span>
            )}
            <span>{formatDuration(episode.duration)}</span>
            {episode.last_played_at && (
              <span>Last: {new Date(episode.last_played_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
