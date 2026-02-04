"""Resolve feed entry to existing episode UUID to prevent duplicates when feed guid/link changes."""
import re
from typing import Any, Dict, List, Optional

# Tolerance for published_date match: same day (86400 seconds)
PUBLISHED_DATE_TOLERANCE_SEC = 86400


def _normalized_title(title: Optional[str]) -> str:
    """Normalize title for matching: strip, lowercase, collapse whitespace."""
    if not title or not isinstance(title, str):
        return ""
    s = title.strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def _published_date_close(a: Optional[float], b: Optional[float], tolerance: float = PUBLISHED_DATE_TOLERANCE_SEC) -> bool:
    """True if both are None, or both are within tolerance seconds of each other."""
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    return abs(a - b) <= tolerance


def resolve_episode_uuid(
    podcast_uuid: str,
    feed_entry: Dict[str, Any],
    existing_episodes: List[Dict[str, Any]],
) -> str:
    """
    Resolve a feed entry to the UUID to use for upsert (existing or feed-derived).

    Matches an existing episode for the same podcast by:
    1. file_url: if feed entry has file_url and it matches an existing episode's file_url
    2. title + published_date: same normalized title and same (or very close) published_date

    When multiple existing episodes match (duplicates), pick one deterministically:
    oldest created_at, then first by uuid.

    Returns the existing episode's uuid if a match is found, otherwise feed_entry["uuid"].
    """
    feed_uuid = feed_entry.get("uuid") or ""
    feed_file_url = (feed_entry.get("file_url") or "").strip() or None
    feed_title_norm = _normalized_title(feed_entry.get("title"))
    feed_published = feed_entry.get("published_date")

    # 1. Match by file_url (strong signal when present and stable)
    if feed_file_url:
        for ex in existing_episodes:
            ex_url = (ex.get("file_url") or "").strip() or None
            if ex_url and ex_url == feed_file_url:
                return ex["uuid"]

    # 2. Match by normalized title + published_date (same or within one day)
    if feed_title_norm:
        candidates = []
        for ex in existing_episodes:
            ex_title_norm = _normalized_title(ex.get("title"))
            if ex_title_norm != feed_title_norm:
                continue
            ex_published = ex.get("published_date")
            if not _published_date_close(feed_published, ex_published):
                continue
            candidates.append(ex)
        if candidates:
            # Deterministic: oldest created_at, then first by uuid
            candidates.sort(key=lambda e: (e.get("created_at") or "", e.get("uuid") or ""))
            return candidates[0]["uuid"]

    return feed_uuid
