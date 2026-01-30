#!/usr/bin/env python3
"""
Database schema and operations for listening history.
Creates and manages podcasts, episodes, listening_history, and play_sessions tables.
"""
import sqlite3
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from contextlib import contextmanager

# Schema version for migrations
SCHEMA_VERSION = 1

CREATE_PODCASTS = """
CREATE TABLE IF NOT EXISTS podcasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    title TEXT,
    author TEXT,
    description TEXT,
    feed_url TEXT,
    image_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"""

CREATE_EPISODES = """
CREATE TABLE IF NOT EXISTS episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT UNIQUE NOT NULL,
    podcast_uuid TEXT NOT NULL,
    title TEXT,
    description TEXT,
    duration REAL,
    published_date REAL,
    file_url TEXT,
    file_type TEXT,
    size_bytes INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (podcast_uuid) REFERENCES podcasts(uuid)
);
"""

CREATE_LISTENING_HISTORY = """
CREATE TABLE IF NOT EXISTS listening_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_uuid TEXT NOT NULL UNIQUE,
    played_up_to REAL NOT NULL DEFAULT 0,
    duration REAL NOT NULL DEFAULT 0,
    playing_status INTEGER NOT NULL DEFAULT 0,
    episode_status INTEGER,
    completion_percentage REAL,
    first_played_at TEXT,
    last_played_at TEXT,
    play_count INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (episode_uuid) REFERENCES episodes(uuid)
);
"""

CREATE_PLAY_SESSIONS = """
CREATE TABLE IF NOT EXISTS play_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_uuid TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_seconds REAL,
    played_from REAL NOT NULL DEFAULT 0,
    played_to REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (episode_uuid) REFERENCES episodes(uuid)
);
"""

CREATE_INDEXES = [
    "CREATE INDEX IF NOT EXISTS idx_episodes_podcast_uuid ON episodes(podcast_uuid);",
    "CREATE INDEX IF NOT EXISTS idx_episodes_uuid ON episodes(uuid);",
    "CREATE INDEX IF NOT EXISTS idx_listening_history_episode_uuid ON listening_history(episode_uuid);",
    "CREATE INDEX IF NOT EXISTS idx_listening_history_last_played ON listening_history(last_played_at);",
    "CREATE INDEX IF NOT EXISTS idx_play_sessions_episode_uuid ON play_sessions(episode_uuid);",
]

CREATE_META = """
CREATE TABLE IF NOT EXISTS _schema_meta (
    key TEXT PRIMARY KEY,
    value TEXT
);
"""


def _iso_now() -> str:
    return datetime.utcnow().isoformat() + "Z"


@contextmanager
def get_connection(db_path: Optional[Path] = None):
    """Context manager for database connection with foreign keys enabled."""
    from config import get_db_path
    path = db_path or get_db_path()
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = 1")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_schema(db_path: Optional[Path] = None) -> None:
    """Create all tables and indexes if they do not exist."""
    with get_connection(db_path) as conn:
        conn.execute(CREATE_PODCASTS)
        conn.execute(CREATE_EPISODES)
        conn.execute(CREATE_LISTENING_HISTORY)
        conn.execute(CREATE_PLAY_SESSIONS)
        conn.execute(CREATE_META)
        for sql in CREATE_INDEXES:
            conn.execute(sql)
        conn.execute(
            "INSERT OR REPLACE INTO _schema_meta (key, value) VALUES (?, ?)",
            ("schema_version", str(SCHEMA_VERSION)),
        )


def upsert_podcast(
    uuid: str,
    title: Optional[str] = None,
    author: Optional[str] = None,
    description: Optional[str] = None,
    feed_url: Optional[str] = None,
    image_url: Optional[str] = None,
    db_path: Optional[Path] = None,
    conn: Optional[sqlite3.Connection] = None,
) -> None:
    """Insert or update a podcast by uuid."""
    now = _iso_now()
    if conn is not None:
        conn.execute(
            """
            INSERT INTO podcasts (uuid, title, author, description, feed_url, image_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(uuid) DO UPDATE SET
                title = COALESCE(excluded.title, title),
                author = COALESCE(excluded.author, author),
                description = COALESCE(excluded.description, description),
                feed_url = COALESCE(excluded.feed_url, feed_url),
                image_url = COALESCE(excluded.image_url, image_url),
                updated_at = excluded.updated_at
            """,
            (uuid, title, author, description, feed_url, image_url, now, now),
        )
        return
    with get_connection(db_path) as c:
        c.execute(
            """
            INSERT INTO podcasts (uuid, title, author, description, feed_url, image_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(uuid) DO UPDATE SET
                title = COALESCE(excluded.title, title),
                author = COALESCE(excluded.author, author),
                description = COALESCE(excluded.description, description),
                feed_url = COALESCE(excluded.feed_url, feed_url),
                image_url = COALESCE(excluded.image_url, image_url),
                updated_at = excluded.updated_at
            """,
            (uuid, title, author, description, feed_url, image_url, now, now),
        )


def upsert_episode(
    uuid: str,
    podcast_uuid: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    duration: Optional[float] = None,
    published_date: Optional[float] = None,
    file_url: Optional[str] = None,
    file_type: Optional[str] = None,
    size_bytes: Optional[int] = None,
    db_path: Optional[Path] = None,
    conn: Optional[sqlite3.Connection] = None,
) -> None:
    """Insert or update an episode by uuid."""
    now = _iso_now()
    params = (uuid, podcast_uuid, title, description, duration, published_date, file_url, file_type, size_bytes, now, now)
    sql = """
        INSERT INTO episodes (uuid, podcast_uuid, title, description, duration, published_date, file_url, file_type, size_bytes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(uuid) DO UPDATE SET
            podcast_uuid = excluded.podcast_uuid,
            title = COALESCE(excluded.title, title),
            description = COALESCE(excluded.description, description),
            duration = COALESCE(excluded.duration, duration),
            published_date = COALESCE(excluded.published_date, published_date),
            file_url = COALESCE(excluded.file_url, file_url),
            file_type = COALESCE(excluded.file_type, file_type),
            size_bytes = COALESCE(excluded.size_bytes, size_bytes),
            updated_at = excluded.updated_at
    """
    if conn is not None:
        conn.execute(sql, params)
        return
    with get_connection(db_path) as c:
        c.execute(sql, params)


def upsert_listening_history(
    episode_uuid: str,
    played_up_to: float = 0,
    duration: float = 0,
    playing_status: int = 0,
    episode_status: Optional[int] = None,
    first_played_at: Optional[str] = None,
    last_played_at: Optional[str] = None,
    play_count: int = 1,
    db_path: Optional[Path] = None,
    conn: Optional[sqlite3.Connection] = None,
) -> None:
    """Insert or update listening history for an episode. Computes completion_percentage."""
    if duration and duration > 0:
        completion_percentage = min(100.0, (played_up_to / duration) * 100.0)
    else:
        completion_percentage = None
    now = _iso_now()
    first_played_at = first_played_at or now
    last_played_at = last_played_at or now
    params = (episode_uuid, played_up_to, duration, playing_status, episode_status, completion_percentage, first_played_at, last_played_at, play_count, now, now)
    sql = """
        INSERT INTO listening_history (episode_uuid, played_up_to, duration, playing_status, episode_status, completion_percentage, first_played_at, last_played_at, play_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(episode_uuid) DO UPDATE SET
            played_up_to = excluded.played_up_to,
            duration = excluded.duration,
            playing_status = excluded.playing_status,
            episode_status = excluded.episode_status,
            completion_percentage = excluded.completion_percentage,
            first_played_at = COALESCE(listening_history.first_played_at, excluded.first_played_at),
            last_played_at = excluded.last_played_at,
            play_count = excluded.play_count,
            updated_at = excluded.updated_at
    """
    if conn is not None:
        conn.execute(sql, params)
        return
    with get_connection(db_path) as c:
        c.execute(sql, params)


def add_play_session(
    episode_uuid: str,
    started_at: str,
    ended_at: Optional[str] = None,
    duration_seconds: Optional[float] = None,
    played_from: float = 0,
    played_to: float = 0,
    db_path: Optional[Path] = None,
) -> None:
    """Insert a play session record."""
    with get_connection(db_path) as conn:
        conn.execute(
            """
            INSERT INTO play_sessions (episode_uuid, started_at, ended_at, duration_seconds, played_from, played_to)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (episode_uuid, started_at, ended_at, duration_seconds, played_from, played_to),
        )


def get_listening_history_list(db_path: Optional[Path] = None, limit: int = 1000) -> List[Dict[str, Any]]:
    """Return listening history rows for querying/analytics."""
    with get_connection(db_path) as conn:
        cur = conn.execute(
            "SELECT * FROM listening_history ORDER BY last_played_at DESC LIMIT ?",
            (limit,),
        )
        return [dict(row) for row in cur.fetchall()]


def get_all_podcasts(
    db_path: Optional[Path] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """List all podcasts with optional search (title/author) and pagination."""
    with get_connection(db_path) as conn:
        sql = """
            SELECT p.*, (SELECT COUNT(*) FROM episodes e WHERE e.podcast_uuid = p.uuid) AS episode_count
            FROM podcasts p
            WHERE 1=1
        """
        params: list = []
        if search:
            sql += " AND (p.title LIKE ? OR p.author LIKE ?)"
            term = f"%{search}%"
            params.extend([term, term])
        sql += " ORDER BY p.title ASC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        cur = conn.execute(sql, params)
        return [dict(row) for row in cur.fetchall()]


def get_podcast_by_uuid(uuid: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Get single podcast by uuid with episode count."""
    with get_connection(db_path) as conn:
        cur = conn.execute(
            """
            SELECT p.*, (SELECT COUNT(*) FROM episodes e WHERE e.podcast_uuid = p.uuid) AS episode_count
            FROM podcasts p
            WHERE p.uuid = ?
            """,
            (uuid,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def get_episodes_by_podcast(
    podcast_uuid: str,
    db_path: Optional[Path] = None,
    limit: int = 100,
    offset: int = 0,
    playing_status: Optional[Union[int, str]] = None,
) -> List[Dict[str, Any]]:
    """List episodes for a podcast, optionally filtered by playing_status (1=not played, 2=in progress, 3=completed, 'played'=2 or 3)."""
    with get_connection(db_path) as conn:
        sql = """
            SELECT e.*, lh.played_up_to, lh.playing_status, lh.completion_percentage,
                   lh.first_played_at, lh.last_played_at, lh.play_count
            FROM episodes e
            LEFT JOIN listening_history lh ON lh.episode_uuid = e.uuid
            WHERE e.podcast_uuid = ?
        """
        params: list = [podcast_uuid]
        if playing_status is not None:
            if playing_status == "played":
                sql += " AND lh.playing_status IN (2, 3)"
            else:
                sql += " AND lh.playing_status = ?"
                params.append(playing_status)
        sql += " ORDER BY lh.last_played_at DESC NULLS LAST, e.published_date DESC NULLS LAST LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        cur = conn.execute(sql, params)
        return [dict(row) for row in cur.fetchall()]


def get_episode_by_uuid(uuid: str, db_path: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Get single episode by uuid with podcast and listening history."""
    with get_connection(db_path) as conn:
        cur = conn.execute(
            """
            SELECT e.*, p.title AS podcast_title, p.author AS podcast_author, p.image_url AS podcast_image_url,
                   lh.played_up_to, lh.playing_status, lh.episode_status, lh.completion_percentage,
                   lh.first_played_at, lh.last_played_at, lh.play_count
            FROM episodes e
            LEFT JOIN podcasts p ON p.uuid = e.podcast_uuid
            LEFT JOIN listening_history lh ON lh.episode_uuid = e.uuid
            WHERE e.uuid = ?
            """,
            (uuid,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def get_listening_history_by_episode(
    episode_uuid: str, db_path: Optional[Path] = None
) -> Optional[Dict[str, Any]]:
    """Get listening history for an episode."""
    with get_connection(db_path) as conn:
        cur = conn.execute(
            "SELECT * FROM listening_history WHERE episode_uuid = ?",
            (episode_uuid,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def get_play_sessions_by_episode(
    episode_uuid: str,
    db_path: Optional[Path] = None,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    """Get play sessions for an episode, newest first."""
    with get_connection(db_path) as conn:
        cur = conn.execute(
            """
            SELECT * FROM play_sessions
            WHERE episode_uuid = ?
            ORDER BY started_at DESC
            LIMIT ?
            """,
            (episode_uuid, limit),
        )
        return [dict(row) for row in cur.fetchall()]


def search_podcasts(
    q: str,
    db_path: Optional[Path] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """Search podcasts by title or author."""
    with get_connection(db_path) as conn:
        term = f"%{q}%"
        cur = conn.execute(
            """
            SELECT p.*, (SELECT COUNT(*) FROM episodes e WHERE e.podcast_uuid = p.uuid) AS episode_count
            FROM podcasts p
            WHERE p.title LIKE ? OR p.author LIKE ?
            ORDER BY p.title
            LIMIT ?
            """,
            (term, term, limit),
        )
        return [dict(row) for row in cur.fetchall()]


def search_episodes(
    q: str,
    db_path: Optional[Path] = None,
    podcast_uuid: Optional[str] = None,
    playing_status: Optional[Union[int, str]] = None,
    limit: int = 50,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    """Search episodes by title, optionally filtered by podcast and playing_status (1=not played, 2=in progress, 3=completed, 'played'=2 or 3)."""
    with get_connection(db_path) as conn:
        term = f"%{q}%"
        sql = """
            SELECT e.*, p.title AS podcast_title, lh.played_up_to, lh.playing_status,
                   lh.completion_percentage, lh.last_played_at
            FROM episodes e
            LEFT JOIN podcasts p ON p.uuid = e.podcast_uuid
            LEFT JOIN listening_history lh ON lh.episode_uuid = e.uuid
            WHERE e.title LIKE ?
        """
        params: list = [term]
        if podcast_uuid:
            sql += " AND e.podcast_uuid = ?"
            params.append(podcast_uuid)
        if playing_status is not None:
            if playing_status == "played":
                sql += " AND lh.playing_status IN (2, 3)"
            else:
                sql += " AND lh.playing_status = ?"
                params.append(playing_status)
        sql += " ORDER BY lh.last_played_at DESC NULLS LAST LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        cur = conn.execute(sql, params)
        return [dict(row) for row in cur.fetchall()]


def get_episodes_list(
    db_path: Optional[Path] = None,
    limit: int = 100,
    offset: int = 0,
    podcast_uuid: Optional[str] = None,
    playing_status: Optional[Union[int, str]] = None,
) -> List[Dict[str, Any]]:
    """List episodes with optional filters for API list endpoint. playing_status: 1=not played, 2=in progress, 3=completed, 'played'=2 or 3."""
    with get_connection(db_path) as conn:
        sql = """
            SELECT e.*, p.title AS podcast_title, p.author AS podcast_author,
                   lh.played_up_to, lh.playing_status, lh.completion_percentage,
                   lh.first_played_at, lh.last_played_at, lh.play_count
            FROM episodes e
            LEFT JOIN podcasts p ON p.uuid = e.podcast_uuid
            LEFT JOIN listening_history lh ON lh.episode_uuid = e.uuid
            WHERE 1=1
        """
        params: list = []
        if podcast_uuid:
            sql += " AND e.podcast_uuid = ?"
            params.append(podcast_uuid)
        if playing_status is not None:
            if playing_status == "played":
                sql += " AND lh.playing_status IN (2, 3)"
            else:
                sql += " AND lh.playing_status = ?"
                params.append(playing_status)
        sql += " ORDER BY lh.last_played_at DESC NULLS LAST LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        cur = conn.execute(sql, params)
        return [dict(row) for row in cur.fetchall()]


def get_last_sync_timestamp(
    db_path: Optional[Path] = None,
    conn: Optional[sqlite3.Connection] = None,
) -> Optional[str]:
    """Return the last sync timestamp (ISO string) from _schema_meta, or None if never synced."""
    if conn is not None:
        cur = conn.execute(
            "SELECT value FROM _schema_meta WHERE key = ?",
            ("last_sync_timestamp",),
        )
        row = cur.fetchone()
        return row["value"] if row else None
    with get_connection(db_path) as c:
        return get_last_sync_timestamp(conn=c)


def set_last_sync_timestamp(
    timestamp: str,
    db_path: Optional[Path] = None,
    conn: Optional[sqlite3.Connection] = None,
) -> None:
    """Store the last sync timestamp (ISO string) in _schema_meta."""
    if conn is not None:
        conn.execute(
            "INSERT OR REPLACE INTO _schema_meta (key, value) VALUES (?, ?)",
            ("last_sync_timestamp", timestamp),
        )
        return
    with get_connection(db_path) as c:
        set_last_sync_timestamp(timestamp, conn=c)


if __name__ == "__main__":
    init_schema()
    print("Schema initialized.")
