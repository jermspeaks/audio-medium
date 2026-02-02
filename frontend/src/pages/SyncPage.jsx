import { useEffect, useState, useRef } from 'react';
import {
  getSyncStatus,
  getSyncHistory,
  triggerSync,
  syncFromUpload,
} from '../api/sync';
import Loading from '../components/Common/Loading';
import ErrorState from '../components/Common/ErrorState';

function formatTimestamp(ts) {
  if (!ts) return null;
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return ts;
  }
}

export default function SyncPage() {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [lastReport, setLastReport] = useState(null);
  const fileInputRef = useRef(null);

  async function fetchData() {
    setError(null);
    try {
      const [s, h] = await Promise.all([
        getSyncStatus(),
        getSyncHistory({ limit: 20, offset: 0 }),
      ]);
      setStatus(s);
      setHistory(Array.isArray(h) ? h : []);
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Failed to load sync status');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await fetchData();
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function handleSyncNow() {
    setActionError(null);
    setSyncing(true);
    try {
      const report = await triggerSync();
      setLastReport(report);
      await fetchData();
    } catch (e) {
      setActionError(e.response?.data?.detail || e.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function handleFileChange(e) {
    const file = e.target?.files?.[0];
    if (!file) return;
    setActionError(null);
    setLastReport(null);
    setUploading(true);
    try {
      const report = await syncFromUpload(file);
      setLastReport(report);
      await fetchData();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      setActionError(e.response?.data?.detail || e.message || 'Upload and sync failed');
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Sync from Pocket Casts
      </h1>

      {actionError && (
        <ErrorState message={actionError} />
      )}

      <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Last sync
        </h2>
        {status?.last_sync_timestamp ? (
          <div className="text-slate-600 dark:text-slate-300 space-y-1">
            <p>{formatTimestamp(status.last_sync_timestamp)}</p>
            {status.last_sync_source_path && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Source: {status.last_sync_source_path}
              </p>
            )}
            {(status.last_sync_podcasts_added != null || status.last_sync_episodes_added != null) && (
              <p className="text-sm">
                Last run: +{status.last_sync_podcasts_added ?? 0} podcasts, +{status.last_sync_episodes_added ?? 0} episodes
              </p>
            )}
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400">
            Not synced yet. Use &quot;Sync now&quot; (if the export is in the default folder) or upload a Pocket Casts export ZIP below.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Sync options
        </h2>
        <div className="flex flex-wrap gap-4 items-center">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={syncing || uploading}
            className="px-4 py-2 rounded-md bg-slate-700 dark:bg-slate-600 text-white hover:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-300">
              Or upload export ZIP:
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileChange}
              disabled={syncing || uploading}
              className="block text-sm text-slate-500 dark:text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 dark:file:bg-slate-700 dark:file:text-slate-200"
            />
            {uploading && <span className="text-sm text-slate-500">Uploading…</span>}
          </div>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          &quot;Sync now&quot; uses the default export path on the server. Upload a ZIP if your export is on this device.
        </p>
      </section>

      {lastReport && (
        <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
            Last run summary
          </h2>
          <ul className="text-slate-600 dark:text-slate-300 text-sm space-y-1">
            <li>Podcasts: +{lastReport.podcasts_added ?? 0} added, {lastReport.podcasts_updated ?? 0} updated, {lastReport.podcasts_deleted ?? 0} deleted</li>
            <li>Episodes: +{lastReport.episodes_added ?? 0} added, {lastReport.episodes_updated ?? 0} updated, {lastReport.episodes_deleted ?? 0} deleted</li>
            <li>Conflicts resolved: {lastReport.conflicts_count ?? 0}</li>
          </ul>
        </section>
      )}

      {history.length > 0 && (
        <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">
            Sync history
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-slate-600 dark:text-slate-300">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-600">
                  <th className="text-left py-2 pr-4 font-medium">When</th>
                  <th className="text-left py-2 pr-4 font-medium">Source</th>
                  <th className="text-left py-2 pr-4 font-medium">Podcasts</th>
                  <th className="text-left py-2 pr-4 font-medium">Episodes</th>
                  <th className="text-left py-2 font-medium">Conflicts</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id ?? entry.sync_timestamp} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-2 pr-4">{formatTimestamp(entry.sync_timestamp)}</td>
                    <td className="py-2 pr-4 truncate max-w-48" title={entry.source_path ?? ''}>
                      {entry.source_path ?? '—'}
                    </td>
                    <td className="py-2 pr-4">+{entry.podcasts_added ?? 0} / {entry.podcasts_updated ?? 0}</td>
                    <td className="py-2 pr-4">+{entry.episodes_added ?? 0} / {entry.episodes_updated ?? 0}</td>
                    <td className="py-2">{entry.conflicts_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
