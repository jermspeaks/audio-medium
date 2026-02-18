import { useRef } from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import AudioPlayer from "./AudioPlayer";
import ProgressRadial from "./ProgressRadial";
import { sanitizeHtml } from "../../utils/sanitizeHtml";

const STATUS_LABELS = { 1: "Not played", 2: "In progress", 3: "Completed" };

function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function getUrlDomain(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function EpisodeDetail({
  episode,
  history,
  sessions,
  onHistoryUpdated,
}) {
  const audioPlayerRef = useRef(null);
  const title = episode?.title || episode?.uuid;
  const statusLabel = episode
    ? (STATUS_LABELS[episode.playing_status] ?? "—")
    : "—";
  const completionPct = episode?.completion_percentage ?? 0;
  const hasAudio = Boolean(episode?.file_url);

  const handleRadialPlay = () => {
    const audio = audioPlayerRef.current?.audio?.current;
    if (audio) audio.play().catch(() => {});
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex gap-6">
          {episode?.podcast_image_url ? (
            <img
              src={episode.podcast_image_url}
              alt=""
              className="w-24 h-24 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-muted shrink-0 flex items-center justify-center text-4xl text-muted-foreground">
              🎙
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {episode?.podcast_uuid && (
              <Link
                to={`/podcasts/${episode.podcast_uuid}`}
                className="inline-block mt-2 text-muted-foreground hover:text-foreground hover:underline"
              >
                {episode.podcast_title || "Podcast"}
              </Link>
            )}
            <dl className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
              <div>
                <dt className="text-sm text-muted-foreground">Status</dt>
                <dd className="font-medium">{statusLabel}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Duration</dt>
                <dd className="font-medium">
                  {formatDuration(episode?.duration)}
                </dd>
              </div>
              {episode?.completion_percentage != null && (
                <div>
                  <dt className="text-sm text-muted-foreground">Completion</dt>
                  <dd className="font-medium">
                    {Number(episode.completion_percentage).toFixed(0)}%
                  </dd>
                </div>
              )}
              {episode?.play_count != null && (
                <div>
                  <dt className="text-sm text-muted-foreground">Play count</dt>
                  <dd className="font-medium">{episode.play_count}</dd>
                </div>
              )}
              {episode?.file_url && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">
                    Episode link
                  </dt>
                  <dd>
                    <a
                      href={episode.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground hover:underline inline-flex items-center gap-1 break-all"
                    >
                      {getUrlDomain(episode.file_url)}
                      <span aria-hidden className="opacity-70 shrink-0">
                        ↗
                      </span>
                    </a>
                  </dd>
                </div>
              )}
              {episode?.video_url && (
                <div className="sm:col-span-2">
                  <dt className="text-sm text-muted-foreground">Video link</dt>
                  <dd>
                    <a
                      href={episode.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground hover:underline inline-flex items-center gap-1 break-all"
                    >
                      {episode.video_url}
                      <span aria-hidden className="opacity-70 shrink-0">
                        ↗
                      </span>
                    </a>
                  </dd>
                </div>
              )}
            </dl>
            {episode?.description && (() => {
              const sanitized = sanitizeHtml(episode.description);
              return (
                <div className="mt-4">
                  <details className="group">
                    <summary className="cursor-pointer list-none text-sm text-muted-foreground [&::-webkit-details-marker]:hidden">
                      <span className="text-muted-foreground">Description</span>
                      <div
                        className="mt-1 text-foreground line-clamp-3 group-open:hidden"
                        data-description
                        dangerouslySetInnerHTML={{ __html: sanitized }}
                      />
                    </summary>
                    <div
                      className="mt-1 text-foreground text-sm"
                      data-description
                      dangerouslySetInnerHTML={{ __html: sanitized }}
                    />
                  </details>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {episode?.file_url && (
        <AudioPlayer
          ref={audioPlayerRef}
          episode={episode}
          history={history}
          onHistoryUpdated={onHistoryUpdated}
        />
      )}

      {history && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Listening history
          </h2>
          <div className="flex items-center gap-6">
            {hasAudio && (
              <div className="flex-[0_0_auto] rounded-xl border border-border bg-card p-6 flex items-center gap-6">
                <button
                  type="button"
                  onClick={handleRadialPlay}
                  className="rounded-full p-0 border-0 bg-transparent cursor-pointer text-foreground hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Play episode"
                >
                  <ProgressRadial percentage={completionPct} size="w-20 h-20">
                    <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground">
                      <Play className="w-5 h-5 fill-current shrink-0" />
                    </span>
                  </ProgressRadial>
                </button>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Amount played</p>
                  <p>{Number(completionPct).toFixed(0)}% complete</p>
                </div>
              </div>
            )}
            <dl className="flex-1 grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">First played</dt>
                <dd>{formatDate(history.first_played_at)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Last played</dt>
                <dd>{formatDate(history.last_played_at)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Played up to</dt>
                <dd>{formatDuration(history.played_up_to)}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {sessions?.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Play sessions
          </h2>
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap gap-4 text-sm text-muted-foreground border-b border-border pb-2 last:border-0"
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
