#!/usr/bin/env python3
"""
One-time backfill: set playing_status = 1 (Not Played) for episodes that have
no listening_history row or have playing_status = 0.
Run from project root: python backfill_episode_status.py
"""
from datetime import datetime
from pathlib import Path
from typing import Optional

from config import get_db_path
from database import get_connection, upsert_listening_history


def main(db_path: Optional[Path] = None) -> None:
    db_path = db_path or get_db_path()
    inserted = 0
    updated = 0
    with get_connection(db_path) as conn:
        cur = conn.execute(
            """
            SELECT e.uuid, e.duration
            FROM episodes e
            WHERE e.deleted_at IS NULL
              AND NOT EXISTS (SELECT 1 FROM listening_history lh WHERE lh.episode_uuid = e.uuid)
            """
        )
        rows = [dict(row) for row in cur.fetchall()]
        for row in rows:
            upsert_listening_history(
                row["uuid"],
                played_up_to=0,
                duration=row["duration"] if row["duration"] is not None else 0,
                playing_status=1,
                conn=conn,
            )
            inserted += 1
        now = datetime.utcnow().isoformat() + "Z"
        cur = conn.execute(
            "UPDATE listening_history SET playing_status = 1, updated_at = ? WHERE playing_status = 0",
            (now,),
        )
        updated = cur.rowcount
    print(f"Backfill complete: {inserted} inserted, {updated} updated.")


if __name__ == "__main__":
    main()
