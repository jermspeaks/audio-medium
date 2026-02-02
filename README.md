# Audiophile

Import your Pocket Casts listening history from iOS into a SQLite database, run analytics from the command line, and browse everything in a **web app** (FastAPI + React).

## How to Export Pocket Casts Database from iOS

1. Open Pocket Casts on your iPhone/iPad
2. Tap **Profile** (rightmost icon)
3. Scroll down and tap **"Help & Feedback"**
4. Tap the **three-dots icon** in the top right
5. Choose **"Export database"**
6. Save the exported ZIP file to your computer (e.g., via AirDrop, email, or iCloud)

## SQLite Listening History Setup

The project uses an enhanced SQLite schema for long-term storage and analytics.

### Schema

- **podcasts** – Podcast metadata (uuid, title, author, feed_url, image_url, etc.)
- **episodes** – Episode metadata (uuid, podcast_uuid, title, duration, published_date, etc.)
- **listening_history** – One row per episode with playback progress (played_up_to, duration, playing_status, completion_percentage, first_played_at, last_played_at, play_count)
- **play_sessions** – Optional table for individual listening sessions

### Initial Import

Import from your Pocket Casts export (ZIP or already-extracted database):

```bash
# From project root; use default path: Pocket Casts Export/export.pcasts/database.sqlite3
python3 import_pocketcasts.py

# Or specify source (ZIP or database path)
python3 import_pocketcasts.py path/to/export.zip
python3 import_pocketcasts.py path/to/export.pcasts/database.sqlite3

# Custom target database
python3 import_pocketcasts.py --db /path/to/listening_history.db
```

Imports are **incremental**: existing rows are updated by uuid, so you can re-run after new exports without duplicating data.

### Configuration

- Default database path: `listening_history.db` in the project root.
- Override with environment variable: `PODCASTS_DB_PATH=/path/to/listening_history.db`

### Analytics and Reports

```bash
# Summary (total hours, episodes, completion rate, top podcasts)
python3 listening_stats.py
```

Use the `listening_stats` module in code:

```python
from listening_stats import (
    total_listening_hours,
    total_episodes_in_library,
    completion_rate,
    top_podcasts_by_episodes,
    top_podcasts_by_hours,
    summary_report,
)
```

### Ongoing Updates

1. Export the database again from Pocket Casts (same steps as above).
2. Replace or update the export folder (e.g. `Pocket Casts Export/export.pcasts/`).
3. Run the import again; only new or changed data will be merged.

```bash
python3 import_pocketcasts.py
```

### Enrich feed URLs from OPML

After importing from Pocket Casts, podcast URLs in the DB are website URLs. To set **RSS feed URLs** from an OPML file (e.g. a Pocket Casts OPML export), run:

```bash
# Uses PocketCasts.opml in project root by default
python3 enrich_feeds_from_opml.py

# Or pass an OPML file path
python3 enrich_feeds_from_opml.py path/to/your.opml
```

The script matches OPML entries to DB podcasts by **title** (normalized) and updates `feed_url` from the OPML’s `xmlUrl`. It reports how many were updated and lists any unmatched or ambiguous titles.

## Legacy: JSON and Flat SQLite (extract_pocketcasts.py)

The original script still works for one-off JSON or a single flat table:

```bash
python3 extract_pocketcasts.py path/to/pocketcasts_export.zip --json pocketcasts_history.json --sqlite podcasts.db
```

Or with an already-extracted database:

```bash
python3 extract_pocketcasts.py dummy.zip --db-path path/to/database.sqlite3 --json history.json --sqlite podcasts.db
```

## Web App

A **FastAPI** backend and **React** (Vite + Tailwind) frontend let you view listening history, stats, and play sessions in the browser.

**1. Run the API** (from project root):

```bash
pip install -r requirements.txt
uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
```

- API: `http://127.0.0.1:8000` · Docs: `http://127.0.0.1:8000/docs`

**2. Run the frontend:**

```bash
cd frontend
npm install
npm run dev
```

- App: `http://localhost:5173` (proxies `/api` to the backend)

**App routes:**

| Route | Description |
|-------|-------------|
| `/` | Stats – total hours, episodes, completion stats, top podcasts chart |
| `/podcasts` | Podcast list with search; click for detail and episodes |
| `/episodes` | Episode list with status filter; click for detail, history, play sessions |
| `/search?q=...` | Search podcasts and episodes |
| `/sync` | Sync – trigger sync from default path or upload ZIP; view status and history |

### Sync from the web app

You can sync your listening history from the web app instead of the command line.

**Backend (sync API)**

- `POST /api/sync` – Sync from the default Pocket Casts export path on the server. Requires the source database at `POCKETCASTS_SOURCE_DB_PATH` (or the default `Pocket Casts Export/export.pcasts/database.sqlite3`). Returns a sync report (podcasts/episodes added, updated, deleted; conflicts resolved).
- `POST /api/sync/upload` – Upload a Pocket Casts export ZIP file and run sync. Accepts only `.zip` files. Returns the same sync report.
- `GET /api/sync/status` – Last sync timestamp and optional summary (source path, podcasts/episodes added).
- `GET /api/sync/history` – List of past sync runs with `limit` and `offset` query parameters.

**Frontend (Sync page)**

The **Sync** page at `/sync` lets you:

- View the last sync time and source.
- Click **Sync now** to sync from the server’s default export path (fails with a clear message if the source is missing).
- Upload a Pocket Casts export ZIP to sync from your device.
- See a summary of the last run (added/updated/deleted counts, conflicts).
- Browse a table of recent sync history (timestamp, source, counts).

### Refresh metadata from RSS

You can refresh podcast metadata (title, author, description, image) from RSS feeds without running a script. Only podcasts that already have a non-empty `feed_url` are refreshed (run OPML enrichment first if needed).

**Backend**

- `POST /api/podcasts/refresh-metadata` – Fetches metadata from each podcast’s RSS feed and updates the database. Returns `podcasts_refreshed`, `podcasts_updated`, and `errors`.

**How to run**

1. Start the API (from project root):

   ```bash
   uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
   ```

2. Call the endpoint:
   - **Browser:** Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs), find **POST /api/podcasts/refresh-metadata**, click “Try it out”, then “Execute”.
   - **Terminal:** `curl -X POST http://127.0.0.1:8000/api/podcasts/refresh-metadata`

## Project layout

- `api/` – FastAPI app and routers (podcasts, episodes, stats, search, sync)
- `frontend/` – React app (Vite, React Router, Tailwind, Recharts)
- `database.py` – SQLite schema and query helpers
- `listening_stats.py` – Analytics used by CLI and API
- `import_pocketcasts.py` – Import from Pocket Casts export
- `enrich_feeds_from_opml.py` – Set podcast feed URLs from an OPML file (match by title)
- `config.py` – DB path (`PODCASTS_DB_PATH`)

## Requirements

- **Python 3.10+** for the API; **3.7+** for import/analytics scripts. See `requirements.txt`.
- **Node.js 18+** for the frontend. See `frontend/package.json`.

## Notes

- The Pocket Casts export is for troubleshooting and contains your listening history.
- You can request a GDPR data export from Pocket Casts support for a more structured dump.
