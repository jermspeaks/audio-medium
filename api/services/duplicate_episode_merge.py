"""Merge duplicate episodes: same podcast, normalized title, same/close published_date. Preserve listening history."""
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from config import get_db_path
from database import get_connection

from api.services.episode_identity import (
    PUBLISHED_DATE_TOLERANCE_SEC,
    _normalized_title,
    _published_date_close,
)


@dataclass
class DuplicateEpisodeMergeReport:
    """Result of duplicate episode merge."""
    podcasts_processed: int = 0
    duplicate_groups: int = 0
    episodes_removed: int = 0


def _group_duplicate_episodes(episodes: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
    """
    Group episodes by (normalized_title, published_date bucket).
    Each group has same podcast_uuid, same normalized title, and published_date within tolerance.
    Returns list of groups; each group has 2+ episodes (duplicates).
    """
    if not episodes:
        return []
    podcast_uuid = episodes[0].get("podcast_uuid")
    # Bucket by (norm_title, base_ts) where base_ts is published_date floored to tolerance
    tolerance = PUBLISHED_DATE_TOLERANCE_SEC
    key_to_eps: Dict[Tuple[str, Optional[float]], List[Dict[str, Any]]] = defaultdict(list)
    for ep in episodes:
        norm = _normalized_title(ep.get("title"))
        pub = ep.get("published_date")
        if pub is not None:
            base_ts = int(pub // tolerance) * tolerance
        else:
            base_ts = None
        key_to_eps[(norm, base_ts)].append(ep)
    # Build groups that have at least 2 episodes (duplicates)
    groups = []
    for key, group in key_to_eps.items():
        if len(group) < 2:
            continue
        norm_title, _ = key
        if not norm_title:
            continue
        # Filter to episodes that are actually close in published_date within group
        out = []
        for ep in group:
            pub = ep.get("published_date")
            if all(_published_date_close(pub, other.get("published_date")) for other in group):
                out.append(ep)
        if len(out) >= 2:
            groups.append(out)
    return groups


def _pick_canonical(group: List[Dict[str, Any]], conn: Any) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Pick canonical episode: one with listening_history (or most play progress), else oldest created_at.
    Returns (canonical_episode, list_of_duplicates).
    """
    uuids = [e["uuid"] for e in group]
    placeholders = ",".join("?" * len(uuids))
    cur = conn.execute(
        f"""SELECT episode_uuid, played_up_to, play_count, first_played_at, last_played_at
           FROM listening_history WHERE episode_uuid IN ({placeholders})""",
        uuids,
    )
    lh_rows = {r["episode_uuid"]: dict(r) for r in cur.fetchall()}
    # Prefer episode that has listening history with max played_up_to or play_count
    with_lh = [e for e in group if e["uuid"] in lh_rows]
    if with_lh:
        def score(e: Dict[str, Any]) -> Tuple[float, int, str]:
            r = lh_rows.get(e["uuid"]) or {}
            return (
                float(r.get("played_up_to") or 0),
                int(r.get("play_count") or 0),
                (e.get("created_at") or ""),
            )
        canonical = max(with_lh, key=score)
    else:
        canonical = min(group, key=lambda e: (e.get("created_at") or "", e.get("uuid") or ""))
    duplicates = [e for e in group if e["uuid"] != canonical["uuid"]]
    return canonical, duplicates


def _merge_listening_history(
    conn: Any,
    canonical_uuid: str,
    duplicate_uuid: str,
) -> None:
    """
    Move or merge listening_history from duplicate to canonical.
    If canonical has no row: UPDATE duplicate's row to canonical_uuid.
    If both have rows: merge into canonical (max played_up_to, sum play_count, earliest first_played_at, latest last_played_at), then delete duplicate's row.
    """
    now = datetime.utcnow().isoformat() + "Z"
    cur = conn.execute(
        "SELECT * FROM listening_history WHERE episode_uuid IN (?, ?)",
        (canonical_uuid, duplicate_uuid),
    )
    rows = [dict(r) for r in cur.fetchall()]
    by_ep = {r["episode_uuid"]: r for r in rows}
    canon_row = by_ep.get(canonical_uuid)
    dup_row = by_ep.get(duplicate_uuid)
    if not dup_row:
        return
    if not canon_row:
        conn.execute(
            "UPDATE listening_history SET episode_uuid = ?, updated_at = ? WHERE episode_uuid = ?",
            (canonical_uuid, now, duplicate_uuid),
        )
        return
    # Merge: keep canonical row, update with max played_up_to, sum play_count, earliest first_played_at, latest last_played_at
    max_played = max(float(canon_row.get("played_up_to") or 0), float(dup_row.get("played_up_to") or 0))
    sum_play_count = int(canon_row.get("play_count") or 0) + int(dup_row.get("play_count") or 0)
    first_played = min(
        canon_row.get("first_played_at") or "",
        dup_row.get("first_played_at") or "",
    ) or (canon_row.get("first_played_at") or dup_row.get("first_played_at"))
    last_played = max(
        canon_row.get("last_played_at") or "",
        dup_row.get("last_played_at") or "",
    ) or (canon_row.get("last_played_at") or dup_row.get("last_played_at"))
    duration = canon_row.get("duration") or dup_row.get("duration") or 0
    completion = (max_played / duration * 100.0) if duration and duration > 0 else None
    conn.execute(
        """UPDATE listening_history SET
             played_up_to = ?, play_count = ?, first_played_at = ?, last_played_at = ?,
             completion_percentage = ?, updated_at = ?
           WHERE episode_uuid = ?""",
        (max_played, sum_play_count, first_played, last_played, completion, now, canonical_uuid),
    )
    conn.execute("DELETE FROM listening_history WHERE episode_uuid = ?", (duplicate_uuid,))


def merge_duplicate_episodes(db_path: Optional[Path] = None) -> DuplicateEpisodeMergeReport:
    """
    Find duplicate episodes (same podcast, normalized title, same/close published_date).
    For each group: pick canonical, move/merge listening_history and play_sessions to canonical, delete duplicate episode rows.
    """
    db_path = db_path or get_db_path()
    report = DuplicateEpisodeMergeReport()
    with get_connection(db_path) as conn:
        cur = conn.execute(
            """SELECT uuid, podcast_uuid, title, published_date, file_url, created_at
               FROM episodes WHERE deleted_at IS NULL"""
        )
        all_episodes = [dict(r) for r in cur.fetchall()]
    by_podcast: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for ep in all_episodes:
        by_podcast[ep["podcast_uuid"]].append(ep)
    for podcast_uuid, episodes in by_podcast.items():
        report.podcasts_processed += 1
        groups = _group_duplicate_episodes(episodes)
        for group in groups:
            report.duplicate_groups += 1
            with get_connection(db_path) as conn:
                canonical, duplicates = _pick_canonical(group, conn)
                canonical_uuid = canonical["uuid"]
                for dup in duplicates:
                    dup_uuid = dup["uuid"]
                    _merge_listening_history(conn, canonical_uuid, dup_uuid)
                    conn.execute("UPDATE play_sessions SET episode_uuid = ? WHERE episode_uuid = ?", (canonical_uuid, dup_uuid))
                    conn.execute("DELETE FROM episodes WHERE uuid = ?", (dup_uuid,))
                    report.episodes_removed += 1
    return report
