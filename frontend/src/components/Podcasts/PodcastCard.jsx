import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

const sizeClasses = {
  small: {
    wrapper: 'p-4',
    image: 'w-16 h-16 rounded-lg',
    title: 'font-semibold text-card-foreground truncate',
    meta: 'text-sm text-muted-foreground truncate mt-1',
  },
  large: {
    wrapper: 'p-5',
    image: 'w-24 h-24 rounded-xl',
    title: 'font-semibold text-card-foreground text-lg line-clamp-2',
    meta: 'text-sm text-muted-foreground mt-2',
  },
};

export default function PodcastCard({ podcast, size = 'small' }) {
  const title = podcast.title || podcast.uuid;
  const classes = sizeClasses[size] ?? sizeClasses.small;
  return (
    <Link to={`/podcasts/${podcast.uuid}`} className="block">
      <Card className="shadow-sm hover:shadow-md transition-shadow h-full">
        <CardContent className={classes.wrapper}>
          <div className="flex gap-4">
            {podcast.image_url ? (
              <img
                src={podcast.image_url}
                alt=""
                className={`${classes.image} object-cover shrink-0`}
              />
            ) : (
              <div
                className={`${classes.image} bg-muted shrink-0 flex items-center justify-center text-muted-foreground font-semibold text-lg`}
                title={title}
                aria-label={title}
              >
                {title.trim().slice(0, 1).toUpperCase() || '?'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className={classes.title}>{title}</h3>
              {podcast.author && (
                <p className="text-sm text-muted-foreground truncate">{podcast.author}</p>
              )}
              <p className={classes.meta}>
                {podcast.episode_count ?? 0} episodes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
