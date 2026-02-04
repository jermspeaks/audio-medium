import PodcastCard from './PodcastCard';
import PodcastTable from './PodcastTable';

const VIEW_OPTIONS = ['table', 'card-small', 'card-large'];

export default function PodcastList({ podcasts, view = 'table' }) {
  if (!podcasts?.length) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        No podcasts found.
      </p>
    );
  }
  const effectiveView = VIEW_OPTIONS.includes(view) ? view : 'table';
  if (effectiveView === 'table') {
    return <PodcastTable podcasts={podcasts} />;
  }
  const size = effectiveView === 'card-large' ? 'large' : 'small';
  const gridClass =
    size === 'large'
      ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-2'
      : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3';
  return (
    <div className={gridClass}>
      {podcasts.map((p) => (
        <PodcastCard key={p.uuid} podcast={p} size={size} />
      ))}
    </div>
  );
}
