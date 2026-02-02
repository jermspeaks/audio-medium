import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import PodcastsPage from './pages/PodcastsPage';
import PodcastDetailPage from './pages/PodcastDetailPage';
import EpisodesPage from './pages/EpisodesPage';
import EpisodeDetailPage from './pages/EpisodeDetailPage';
import SearchPage from './pages/SearchPage';
import SyncPage from './pages/SyncPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="podcasts" element={<PodcastsPage />} />
          <Route path="podcasts/:uuid" element={<PodcastDetailPage />} />
          <Route path="episodes" element={<EpisodesPage />} />
          <Route path="episodes/:uuid" element={<EpisodeDetailPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="sync" element={<SyncPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
