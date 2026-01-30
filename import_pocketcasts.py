#!/usr/bin/env python3
"""
Import listening history from Pocket Casts export database into the local SQLite schema.
Supports initial import and incremental updates (merge by uuid).
"""
import argparse
import sqlite3
import zipfile
import os
from pathlib import Path
from datetime import datetime
from typing import Optional

from config import get_db_path
from database import (
    init_schema,
    upsert_podcast,
    upsert_episode,
    upsert_listening_history,
    get_connection,
)


def _timestamp_to_iso(value: Optional[float]) -> Optional[str]:
    """Convert Pocket Casts REAL timestamp (seconds since epoch or Cocoa epoch) to ISO string."""
    if value is None:
        return None
    try:
        # Pocket Casts on iOS often uses seconds since 2001-01-01 (Cocoa); try Unix first
        v = float(value)
        if v > 1e10:  # milliseconds
            v = v / 1000.0
        # Cocoa epoch is 978307200 seconds before Unix
        if v < 1e9:  # likely Cocoa (seconds since 2001)
            v = v + 978307200
        return datetime.utcfromtimestamp(v).strftime("%Y-%m-%dT%H:%M:%SZ")
    except (ValueError, OSError):
        return None


def extract_db_from_zip(zip_path: str, extract_dir: str = "/tmp/pocketcasts_extract") -> Optional[Path]:
    """Extract Pocket Casts database from ZIP; return path to SQLite file."""
    os.makedirs(extract_dir, exist_ok=True)
    try:
        with zipfile.ZipFile(zip_path, "r") as z:
            z.extractall(extract_dir)
        for ext in ("*.sqlite3", "*.sqlite", "*.db"):
            for f in Path(extract_dir).rglob(ext):
                return f
        return None
    except Exception as e:
        print(f"Error extracting ZIP: {e}")
        return None


def import_from_pocketcasts_db(
    source_db: Path,
    target_db: Optional[Path] = None,
    incremental: bool = True,
) -> None:
    """
    Read SJPodcast and SJEpisode from source_db and upsert into target schema.
    Uses a single transaction for all writes.
    """
    target_db = target_db or get_db_path()
    init_schema(target_db)

    src = sqlite3.connect(str(source_db))
    src.row_factory = sqlite3.Row

    try:
        # Podcasts
        cur = src.execute(
            "SELECT uuid, title, author, podcastDescription, podcastUrl, imageURL, thumbnailURL FROM SJPodcast WHERE wasDeleted = 0"
        )
        podcasts = cur.fetchall()

        # Episodes
        cur = src.execute(
            """SELECT uuid, podcastUuid, title, episodeDescription, duration, publishedDate,
                      downloadUrl, fileType, sizeInBytes, playedUpTo, playingStatus, episodeStatus,
                      addedDate, lastPlaybackInteractionDate
               FROM SJEpisode WHERE wasDeleted = 0"""
        )
        episodes = cur.fetchall()
    finally:
        src.close()

    # Single transaction for all target writes
    with get_connection(target_db) as conn:
        for row in podcasts:
            upsert_podcast(
                uuid=row["uuid"],
                title=row["title"],
                author=row["author"],
                description=row["podcastDescription"],
                feed_url=row["podcastUrl"],
                image_url=row["imageURL"] or row["thumbnailURL"],
                conn=conn,
            )
        print(f"Upserted {len(podcasts)} podcasts.")

        for row in episodes:
            uuid = row["uuid"]
            podcast_uuid = row["podcastUuid"]
            upsert_episode(
                uuid=uuid,
                podcast_uuid=podcast_uuid,
                title=row["title"],
                description=row["episodeDescription"],
                duration=row["duration"],
                published_date=row["publishedDate"],
                file_url=row["downloadUrl"],
                file_type=row["fileType"],
                size_bytes=row["sizeInBytes"],
                conn=conn,
            )
            played_up_to = row["playedUpTo"] or 0
            duration_val = row["duration"] or 0
            first_played = _timestamp_to_iso(row["addedDate"])
            last_played = _timestamp_to_iso(
                row["lastPlaybackInteractionDate"] if "lastPlaybackInteractionDate" in row.keys() else row["addedDate"]
            ) or first_played
            upsert_listening_history(
                episode_uuid=uuid,
                played_up_to=played_up_to,
                duration=duration_val,
                playing_status=row["playingStatus"] or 0,
                episode_status=row["episodeStatus"],
                first_played_at=first_played,
                last_played_at=last_played,
                play_count=1,
                conn=conn,
            )
        print(f"Upserted {len(episodes)} episodes and listening history.")


def main():
    parser = argparse.ArgumentParser(
        description="Import Pocket Casts listening history from export into SQLite."
    )
    parser.add_argument(
        "source",
        nargs="?",
        help="Path to Pocket Casts export (ZIP) or existing database (e.g. export.pcasts/database.sqlite3)",
    )
    parser.add_argument(
        "--db",
        default=None,
        help="Target SQLite database path (default: listening_history.db)",
    )
    parser.add_argument(
        "--no-incremental",
        action="store_true",
        help="Treat run as full import (still merges by uuid).",
    )
    args = parser.parse_args()

    if not args.source:
        # Default to local export folder
        default_export = Path(__file__).resolve().parent / "Pocket Casts Export" / "export.pcasts" / "database.sqlite3"
        if default_export.exists():
            args.source = str(default_export)
        else:
            parser.error("Provide source (ZIP or database path), or place export at 'Pocket Casts Export/export.pcasts/database.sqlite3'")
    source = Path(args.source)
    target = Path(args.db) if args.db else get_db_path()

    if source.suffix.lower() == ".zip":
        db_path = extract_db_from_zip(str(source))
        if not db_path:
            print("No database found in ZIP.")
            return
        source = db_path

    if not source.exists():
        print(f"Source not found: {source}")
        return

    import_from_pocketcasts_db(source, target_db=target, incremental=not args.no_incremental)
    print(f"Done. Database: {target}")


if __name__ == "__main__":
    main()
