"""
Configuration for podcasts-reviewer SQLite listening history.
"""
import os
from pathlib import Path

# Default database path: listening_history.db in project root
PROJECT_ROOT = Path(__file__).resolve().parent
DEFAULT_DB_PATH = PROJECT_ROOT / "listening_history.db"

# Default Pocket Casts source database path (iOS export)
DEFAULT_SOURCE_DB_PATH = PROJECT_ROOT / "Pocket Casts Export" / "export.pcasts" / "database.sqlite3"


def get_db_path() -> Path:
    """Return the SQLite database path (env override or default)."""
    return Path(os.environ.get("PODCASTS_DB_PATH", str(DEFAULT_DB_PATH)))


def get_source_db_path() -> Path:
    """Return the Pocket Casts source database path (env override or default)."""
    return Path(
        os.environ.get("POCKETCASTS_SOURCE_DB_PATH", str(DEFAULT_SOURCE_DB_PATH))
    )
