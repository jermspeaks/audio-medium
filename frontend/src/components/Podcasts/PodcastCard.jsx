import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

export default function PodcastCard({ podcast }) {
  const title = podcast.title || podcast.uuid;
  return (
    <Link to={`/podcasts/${podcast.uuid}`} className="block">
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {podcast.image_url ? (
              <img
                src={podcast.image_url}
                alt=""
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex-shrink-0 flex items-center justify-center text-muted-foreground text-2xl">
                🎙
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-card-foreground truncate">{title}</h3>
              {podcast.author && (
                <p className="text-sm text-muted-foreground truncate">{podcast.author}</p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {podcast.episode_count ?? 0} episodes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
