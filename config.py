"""
Configuration for podcasts-reviewer SQLite listening history.
"""
import os
from pathlib import Path

# Default database path: listening_history.db in project root
PROJECT_ROOT = Path(__file__).resolve().parent
DEFAULT_DB_PATH = PROJECT_ROOT / "listening_history.db"

def get_db_path() -> Path:
    """Return the SQLite database path (env override or default)."""
    return Path(os.environ.get("PODCASTS_DB_PATH", str(DEFAULT_DB_PATH)))
