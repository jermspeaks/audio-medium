#!/usr/bin/env python3
"""
Import listening history from Pocket Casts export database into the local SQLite schema.
Supports initial import and incremental updates (merge by uuid), sync tracking,
conflict resolution, deletion handling, and sync reporting.
"""
import argparse
import sqlite3
import zipfile
import os
from dataclasses import dataclass
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
    set_last_sync_timestamp,
    record_sync_history,
)


@dataclass
class SyncReport:
    """Statistics from a sync run."""
    sync_timestamp: str
    source_path: Optional[str] = None
    podcasts_added: int = 0
    podcasts_updated: int = 0
    podcasts_deleted: int = 0
    episodes_added: int = 0
    episodes_updated: int = 0
    episodes_deleted: int = 0
    conflicts_count: int = 0


# Cocoa epoch: seconds between 2001-01-01 and 1970-01-01 (Unix)
_COCOA_EPOCH_OFFSET = 978307200


def _timestamp_to_iso(value: Optional[float]) -> Optional[str]:
    """Convert Pocket Casts REAL timestamp (seconds since epoch or Cocoa epoch) to ISO string."""
    if value is None:
        return None
    try:
        # Pocket Casts on iOS often uses seconds since 2001-01-01 (Cocoa); try Unix first
        v = float(value)
        if v > 1e10:  # milliseconds
            v = v / 1000.0
        if v < 1e9:  # likely Cocoa (seconds since 2001)
            v = v + _COCOA_EPOCH_OFFSET
        return datetime.utcfromtimestamp(v).strftime("%Y-%m-%dT%H:%M:%SZ")
    except (ValueError, OSError):
        return None


def _iso_to_cocoa_timestamp(iso_str: Optional[str]) -> Optional[float]:
    """Convert ISO 8601 timestamp to Cocoa epoch (seconds since 2001-01-01) for Pocket Casts comparison."""
    if not iso_str:
        return None
    try:
        # Parse ISO format (e.g. 2026-01-29T12:00:00Z)
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        unix_ts = dt.timestamp()
        return unix_ts - _COCOA_EPOCH_OFFSET
    except (ValueError, TypeError):
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


def _resolve_listening_history_conflict(
    existing: dict,
    new_played_up_to: float,
    new_first_played_at: Optional[str],
    new_last_played_at: Optional[str],
    new_play_count: int,
) -> tuple[float, Optional[str], Optional[str], int]:
    """
    Resolve conflict: played_up_to = max, first_played_at = earliest, last_played_at = latest, play_count = sum.
    Returns (played_up_to, first_played_at, last_played_at, play_count).
    """
    played_up_to = max(existing.get("played_up_to") or 0, new_played_up_to)
    first_existing = existing.get("first_played_at")
    first_played_at = new_first_played_at
    if first_existing and new_first_played_at:
        first_played_at = min(first_existing, new_first_played_at)
    elif first_existing:
        first_played_at = first_existing
    last_existing = existing.get("last_played_at")
    last_played_at = new_last_played_at
    if last_existing and new_last_played_at:
        last_played_at = max(last_existing, new_last_played_at)
    elif last_existing:
        last_played_at = last_existing
    play_count = (existing.get("play_count") or 0) + new_play_count
    return played_up_to, first_played_at, last_played_at, play_count


def import_from_pocketcasts_db(
    source_db: Path,
    target_db: Optional[Path] = None,
    incremental: bool = True,
    source_path_for_report: Optional[str] = None,
) -> SyncReport:
    """
    Read SJPodcast and SJEpisode from source_db and upsert into target schema.
    Tracks sync timestamp, handles conflicts and deletions, returns SyncReport.
    """
    target_db = target_db or get_db_path()
    init_schema(target_db)
    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    report = SyncReport(sync_timestamp=now, source_path=source_path_for_report or str(source_db))

    src = sqlite3.connect(str(source_db))
    src.row_factory = sqlite3.Row

    try:
        cur = src.execute(
            "SELECT uuid, title, author, podcastDescription, podcastUrl, imageURL, thumbnailURL, wasDeleted FROM SJPodcast"
        )
        podcasts = cur.fetchall()
        cur = src.execute(
            """SELECT uuid, podcastUuid, title, episodeDescription, duration, publishedDate,
                      downloadUrl, fileType, sizeInBytes, playedUpTo, playingStatus, episodeStatus,
                      addedDate, lastPlaybackInteractionDate, wasDeleted
               FROM SJEpisode"""
        )
        episodes = cur.fetchall()
    finally:
        src.close()

    with get_connection(target_db) as conn:
        for row in podcasts:
            uuid_val = row["uuid"]
            was_deleted = "wasDeleted" in row.keys() and row["wasDeleted"] != 0
            deleted_at = now if was_deleted else None
            if was_deleted:
                report.podcasts_deleted += 1
            cur = conn.execute("SELECT 1 FROM podcasts WHERE uuid = ?", (uuid_val,))
            existed = cur.fetchone() is not None
            if existed:
                report.podcasts_updated += 1
            else:
                report.podcasts_added += 1
            upsert_podcast(
                uuid=uuid_val,
                title=row["title"],
                author=row["author"],
                description=row["podcastDescription"],
                feed_url=row["podcastUrl"],
                website_url=row["podcastUrl"],
                image_url=row["imageURL"] or row["thumbnailURL"],
                deleted_at=deleted_at,
                conn=conn,
            )

        for row in episodes:
            uuid_val = row["uuid"]
            podcast_uuid = row["podcastUuid"]
            was_deleted = "wasDeleted" in row.keys() and row["wasDeleted"] != 0
            deleted_at = now if was_deleted else None
            if was_deleted:
                report.episodes_deleted += 1
            cur = conn.execute("SELECT 1 FROM episodes WHERE uuid = ?", (uuid_val,))
            existed = cur.fetchone() is not None
            if existed:
                report.episodes_updated += 1
            else:
                report.episodes_added += 1
            upsert_episode(
                uuid=uuid_val,
                podcast_uuid=podcast_uuid,
                title=row["title"],
                description=row["episodeDescription"],
                duration=row["duration"],
                published_date=row["publishedDate"],
                file_url=row["downloadUrl"],
                file_type=row["fileType"],
                size_bytes=row["sizeInBytes"],
                deleted_at=deleted_at,
                conn=conn,
            )

            if was_deleted:
                continue

            played_up_to = row["playedUpTo"] or 0
            duration_val = row["duration"] or 0
            first_played = _timestamp_to_iso(row["addedDate"])
            last_played = _timestamp_to_iso(
                row["lastPlaybackInteractionDate"] if "lastPlaybackInteractionDate" in row.keys() else row["addedDate"]
            ) or first_played
            playing_status = row["playingStatus"] or 0
            episode_status = row["episodeStatus"]
            play_count_new = 1

            cur = conn.execute(
                "SELECT played_up_to, first_played_at, last_played_at, play_count FROM listening_history WHERE episode_uuid = ?",
                (uuid_val,),
            )
            existing_lh = cur.fetchone()
            if existing_lh:
                report.conflicts_count += 1
                existing_dict = {
                    "played_up_to": existing_lh["played_up_to"],
                    "first_played_at": existing_lh["first_played_at"],
                    "last_played_at": existing_lh["last_played_at"],
                    "play_count": existing_lh["play_count"],
                }
                played_up_to, first_played, last_played, play_count_new = _resolve_listening_history_conflict(
                    existing_dict, played_up_to, first_played, last_played, 1
                )

            upsert_listening_history(
                episode_uuid=uuid_val,
                played_up_to=played_up_to,
                duration=duration_val,
                playing_status=playing_status,
                episode_status=episode_status,
                first_played_at=first_played,
                last_played_at=last_played,
                play_count=play_count_new,
                conn=conn,
            )

        set_last_sync_timestamp(now, conn=conn)
        record_sync_history(
            sync_timestamp=report.sync_timestamp,
            source_path=report.source_path,
            podcasts_added=report.podcasts_added,
            podcasts_updated=report.podcasts_updated,
            podcasts_deleted=report.podcasts_deleted,
            episodes_added=report.episodes_added,
            episodes_updated=report.episodes_updated,
            episodes_deleted=report.episodes_deleted,
            conflicts_count=report.conflicts_count,
            conn=conn,
        )

    return report


def _print_sync_report(report: SyncReport) -> None:
    """Print a formatted sync report to the console."""
    print("Sync report:")
    print(f"  Timestamp: {report.sync_timestamp}")
    if report.source_path:
        print(f"  Source: {report.source_path}")
    print(f"  Podcasts: +{report.podcasts_added} updated {report.podcasts_updated} deleted {report.podcasts_deleted}")
    print(f"  Episodes: +{report.episodes_added} updated {report.episodes_updated} deleted {report.episodes_deleted}")
    print(f"  Conflicts resolved: {report.conflicts_count}")


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
        default_export = Path(__file__).resolve().parent / "Pocket Casts Export" / "export.pcasts" / "database.sqlite3"
        if default_export.exists():
            args.source = str(default_export)
        else:
            parser.error("Provide source (ZIP or database path), or place export at 'Pocket Casts Export/export.pcasts/database.sqlite3'")
    source = Path(args.source)
    target = Path(args.db) if args.db else get_db_path()
    source_path_for_report: Optional[str] = str(source)

    if source.suffix.lower() == ".zip":
        db_path = extract_db_from_zip(str(source))
        if not db_path:
            print("No database found in ZIP.")
            return
        source = Path(db_path)

    if not source.exists():
        print(f"Source not found: {source}")
        return

    report = import_from_pocketcasts_db(
        source,
        target_db=target,
        incremental=not args.no_incremental,
        source_path_for_report=source_path_for_report,
    )
    _print_sync_report(report)
    print(f"Done. Database: {target}")


if __name__ == "__main__":
    main()
