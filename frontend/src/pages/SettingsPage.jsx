import { useState, useEffect } from 'react';
import { importOPML, removeDuplicatePodcasts } from '../api/settings';
import Loading from '../components/Common/Loading';
import ErrorState from '../components/Common/ErrorState';

export default function SettingsPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [dupLoading, setDupLoading] = useState(false);
  const [dupError, setDupError] = useState(null);
  const [dupResult, setDupResult] = useState(null);

  const handleFileChange = (e) => {
    const chosen = e.target.files?.[0];
    setFile(chosen || null);
    setReport(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const data = await importOPML(file);
      setReport(data);
    } catch (e) {
      const d = e.response?.data?.detail;
      setError(Array.isArray(d) ? d.map((x) => x.msg || JSON.stringify(x)).join('; ') : (d || e.message || 'Import failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDuplicates = async () => {
    setDupLoading(true);
    setDupError(null);
    setDupResult(null);
    try {
      const data = await removeDuplicatePodcasts();
      setDupResult(data);
    } catch (e) {
      const d = e.response?.data?.detail;
      setDupError(Array.isArray(d) ? d.map((x) => x.msg || JSON.stringify(x)).join('; ') : (d || e.message || 'Remove duplicates failed'));
    } finally {
      setDupLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Settings | Audiophile';
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>

      <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Duplicate podcasts</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Remove duplicate podcast entries (keeps the one with episodes for each feed, deletes the one with 0 episodes).
        </p>
        <button
          type="button"
          onClick={handleRemoveDuplicates}
          disabled={dupLoading}
          className="rounded-md bg-slate-800 dark:bg-slate-200 px-4 py-2 text-sm font-medium text-white dark:text-slate-900 shadow hover:bg-slate-700 dark:hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {dupLoading ? 'Removing…' : 'Remove duplicate podcasts'}
        </button>
        {dupError && <div className="mt-2"><ErrorState message={dupError} /></div>}
        {dupResult && !dupLoading && (
          <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Removed <strong className="text-slate-900 dark:text-slate-100">{dupResult.deleted_count}</strong> duplicate podcast(s).
            {dupResult.deleted_titles?.length > 0 && (
              <ul className="mt-2 list-disc list-inside">
                {dupResult.deleted_titles.slice(0, 20).map((title, i) => (
                  <li key={i}>{title}</li>
                ))}
                {dupResult.deleted_titles.length > 20 && <li>… and {dupResult.deleted_titles.length - 20} more</li>}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Import OPML</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Upload a Pocket Casts (or other) OPML file to add subscriptions and enrich podcast metadata from RSS feeds.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">OPML file</span>
            <input
              type="file"
              accept=".opml,.xml"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:rounded file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 dark:file:bg-slate-700 dark:file:text-slate-200"
            />
          </label>
          <button
            type="submit"
            disabled={!file || loading}
            className="rounded-md bg-slate-800 dark:bg-slate-200 px-4 py-2 text-sm font-medium text-white dark:text-slate-900 shadow hover:bg-slate-700 dark:hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Importing…' : 'Import'}
          </button>
        </form>
      </section>

      {loading && <Loading />}
      {error && <ErrorState message={error} />}

      {report && !loading && (
        <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Import results</h2>
          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <li>Podcasts in file: <strong className="text-slate-900 dark:text-slate-100">{report.podcasts_found}</strong></li>
            <li>Added: <strong className="text-slate-900 dark:text-slate-100">{report.podcasts_added}</strong></li>
            <li>Updated: <strong className="text-slate-900 dark:text-slate-100">{report.podcasts_updated}</strong></li>
            <li>Metadata enriched from RSS: <strong className="text-slate-900 dark:text-slate-100">{report.metadata_enriched}</strong></li>
          </ul>
          {report.errors?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Errors</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-600 dark:text-red-400">
                {report.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
