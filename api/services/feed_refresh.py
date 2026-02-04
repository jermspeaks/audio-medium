"""Feed refresh service: fetch new episodes from RSS for all active podcasts."""
import logging
from typing import List, Tuple

from database import get_connection, upsert_episode, upsert_listening_history, update_podcast_is_ended
from api.utils.rss_fetcher import fetch_podcast_with_episodes, FeedNotFoundError
from api.services.episode_identity import resolve_episode_uuid

logger = logging.getLogger(__name__)


def refresh_all_feeds() -> Tuple[int, int, int, List[str]]:
    """
    Fetch new episodes from RSS for all active podcasts with feed URLs.
    Skips soft-deleted and ended podcasts. Marks podcast as ended when feed returns 404/410.
    Returns (podcasts_refreshed, episodes_added, episodes_updated, errors).
    """
    errors: List[str] = []
    episodes_added = 0
    episodes_updated = 0
    with get_connection() as conn:
        cur = conn.execute(
            """SELECT uuid, feed_url, title FROM podcasts
               WHERE deleted_at IS NULL AND (is_ended IS NULL OR is_ended = 0)
                 AND feed_url IS NOT NULL AND TRIM(feed_url) != ''"""
        )
        rows = [dict(row) for row in cur.fetchall()]
    podcasts_refreshed = len(rows)
    logger.info("Starting feed refresh for %d podcasts", podcasts_refreshed)
    for row in rows:
        feed_url = (row.get("feed_url") or "").strip()
        if not feed_url:
            continue
        title = (row.get("title") or "").strip() or row.get("uuid", "")
        logger.info("Refreshing feed: %s (%s)", title, feed_url)
        try:
            data = fetch_podcast_with_episodes(feed_url)
        except FeedNotFoundError:
            update_podcast_is_ended(row["uuid"], True)
            errors.append(f"{title}: Feed no longer available (marked as ended)")
            logger.warning("Feed no longer available: %s (marked as ended)", title)
            continue
        except Exception as e:
            errors.append(f"{row.get('uuid', '')}: {e}")
            logger.warning("Feed refresh failed for %s: %s", title, e)
            continue
        podcast_uuid = row["uuid"]
        entries = data.get("entries") or []
        local_added = 0
        local_updated = 0
        with get_connection() as conn:
            cur = conn.execute(
                """SELECT uuid, title, published_date, file_url, created_at
                   FROM episodes WHERE podcast_uuid = ? AND deleted_at IS NULL""",
                (podcast_uuid,),
            )
            existing_episodes = [dict(r) for r in cur.fetchall()]
            existing_uuids = {r["uuid"] for r in existing_episodes}
            for ep in entries:
                uid = resolve_episode_uuid(podcast_uuid, ep, existing_episodes)
                is_new = uid not in existing_uuids
                if is_new:
                    episodes_added += 1
                    local_added += 1
                    existing_uuids.add(uid)
                else:
                    episodes_updated += 1
                    local_updated += 1
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
                if is_new:
                    upsert_listening_history(
                        uid,
                        played_up_to=0,
                        duration=ep.get("duration") or 0,
                        playing_status=1,
                        conn=conn,
                    )
        logger.info(
            "Refreshed %s: %d entries (%d new, %d updated)",
            title,
            len(entries),
            local_added,
            local_updated,
        )
    return podcasts_refreshed, episodes_added, episodes_updated, errors
