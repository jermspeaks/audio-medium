#!/usr/bin/env python3
"""
Analytics and statistics for listening history.
Total hours, completion rates, top podcasts, and common queries.
"""
from pathlib import Path
from typing import Optional, List, Dict, Any

from config import get_db_path
from database import get_connection


def total_listening_hours(db_path: Optional[Path] = None) -> float:
    """Total time listened (played_up_to summed) in hours."""
    db_path = db_path or get_db_path()
    with get_connection(db_path) as conn:
        row = conn.execute(
            "SELECT COALESCE(SUM(played_up_to), 0) AS total FROM listening_history"
        ).fetchone()
        return (row["total"] or 0) / 3600.0


def total_episodes_in_library(db_path: Optional[Path] = None) -> int:
    """Number of episodes in listening history (library)."""
    db_path = db_path or get_db_path()
    with get_connection(db_path) as conn:
        row = conn.execute("SELECT COUNT(*) AS n FROM listening_history").fetchone()
        return row["n"] or 0


def completion_rate(db_path: Optional[Path] = None) -> Dict[str, Any]:
    """
    Completion stats: average completion %, count completed (playing_status),
    and count in-progress.
    """
    db_path = db_path or get_db_path()
    with get_connection(db_path) as conn:
        avg = conn.execute(
            "SELECT AVG(completion_percentage) AS avg_pct FROM listening_history WHERE completion_percentage IS NOT NULL"
        ).fetchone()
        # Pocket Casts: 1=not played, 2=in progress, 3=completed
        in_progress = conn.execute(
            "SELECT COUNT(*) AS n FROM listening_history WHERE playing_status = 2"
        ).fetchone()
        completed = conn.execute(
            "SELECT COUNT(*) AS n FROM listening_history WHERE playing_status = 3"
        ).fetchone()
        return {
            "average_completion_percent": round((avg["avg_pct"] or 0), 2),
            "episodes_completed": completed["n"] or 0,
            "episodes_in_progress": in_progress["n"] or 0,
        }


def top_podcasts_by_episodes(limit: int = 20, db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Top podcasts by number of episodes in listening history."""
    db_path = db_path or get_db_path()
    with get_connection(db_path) as conn:
        cur = conn.execute(
            """
            SELECT p.uuid, p.title, p.author, COUNT(lh.episode_uuid) AS episode_count,
                   SUM(lh.played_up_to) AS total_seconds
            FROM podcasts p
            JOIN listening_history lh ON lh.episode_uuid IN (SELECT uuid FROM episodes WHERE podcast_uuid = p.uuid)
            GROUP BY p.uuid
            ORDER BY episode_count DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = cur.fetchall()
        return [
            {
                "uuid": r["uuid"],
                "title": r["title"],
                "author": r["author"],
                "episode_count": r["episode_count"],
                "total_hours": round((r["total_seconds"] or 0) / 3600.0, 2),
            }
            for r in rows
        ]


def top_podcasts_by_hours(limit: int = 20, db_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Top podcasts by total listening time (hours)."""
    db_path = db_path or get_db_path()
    with get_connection(db_path) as conn:
        cur = conn.execute(
            """
            SELECT p.uuid, p.title, p.author,
                   SUM(lh.played_up_to) AS total_seconds,
                   COUNT(lh.episode_uuid) AS episode_count
            FROM podcasts p
            JOIN episodes e ON e.podcast_uuid = p.uuid
            JOIN listening_history lh ON lh.episode_uuid = e.uuid
            GROUP BY p.uuid
            ORDER BY total_seconds DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = cur.fetchall()
        return [
            {
                "uuid": r["uuid"],
                "title": r["title"],
                "author": r["author"],
                "total_hours": round((r["total_seconds"] or 0) / 3600.0, 2),
                "episode_count": r["episode_count"],
            }
            for r in rows
        ]


def summary_report(db_path: Optional[Path] = None) -> Dict[str, Any]:
    """Single summary of key stats for reports."""
    comp = completion_rate(db_path)
    return {
        "total_listening_hours": round(total_listening_hours(db_path), 2),
        "total_episodes": total_episodes_in_library(db_path),
        "average_completion_percent": comp["average_completion_percent"],
        "episodes_completed": comp["episodes_completed"],
        "episodes_in_progress": comp["episodes_in_progress"],
    }


def main():
    """Print a short summary to stdout."""
    r = summary_report()
    print("Listening history summary")
    print("  Total listening: {:.1f} hours".format(r["total_listening_hours"]))
    print("  Episodes in library: {}".format(r["total_episodes"]))
    print("  Average completion: {:.1f}%".format(r["average_completion_percent"]))
    print("  Completed: {}  In progress: {}".format(r["episodes_completed"], r["episodes_in_progress"]))
    print("\nTop podcasts by episodes:")
    for p in top_podcasts_by_episodes(5):
        print("  {} ({} eps, {:.1f} h)".format(p["title"] or p["uuid"], p["episode_count"], p["total_hours"]))


if __name__ == "__main__":
    main()
