"""Remove duplicate podcasts: keep the one with episodes, delete 0-episode duplicates."""
import re
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, List, Dict, Any, Set

from config import get_db_path
from database import get_connection, delete_podcast
from api.services.opml_import import _canonical_feed_url


@dataclass
class DuplicateCleanupReport:
    """Result of duplicate podcast cleanup."""
    deleted_count: int = 0
    deleted_titles: List[str] = field(default_factory=list)


def _normalized_title(title: Optional[str]) -> str:
    """Normalize title for matching: strip, lowercase, collapse whitespace."""
    if not title or not isinstance(title, str):
        return ""
    s = title.strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def remove_duplicate_podcasts(db_path: Optional[Path] = None) -> DuplicateCleanupReport:
    """
    Find duplicates by canonical feed_url (Pass 1) or normalized title (Pass 2).
    Keep the one with episodes, delete the ones with 0 episodes.
    """
    db_path = db_path or get_db_path()
    report = DuplicateCleanupReport()
    deleted_uuids: Set[str] = set()

    # Load all non-deleted podcasts (with or without feed_url)
    with get_connection(db_path) as conn:
        cur = conn.execute(
            """SELECT p.uuid, p.title, p.feed_url,
                      (SELECT COUNT(*) FROM episodes e WHERE e.podcast_uuid = p.uuid AND e.deleted_at IS NULL) AS episode_count
               FROM podcasts p
               WHERE p.deleted_at IS NULL"""
        )
        rows = [dict(row) for row in cur.fetchall()]

    # Pass 1: Group by canonical feed_url (skip empty). Delete 0-episode when same URL has episodes.
    by_canonical: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for row in rows:
        canonical = _canonical_feed_url(row.get("feed_url") or "")
        if not canonical:
            continue
        by_canonical[canonical].append(row)

    with get_connection(db_path) as conn:
        for _canonical, group in by_canonical.items():
            with_episodes = [r for r in group if (r.get("episode_count") or 0) > 0]
            without_episodes = [r for r in group if (r.get("episode_count") or 0) == 0]
            if not with_episodes or not without_episodes:
                continue
            for row in without_episodes:
                delete_podcast(row["uuid"], conn=conn)
                report.deleted_count += 1
                report.deleted_titles.append((row.get("title") or "").strip() or "Unknown")
                deleted_uuids.add(row["uuid"])

    # Pass 2: Among remaining 0-episode podcasts, match by normalized title; delete if exactly one sibling has episodes.
    remaining_zero = [r for r in rows if (r.get("episode_count") or 0) == 0 and r["uuid"] not in deleted_uuids]
    with_episodes_by_title: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for r in rows:
        if (r.get("episode_count") or 0) > 0 and r["uuid"] not in deleted_uuids:
            norm = _normalized_title(r.get("title"))
            if norm:
                with_episodes_by_title[norm].append(r)

    with get_connection(db_path) as conn:
        for row in remaining_zero:
            norm = _normalized_title(row.get("title"))
            if not norm:
                continue
            siblings = with_episodes_by_title.get(norm, [])
            if len(siblings) != 1:
                continue
            delete_podcast(row["uuid"], conn=conn)
            report.deleted_count += 1
            report.deleted_titles.append((row.get("title") or "").strip() or "Unknown")

    return report
