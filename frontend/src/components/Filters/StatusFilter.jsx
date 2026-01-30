export const PLAYING_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: '1', label: 'Not played' },
  { value: '2', label: 'In progress' },
  { value: '3', label: 'Completed' },
  { value: 'played', label: 'Played' },
];

export default function StatusFilter({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 text-sm"
    >
      {PLAYING_STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
