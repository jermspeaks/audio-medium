"""Remove duplicate podcasts: keep the one with episodes, delete 0-episode duplicates."""
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, List, Dict, Any

from config import get_db_path
from database import get_connection, delete_podcast
from api.services.opml_import import _canonical_feed_url


@dataclass
class DuplicateCleanupReport:
    """Result of duplicate podcast cleanup."""
    deleted_count: int = 0
    deleted_titles: List[str] = field(default_factory=list)


def remove_duplicate_podcasts(db_path: Optional[Path] = None) -> DuplicateCleanupReport:
    """
    Find podcasts that share the same canonical feed_url; keep the one with episodes,
    delete the ones with 0 episodes. Returns report with deleted_count and deleted_titles.
    """
    db_path = db_path or get_db_path()
    report = DuplicateCleanupReport()

    with get_connection(db_path) as conn:
        cur = conn.execute(
            """SELECT p.uuid, p.title, p.feed_url,
                      (SELECT COUNT(*) FROM episodes e WHERE e.podcast_uuid = p.uuid AND e.deleted_at IS NULL) AS episode_count
               FROM podcasts p
               WHERE p.deleted_at IS NULL AND TRIM(COALESCE(p.feed_url, '')) != ''"""
        )
        rows = [dict(row) for row in cur.fetchall()]

    # Group by canonical feed_url
    by_canonical: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for row in rows:
        canonical = _canonical_feed_url(row.get("feed_url") or "")
        if not canonical:
            continue
        by_canonical[canonical].append(row)

    # For each group: if there is at least one with episode_count > 0 and one with 0, delete the 0-episode ones
    with get_connection(db_path) as conn:
        for _canonical, group in by_canonical.items():
            with_episodes = [r for r in group if (r.get("episode_count") or 0) > 0]
            without_episodes = [r for r in group if (r.get("episode_count") or 0) == 0]
            if not with_episodes or not without_episodes:
                continue
            for row in without_episodes:
                delete_podcast(row["uuid"], conn=conn)
                report.deleted_count += 1
                title = (row.get("title") or "").strip() or "Unknown"
                report.deleted_titles.append(title)

    return report
