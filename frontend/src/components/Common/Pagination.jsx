export default function Pagination({ page, setPage, hasMore, loading }) {
  return (
    <div className="flex justify-center gap-4 py-4">
      <button
        type="button"
        disabled={page === 0 || loading}
        onClick={() => setPage((p) => Math.max(0, p - 1))}
        className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-300 dark:hover:bg-slate-600"
      >
        Previous
      </button>
      <span className="py-2">Page {page + 1}</span>
      <button
        type="button"
        disabled={!hasMore || loading}
        onClick={() => setPage((p) => p + 1)}
        className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-300 dark:hover:bg-slate-600"
      >
        Next
      </button>
    </div>
  );
}
