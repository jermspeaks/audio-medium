"""Feed refresh service: fetch new episodes from RSS for all active podcasts."""
from typing import List, Tuple

from database import get_connection, upsert_episode
from api.utils.rss_fetcher import fetch_podcast_with_episodes


def refresh_all_feeds() -> Tuple[int, int, int, List[str]]:
    """
    Fetch new episodes from RSS for all active podcasts with feed URLs.
    Returns (podcasts_refreshed, episodes_added, episodes_updated, errors).
    """
    errors: List[str] = []
    episodes_added = 0
    episodes_updated = 0
    with get_connection() as conn:
        cur = conn.execute(
            """SELECT uuid, feed_url FROM podcasts
               WHERE deleted_at IS NULL AND feed_url IS NOT NULL AND TRIM(feed_url) != ''"""
        )
        rows = [dict(row) for row in cur.fetchall()]
    podcasts_refreshed = len(rows)
    for row in rows:
        feed_url = (row.get("feed_url") or "").strip()
        if not feed_url:
            continue
        try:
            data = fetch_podcast_with_episodes(feed_url)
        except Exception as e:
            errors.append(f"{row.get('uuid', '')}: {e}")
            continue
        podcast_uuid = row["uuid"]
        with get_connection() as conn:
            cur = conn.execute(
                "SELECT uuid FROM episodes WHERE podcast_uuid = ? AND deleted_at IS NULL",
                (podcast_uuid,),
            )
            existing_uuids = {r["uuid"] for r in cur.fetchall()}
            for ep in data.get("entries") or []:
                uid = ep["uuid"]
                if uid not in existing_uuids:
                    episodes_added += 1
                else:
                    episodes_updated += 1
                upsert_episode(
                    uuid=uid,
                    podcast_uuid=podcast_uuid,
                    title=ep.get("title"),
                    description=ep.get("description"),
                    duration=ep.get("duration"),
                    published_date=ep.get("published_date"),
                    file_url=ep.get("file_url"),
                    file_type=ep.get("file_type"),
                    size_bytes=ep.get("size_bytes"),
                    video_url=ep.get("video_url"),
                    deleted_at=None,
                    conn=conn,
                )
    return podcasts_refreshed, episodes_added, episodes_updated, errors
