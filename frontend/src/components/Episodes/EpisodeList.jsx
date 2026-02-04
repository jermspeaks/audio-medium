import EpisodeTable from './EpisodeTable';

export default function EpisodeList({ episodes }) {
  if (!episodes?.length) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        No episodes found.
      </p>
    );
  }
  return <EpisodeTable episodes={episodes} />;
}
