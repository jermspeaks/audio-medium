import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Pagination({
  page,
  setPage,
  hasMore,
  loading,
  totalPages = null,
  total = null,
}) {
  const currentPage1 = page + 1;
  const hasPrev = page > 0 && !loading;
  const hasNext = (totalPages != null ? currentPage1 < totalPages : hasMore) && !loading;
  const [goToValue, setGoToValue] = useState('');

  const handleGoToSubmit = (e) => {
    e.preventDefault();
    const num = parseInt(goToValue, 10);
    if (!Number.isFinite(num) || num < 1) return;
    const maxPage = totalPages != null ? totalPages : currentPage1 + 1;
    const clamped = Math.min(Math.max(1, num), maxPage);
    setPage(clamped - 1);
    setGoToValue('');
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 py-4">
      <Button
        type="button"
        variant="secondary"
        disabled={!hasPrev}
        onClick={() => setPage(Math.max(0, page - 1))}
      >
        Previous
      </Button>
      <span className="text-sm text-muted-foreground py-2">
        {totalPages != null ? `Page ${currentPage1} of ${totalPages}` : `Page ${currentPage1}`}
        {total != null && total > 0 && (
          <span className="ml-1">({total} total)</span>
        )}
      </span>
      <Button
        type="button"
        variant="secondary"
        disabled={!hasNext}
        onClick={() => setPage(page + 1)}
      >
        Next
      </Button>
      <form onSubmit={handleGoToSubmit} className="flex items-center gap-2">
        <label htmlFor="pagination-goto" className="text-sm text-muted-foreground sr-only">
          Go to page
        </label>
        <Input
          id="pagination-goto"
          type="number"
          min={1}
          max={totalPages ?? undefined}
          placeholder="Page"
          value={goToValue}
          onChange={(e) => setGoToValue(e.target.value)}
          className="w-20 h-8 text-sm"
        />
        <Button type="submit" variant="outline" size="sm">
          Go
        </Button>
      </form>
    </div>
  );
}
