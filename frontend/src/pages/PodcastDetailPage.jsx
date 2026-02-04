import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPodcast, getPodcastEpisodes } from '../api/podcasts';
import PodcastDetail from '../components/Podcasts/PodcastDetail';
import Loading from '../components/Common/Loading';
import ErrorState from '../components/Common/ErrorState';
import StatusFilter from '../components/Filters/StatusFilter';
import SortOrderFilter, { PODCAST_EPISODES_SORT_OPTIONS } from '../components/Filters/SortOrderFilter';

export default function PodcastDetailPage() {
  const { uuid } = useParams();
  const [podcast, setPodcast] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingStatus, setPlayingStatus] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    if (!uuid) return;
    let cancelled = false;
    async function fetchPodcast() {
      try {
        const data = await getPodcast(uuid);
        if (!cancelled) setPodcast(data);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load podcast');
      }
    }
    fetchPodcast();
    return () => { cancelled = true; };
  }, [uuid]);

  useEffect(() => {
    if (podcast?.title) {
      document.title = `${podcast.title} | Audiophile`;
      return () => { document.title = 'Audiophile'; };
    }
  }, [podcast?.title]);

  useEffect(() => {
    if (!uuid) return;
    let cancelled = false;
    async function fetchEpisodes() {
      setLoading(true);
      try {
        const params = { limit: 200, sort: sortOrder };
        if (playingStatus) params.playing_status = playingStatus;
        const data = await getPodcastEpisodes(uuid, params);
        if (!cancelled) setEpisodes(data);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load episodes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchEpisodes();
    return () => { cancelled = true; };
  }, [uuid, playingStatus, sortOrder]);

  if (error) return <ErrorState message={error} />;
  if (!podcast && !error) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-muted-foreground">Filter by status:</span>
        <StatusFilter value={playingStatus} onChange={setPlayingStatus} />
        <span className="text-sm text-muted-foreground">Sort:</span>
        <SortOrderFilter
          options={PODCAST_EPISODES_SORT_OPTIONS}
          value={sortOrder}
          onChange={setSortOrder}
        />
      </div>
      {loading ? (
        <Loading />
      ) : (
        <PodcastDetail podcast={podcast} episodes={episodes} />
      )}
    </div>
  );
}
