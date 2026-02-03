import { useState, useEffect } from 'react';
import { importOPML, removeDuplicatePodcasts } from '../api/settings';
import Loading from '../components/Common/Loading';
import ErrorState from '../components/Common/ErrorState';
import { Button } from '@/components/ui/button';

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
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-2">Duplicate podcasts</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Remove duplicate podcast entries (keeps the one with episodes for each feed, deletes the one with 0 episodes).
        </p>
        <Button
          type="button"
          onClick={handleRemoveDuplicates}
          disabled={dupLoading}
        >
          {dupLoading ? 'Removing…' : 'Remove duplicate podcasts'}
        </Button>
        {dupError && <div className="mt-2"><ErrorState message={dupError} /></div>}
        {dupResult && !dupLoading && (
          <div className="mt-4 text-sm text-muted-foreground">
            Removed <strong className="text-foreground">{dupResult.deleted_count}</strong> duplicate podcast(s).
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

      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-2">Import OPML</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Upload a Pocket Casts (or other) OPML file to add subscriptions and enrich podcast metadata from RSS feeds.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">OPML file</span>
            <input
              type="file"
              accept=".opml,.xml"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded file:border-0 file:bg-secondary file:px-4 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground"
            />
          </label>
          <Button
            type="submit"
            disabled={!file || loading}
          >
            {loading ? 'Importing…' : 'Import'}
          </Button>
        </form>
      </section>

      {loading && <Loading />}
      {error && <ErrorState message={error} />}

      {report && !loading && (
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-3">Import results</h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>Podcasts in file: <strong className="text-foreground">{report.podcasts_found}</strong></li>
            <li>Added: <strong className="text-foreground">{report.podcasts_added}</strong></li>
            <li>Updated: <strong className="text-foreground">{report.podcasts_updated}</strong></li>
            <li>Metadata enriched from RSS: <strong className="text-foreground">{report.metadata_enriched}</strong></li>
          </ul>
          {report.errors?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-foreground mb-2">Errors</h3>
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
