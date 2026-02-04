import { Link } from 'react-router-dom';

function PodcastImageCell({ podcast }) {
  const title = podcast.title || podcast.uuid;
  if (podcast.image_url) {
    return (
      <img
        src={podcast.image_url}
        alt=""
        className="w-10 h-10 rounded-lg object-cover shrink-0"
      />
    );
  }
  const initial = title.trim().slice(0, 1).toUpperCase() || '?';
  return (
    <div
      className="w-10 h-10 rounded-lg bg-muted shrink-0 flex items-center justify-center text-muted-foreground font-semibold text-sm"
      aria-label={title}
      title={title}
    >
      {initial}
    </div>
  );
}

export default function PodcastTable({ podcasts }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left py-3 pl-4 pr-2 font-medium text-muted-foreground w-14" scope="col">Image</th>
            <th className="text-left py-3 px-2 font-medium text-muted-foreground" scope="col">Title</th>
            <th className="text-left py-3 pr-4 pl-2 font-medium text-muted-foreground w-48" scope="col">Author</th>
          </tr>
        </thead>
        <tbody>
          {podcasts.map((p) => {
            const title = p.title || p.uuid;
            return (
              <tr key={p.uuid} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="py-2 pl-4 pr-2 align-middle">
                  <Link to={`/podcasts/${p.uuid}`} className="block w-10">
                    <PodcastImageCell podcast={p} />
                  </Link>
                </td>
                <td className="py-2 px-2 align-middle min-w-0">
                  <Link to={`/podcasts/${p.uuid}`} className="font-medium text-foreground hover:underline truncate block">
                    {title}
                  </Link>
                </td>
                <td className="py-2 pr-4 pl-2 align-middle text-muted-foreground">
                  <Link to={`/podcasts/${p.uuid}`} className="hover:text-foreground truncate block">
                    {p.author ?? '—'}
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
