import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export default function StatsDashboard({ summary, topPodcasts }) {
  const cards = [
    { label: 'Total listening (hours)', value: summary?.total_listening_hours?.toFixed(1) ?? '—' },
    { label: 'Episodes in library', value: summary?.total_episodes ?? '—' },
    { label: 'Average completion %', value: summary?.average_completion_percent?.toFixed(1) ?? '—' },
    { label: 'Completed', value: summary?.episodes_completed ?? '—' },
    { label: 'In progress', value: summary?.episodes_in_progress ?? '—' },
  ];

  const chartData = (topPodcasts ?? []).slice(0, 10).map((p) => ({
    name: (p.title || p.uuid).slice(0, 20),
    hours: p.total_hours ?? 0,
  }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Stats</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm"
          >
            <p className="text-sm text-slate-500 dark:text-slate-400">{c.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {c.value}
            </p>
          </div>
        ))}
      </div>
      {chartData.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Top podcasts by listening hours
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-600" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                />
                <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tw-bg-opacity)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '0.5rem',
                  }}
                />
                <Bar dataKey="hours" fill="#64748b" radius={[4, 4, 0, 0]} name="Hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {topPodcasts?.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Top podcasts
          </h2>
          <ul className="space-y-2">
            {topPodcasts.slice(0, 10).map((p) => (
              <li
                key={p.uuid}
                className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
              >
                <span className="font-medium text-slate-900 dark:text-slate-100 truncate pr-4">
                  {p.title || p.uuid}
                </span>
                <span className="text-slate-600 dark:text-slate-300 text-sm whitespace-nowrap">
                  {p.total_hours?.toFixed(1) ?? 0} h · {p.episode_count ?? 0} eps
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
