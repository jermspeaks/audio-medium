import PodcastCard from './PodcastCard';

export default function PodcastList({ podcasts }) {
  if (!podcasts?.length) {
    return (
      <p className="text-slate-500 dark:text-slate-400 py-8 text-center">
        No podcasts found.
      </p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {podcasts.map((p) => (
        <PodcastCard key={p.uuid} podcast={p} />
      ))}
    </div>
  );
}
