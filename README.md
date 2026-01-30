# Pocket Casts History Extractor

Extract your Pocket Casts listening history from iOS into a normalized SQLite database, with optional JSON export and analytics.

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

## Legacy: JSON and Flat SQLite (extract_pocketcasts.py)

The original script still works for one-off JSON or a single flat table:

```bash
python3 extract_pocketcasts.py path/to/pocketcasts_export.zip --json pocketcasts_history.json --sqlite podcasts.db
```

Or with an already-extracted database:

```bash
python3 extract_pocketcasts.py dummy.zip --db-path path/to/database.sqlite3 --json history.json --sqlite podcasts.db
```

## Web App (Fullstack)

A FastAPI backend and React frontend let you browse listening history in the browser.

### Backend (API)

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run the API (from project root)
uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
```

The API serves at `http://127.0.0.1:8000`. OpenAPI docs: `http://127.0.0.1:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173` and proxies `/api` to the backend. Use the same host/port in `api/main.py` CORS `allow_origins` if you use a different dev URL.

### Routes

- **Dashboard** (`/`) – Total hours, episodes, completion stats, top podcasts chart
- **Podcasts** (`/podcasts`) – List with search; click for detail and episodes
- **Episodes** (`/episodes`) – List with status filter; click for detail, history, and play sessions
- **Search** (`/search?q=...`) – Search podcasts and episodes

## Requirements

- Python 3.10+ for the API (3.7+ for import/analytics scripts)
- Node.js 18+ for the frontend
- See `requirements.txt` (API) and `frontend/package.json` (frontend)

## Notes

- The Pocket Casts export is intended for troubleshooting but contains your listening history.
- You can also request a GDPR data export from Pocket Casts support for a more structured dump.
