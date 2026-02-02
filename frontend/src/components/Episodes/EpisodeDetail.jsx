import { Link } from 'react-router-dom';
import AudioPlayer from './AudioPlayer';

const STATUS_LABELS = { 1: 'Not played', 2: 'In progress', 3: 'Completed' };

function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export default function EpisodeDetail({ episode, history, sessions, onHistoryUpdated }) {
  const title = episode?.title || episode?.uuid;
  const statusLabel = episode ? (STATUS_LABELS[episode.playing_status] ?? '—') : '—';
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex gap-6">
          {episode?.podcast_image_url ? (
            <img
              src={episode.podcast_image_url}
              alt=""
              className="w-24 h-24 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0 flex items-center justify-center text-4xl">
              🎙
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
            {episode?.podcast_uuid && (
              <Link
                to={`/podcasts/${episode.podcast_uuid}`}
                className="inline-block mt-2 text-slate-600 dark:text-slate-300 hover:underline"
              >
                {episode.podcast_title || 'Podcast'}
              </Link>
            )}
            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500 dark:text-slate-400">Status</dt>
            <dd className="font-medium">{statusLabel}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500 dark:text-slate-400">Duration</dt>
            <dd className="font-medium">{formatDuration(episode?.duration)}</dd>
          </div>
          {episode?.completion_percentage != null && (
            <div>
              <dt className="text-sm text-slate-500 dark:text-slate-400">Completion</dt>
              <dd className="font-medium">{Number(episode.completion_percentage).toFixed(0)}%</dd>
            </div>
          )}
          {episode?.play_count != null && (
            <div>
              <dt className="text-sm text-slate-500 dark:text-slate-400">Play count</dt>
              <dd className="font-medium">{episode.play_count}</dd>
            </div>
          )}
          {episode?.file_url && (
            <div className="sm:col-span-2">
              <dt className="text-sm text-slate-500 dark:text-slate-400">Episode link</dt>
              <dd>
                <a
                  href={episode.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 dark:text-slate-300 hover:underline inline-flex items-center gap-1 break-all"
                >
                  {episode.file_url}
                  <span aria-hidden className="text-slate-400 shrink-0">↗</span>
                </a>
              </dd>
            </div>
          )}
        </dl>
        {episode?.description && (
          <p className="mt-4 text-slate-600 dark:text-slate-300 text-sm line-clamp-4">
            {episode.description}
          </p>
        )}
          </div>
        </div>
      </div>

      {episode?.file_url && (
        <AudioPlayer
          episode={episode}
          history={history}
          onHistoryUpdated={onHistoryUpdated}
        />
      )}

      {history && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Listening history
          </h2>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500 dark:text-slate-400">First played</dt>
              <dd>{formatDate(history.first_played_at)}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500 dark:text-slate-400">Last played</dt>
              <dd>{formatDate(history.last_played_at)}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500 dark:text-slate-400">Played up to</dt>
              <dd>{formatDuration(history.played_up_to)}</dd>
            </div>
          </dl>
        </div>
      )}

      {sessions?.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Play sessions
          </h2>
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700 pb-2 last:border-0"
              >
                <span>{formatDate(s.started_at)}</span>
                {s.ended_at && <span>→ {formatDate(s.ended_at)}</span>}
                {s.duration_seconds != null && (
                  <span>{formatDuration(s.duration_seconds)} listened</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
