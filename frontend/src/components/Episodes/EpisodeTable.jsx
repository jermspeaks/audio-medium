import { Link } from 'react-router-dom';
import ProgressRadial from './ProgressRadial';

const STATUS_LABELS = { 1: 'Not played', 2: 'In progress', 3: 'Completed' };

function formatDuration(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatPublishedDate(publishedDate) {
  if (publishedDate == null || !Number.isFinite(publishedDate)) return '—';
  return new Date(publishedDate * 1000).toLocaleDateString();
}

export default function EpisodeTable({ episodes, showPodcastColumn = true }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left py-3 pl-4 pr-2 font-medium text-muted-foreground w-14" scope="col">Icon</th>
            <th className="text-left py-3 px-2 font-medium text-muted-foreground" scope="col">{showPodcastColumn ? 'Episode · Podcast' : 'Episode'}</th>
            <th className="text-left py-3 px-2 font-medium text-muted-foreground w-28" scope="col">Date</th>
            <th className="text-left py-3 px-2 font-medium text-muted-foreground w-20" scope="col">Length</th>
            <th className="text-left py-3 px-2 font-medium text-muted-foreground w-24" scope="col">Status</th>
            <th className="text-left py-3 pr-4 pl-2 font-medium text-muted-foreground w-16" scope="col">Progress</th>
          </tr>
        </thead>
        <tbody>
          {episodes.map((ep) => {
            const title = ep.title || ep.uuid;
            const statusLabel = STATUS_LABELS[ep.playing_status] ?? '—';
            return (
              <tr key={ep.uuid} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="py-2 pl-4 pr-2 align-middle">
                  <Link to={`/feed/${ep.uuid}`} className="block w-10 h-10 rounded-lg overflow-hidden shrink-0">
                    {ep.podcast_image_url ? (
                      <img src={ep.podcast_image_url} alt="" className="w-10 h-10 object-cover" />
                    ) : (
                      <div className="w-10 h-10 bg-muted flex items-center justify-center text-muted-foreground text-lg" aria-hidden>🎙</div>
                    )}
                  </Link>
                </td>
                <td className="py-2 px-2 align-middle min-w-0">
                  <Link to={`/feed/${ep.uuid}`} className="block min-w-0">
                    <span className="font-medium text-foreground line-clamp-1">{title}</span>
                    {showPodcastColumn && ep.podcast_title && (
                      <span className="text-muted-foreground line-clamp-1 block mt-0.5">{ep.podcast_title}</span>
                    )}
                  </Link>
                </td>
                <td className="py-2 px-2 align-middle text-muted-foreground whitespace-nowrap">
                  <Link to={`/feed/${ep.uuid}`}>{formatPublishedDate(ep.published_date)}</Link>
                </td>
                <td className="py-2 px-2 align-middle text-muted-foreground whitespace-nowrap">
                  <Link to={`/feed/${ep.uuid}`}>{formatDuration(ep.duration)}</Link>
                </td>
                <td className="py-2 px-2 align-middle text-muted-foreground">
                  <Link to={`/feed/${ep.uuid}`}>{statusLabel}</Link>
                </td>
                <td className="py-2 pr-4 pl-2 align-middle">
                  <Link to={`/feed/${ep.uuid}`} className="inline-flex items-center justify-center">
                    <ProgressRadial
                      percentage={ep.completion_percentage ?? 0}
                      size="w-10 h-10"
                    />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
