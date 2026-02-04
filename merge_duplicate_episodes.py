#!/usr/bin/env python3
"""
Merge duplicate podcast episodes (same podcast, same normalized title, same/close published_date).
Reassigns listening_history and play_sessions to a canonical episode per group, then removes duplicate episode rows.
Safe to run after deployment to clean existing DBs.
"""
import argparse
from pathlib import Path

from config import get_db_path
from database import init_schema
from api.services.duplicate_episode_merge import merge_duplicate_episodes, DuplicateEpisodeMergeReport


def main() -> None:
    parser = argparse.ArgumentParser(description="Merge duplicate episodes and print report.")
    parser.add_argument(
        "--db",
        type=Path,
        default=None,
        help="Path to SQLite database (default: from config)",
    )
    parser.add_argument(
        "--init-schema",
        action="store_true",
        help="Initialize schema before merging (default: no)",
    )
    args = parser.parse_args()
    db_path = args.db or get_db_path()
    if args.init_schema:
        init_schema(db_path)
    report = merge_duplicate_episodes(db_path=db_path)
    print(f"Podcasts processed: {report.podcasts_processed}")
    print(f"Duplicate groups merged: {report.duplicate_groups}")
    print(f"Episode rows removed: {report.episodes_removed}")


if __name__ == "__main__":
    main()
