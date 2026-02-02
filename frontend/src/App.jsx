import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import SystemLayout from './components/Layout/SystemLayout';
import StatsPage from './pages/StatsPage';
import PodcastsPage from './pages/PodcastsPage';
import PodcastDetailPage from './pages/PodcastDetailPage';
import FeedPage from './pages/FeedPage';
import EpisodeDetailPage from './pages/EpisodeDetailPage';
import SearchPage from './pages/SearchPage';
import SubscribePage from './pages/SubscribePage';
import EditPodcastPage from './pages/EditPodcastPage';
import SyncPage from './pages/SyncPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<FeedPage />} />
          <Route path="feed" element={<FeedPage />} />
          <Route path="feed/:uuid" element={<EpisodeDetailPage />} />
          <Route path="podcasts" element={<PodcastsPage />} />
          <Route path="podcasts/subscribe" element={<SubscribePage />} />
          <Route path="podcasts/:uuid" element={<PodcastDetailPage />} />
          <Route path="podcasts/:uuid/edit" element={<EditPodcastPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="system" element={<SystemLayout />}>
            <Route index element={<Navigate to="/system/stats" replace />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="sync" element={<SyncPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
