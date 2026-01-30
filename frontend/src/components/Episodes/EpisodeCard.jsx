import { Link } from 'react-router-dom';

const STATUS_LABELS = { 1: 'Not played', 2: 'Completed', 3: 'In progress' };

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
      to={`/episodes/${episode.uuid}`}
      className="block rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 hover:shadow-md transition-shadow"
    >
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
    </Link>
  );
}
