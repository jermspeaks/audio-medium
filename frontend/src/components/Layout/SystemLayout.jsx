import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/system/stats', label: 'Stats' },
  { to: '/system/sync', label: 'Sync' },
  { to: '/system/settings', label: 'Settings' },
];

export default function SystemLayout() {
  return (
    <div className="flex gap-8">
      <aside className="w-48 shrink-0">
        <nav className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-sm">
          <ul className="space-y-1">
            {navItems.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-slate-100'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
                    }`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
