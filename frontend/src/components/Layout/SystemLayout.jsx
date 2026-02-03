import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/system/stats', label: 'Stats' },
  { to: '/system/sync', label: 'Sync' },
  { to: '/system/settings', label: 'Settings' },
  { to: '/system/colophon', label: 'Colophon' },
];

export default function SystemLayout() {
  return (
    <div className="flex gap-8">
      <aside className="w-48 shrink-0">
        <nav className="rounded-lg border border-border bg-card p-2 shadow-sm">
          <ul className="space-y-1">
            {navItems.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
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
