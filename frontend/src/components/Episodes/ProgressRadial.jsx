/**
 * Circular progress indicator. Optional children (e.g. play icon) rendered in center.
 * @param {number} percentage - 0–100
 * @param {string} [size] - Tailwind size class (e.g. 'w-10 h-10', 'w-16 h-16')
 * @param {React.ReactNode} [children]
 */
export default function ProgressRadial({ percentage = 0, size = 'w-12 h-12', children }) {
  const pct = Math.min(100, Math.max(0, Number(percentage) || 0));
  const r = 45;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={`relative inline-flex shrink-0 items-center justify-center ${size}`}>
      <svg
        className="size-full -rotate-90"
        viewBox="0 0 100 100"
        aria-hidden
      >
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/30"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          className="text-primary"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      {children != null && (
        <div className="absolute inset-0 flex items-center justify-center *:shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
