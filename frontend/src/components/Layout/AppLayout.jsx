import { Link, Outlet } from 'react-router-dom';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <Link to="/" className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              Podcasts Listening History
            </Link>
            <nav className="flex gap-6">
              <Link
                to="/"
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
              >
                Dashboard
              </Link>
              <Link
                to="/podcasts"
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
              >
                Podcasts
              </Link>
              <Link
                to="/episodes"
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
              >
                Episodes
              </Link>
              <Link
                to="/search"
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
              >
                Search
              </Link>
              <Link
                to="/settings"
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
              >
                Settings
              </Link>
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 dark:border-slate-700 mt-auto py-4 text-center text-sm text-slate-500 dark:text-slate-400">
        Podcasts Listening History
      </footer>
    </div>
  );
}
