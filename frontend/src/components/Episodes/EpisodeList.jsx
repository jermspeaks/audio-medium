import EpisodeCard from './EpisodeCard';

export default function EpisodeList({ episodes }) {
  if (!episodes?.length) {
    return (
      <p className="text-slate-500 dark:text-slate-400 py-8 text-center">
        No episodes found.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {episodes.map((ep) => (
        <EpisodeCard key={ep.uuid} episode={ep} showPodcast />
      ))}
    </div>
  );
}
