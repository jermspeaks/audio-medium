import { Link, NavLink, Outlet } from 'react-router-dom';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <Link to="/feed" className="text-xl font-semibold text-foreground">
              Audiophile
            </Link>
            <nav className="flex gap-6">
              <NavLink
                to="/feed"
                end
                className={({ isActive }) =>
                  `transition-colors ${isActive ? 'font-semibold text-foreground underline underline-offset-4' : 'text-muted-foreground hover:text-foreground'}`
                }
              >
                Feed
              </NavLink>
              <NavLink
                to="/podcasts"
                end
                className={({ isActive }) =>
                  `transition-colors ${isActive ? 'font-semibold text-foreground underline underline-offset-4' : 'text-muted-foreground hover:text-foreground'}`
                }
              >
                Podcasts
              </NavLink>
              <NavLink
                to="/podcasts/subscribe"
                className={({ isActive }) =>
                  `transition-colors ${isActive ? 'font-semibold text-foreground underline underline-offset-4' : 'text-muted-foreground hover:text-foreground'}`
                }
              >
                Subscribe
              </NavLink>
              <NavLink
                to="/search"
                className={({ isActive }) =>
                  `transition-colors ${isActive ? 'font-semibold text-foreground underline underline-offset-4' : 'text-muted-foreground hover:text-foreground'}`
                }
              >
                Search
              </NavLink>
              <NavLink
                to="/system"
                className={({ isActive }) =>
                  `transition-colors ${isActive ? 'font-semibold text-foreground underline underline-offset-4' : 'text-muted-foreground hover:text-foreground'}`
                }
              >
                System
              </NavLink>
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-border mt-auto py-4 text-center text-sm text-muted-foreground">
        Audiophile © 2026
      </footer>
    </div>
  );
}
