import { Link } from 'react-router-dom';
import PodcastCard from '../Podcasts/PodcastCard';
import EpisodeCard from '../Episodes/EpisodeCard';

export default function SearchResults({ podcasts = [], episodes = [] }) {
  return (
    <div className="space-y-8">
      {podcasts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Podcasts
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {podcasts.map((p) => (
              <PodcastCard key={p.uuid} podcast={p} />
            ))}
          </div>
        </section>
      )}
      {episodes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Episodes
          </h2>
          <div className="space-y-3">
            {episodes.map((ep) => (
              <EpisodeCard key={ep.uuid} episode={ep} showPodcast />
            ))}
          </div>
        </section>
      )}
      {podcasts.length === 0 && episodes.length === 0 && (
        <p className="text-muted-foreground py-8 text-center">
          No results found.
        </p>
      )}
    </div>
  );
}
