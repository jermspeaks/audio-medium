"""Podcast API endpoints."""
import hashlib
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Query, HTTPException

logger = logging.getLogger(__name__)

from database import (
    get_all_podcasts,
    get_all_podcasts_count,
    get_podcast_by_uuid,
    get_podcast_by_feed_url,
    get_episodes_by_podcast,
    get_connection,
    upsert_podcast,
    upsert_episode,
)
from api.schemas import (
    PodcastResponse,
    EpisodeResponse,
    RefreshMetadataResponse,
    PodcastSubscribeRequest,
    PodcastUpdateRequest,
    FeedRefreshResponse,
)
from api.utils.rss_fetcher import fetch_podcast_metadata, fetch_podcast_with_episodes, FeedNotFoundError
from api.services.feed_refresh import refresh_all_feeds
from api.services.episode_identity import resolve_episode_uuid

router = APIRouter()


def _canonical_feed_url(feed_url: str) -> str:
    return (feed_url or "").strip().rstrip("/")


def _podcast_uuid_from_feed_url(feed_url: str) -> str:
    return hashlib.sha256(_canonical_feed_url(feed_url).encode("utf-8")).hexdigest()[:32]


@router.post("/subscribe", response_model=PodcastResponse)
def subscribe_to_podcast(body: PodcastSubscribeRequest):
    """Subscribe to a podcast by RSS feed URL. Fetches metadata and episodes, then stores them."""
    feed_url = _canonical_feed_url(body.feed_url)
    if not feed_url or not feed_url.startswith("http"):
        raise HTTPException(status_code=400, detail="Valid feed URL is required")
    try:
        data = fetch_podcast_with_episodes(feed_url)
    except FeedNotFoundError as e:
        raise HTTPException(status_code=422, detail=f"Feed not available (HTTP {e.status})") from e
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to fetch feed: {e}") from e
    title = (data.get("title") or "").strip() or None
    if not title and not data.get("entries"):
        raise HTTPException(status_code=422, detail="Feed could not be parsed or has no content")
    existing = get_podcast_by_feed_url(feed_url)
    podcast_uuid = existing["uuid"] if existing else _podcast_uuid_from_feed_url(feed_url)
    author = (data.get("author") or "").strip() or None
    description = (data.get("description") or "").strip() or None
    image_url = (data.get("image_url") or "").strip() or None
    website_url = (data.get("website_url") or "").strip() or None
    upsert_podcast(
        uuid=podcast_uuid,
        title=title or "Untitled Podcast",
        author=author,
        description=description,
        feed_url=feed_url,
        website_url=website_url,
        image_url=image_url,
        deleted_at=None,
        is_ended=False,
    )
    with get_connection() as conn:
        cur = conn.execute(
            """SELECT uuid, title, published_date, file_url, created_at
               FROM episodes WHERE podcast_uuid = ? AND deleted_at IS NULL""",
            (podcast_uuid,),
        )
        existing_episodes = [dict(r) for r in cur.fetchall()]
        for ep in data.get("entries") or []:
            uid = resolve_episode_uuid(podcast_uuid, ep, existing_episodes)
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
    row = get_podcast_by_uuid(podcast_uuid)
    return PodcastResponse(**dict(row))


@router.post("/refresh-feeds", response_model=FeedRefreshResponse)
def refresh_feeds():
    """Fetch new episodes from RSS for all active podcasts with feed URLs."""
    podcasts_refreshed, episodes_added, episodes_updated, errors = refresh_all_feeds()
    return FeedRefreshResponse(
        podcasts_refreshed=podcasts_refreshed,
        episodes_added=episodes_added,
        episodes_updated=episodes_updated,
        errors=errors,
    )


@router.post("/refresh-metadata", response_model=RefreshMetadataResponse)
def refresh_metadata():
    """Refresh metadata (title, author, description, image_url) from RSS for all podcasts with feed URLs."""
    errors: list[str] = []
    podcasts_updated = 0
    with get_connection() as conn:
        cur = conn.execute(
            """SELECT uuid, title, author, description, feed_url, website_url, image_url, is_ended
               FROM podcasts
               WHERE deleted_at IS NULL AND (is_ended IS NULL OR is_ended = 0)
                 AND feed_url IS NOT NULL AND TRIM(feed_url) != ''"""
        )
        rows = [dict(row) for row in cur.fetchall()]
    podcasts_refreshed = len(rows)
    logger.info("Starting metadata refresh for %d podcasts", podcasts_refreshed)
    for row in rows:
        feed_url = (row.get("feed_url") or "").strip()
        if not feed_url:
            continue
        title = (row.get("title") or "").strip() or row.get("uuid", "")
        logger.info("Refreshing metadata: %s (%s)", title, feed_url)
        try:
            rss_meta = fetch_podcast_metadata(feed_url)
        except Exception as e:
            errors.append(f"{row.get('title') or row['uuid']}: {e}")
            logger.warning("Metadata refresh failed for %s: %s", title, e)
            continue
        title = (rss_meta.get("title") or "").strip() or row.get("title")
        author = (rss_meta.get("author") or "").strip() or row.get("author")
        description = (rss_meta.get("description") or "").strip() or row.get("description")
        image_url = (rss_meta.get("image_url") or "").strip() or row.get("image_url")
        is_ended = bool(row.get("is_ended", 0))
        upsert_podcast(
            uuid=row["uuid"],
            title=title,
            author=author,
            description=description,
            feed_url=row.get("feed_url"),
            website_url=row.get("website_url"),
            image_url=image_url,
            is_ended=is_ended,
        )
        podcasts_updated += 1
        logger.info("Refreshed metadata: %s", title)
    return RefreshMetadataResponse(
        podcasts_refreshed=podcasts_refreshed,
        podcasts_updated=podcasts_updated,
        errors=errors,
    )


@router.get("")
def list_podcasts(
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    filter: Optional[str] = Query(None, description="Filter: active, archived, ended"),
):
    """List all podcasts with optional search, pagination, and status filter. Returns { items, total }."""
    # Validate filter value
    valid_filters = {"active", "archived", "ended"}
    if filter is not None and filter not in valid_filters:
        raise HTTPException(status_code=400, detail=f"Invalid filter value. Must be one of: {', '.join(valid_filters)}")
    
    rows = get_all_podcasts(search=search, limit=limit, offset=offset, filter=filter)
    total = get_all_podcasts_count(search=search, filter=filter)
    items = [PodcastResponse(**dict(row)) for row in rows]
    return {"items": items, "total": total}


@router.get("/{uuid}", response_model=PodcastResponse)
def get_podcast(uuid: str):
    """Get podcast details by uuid (includes archived podcasts)."""
    row = get_podcast_by_uuid(uuid, include_deleted=True)
    if not row:
        raise HTTPException(status_code=404, detail="Podcast not found")
    return PodcastResponse(**dict(row))


@router.put("/{uuid}", response_model=PodcastResponse)
def update_podcast(uuid: str, body: PodcastUpdateRequest):
    """Update podcast metadata (title, author, description, image_url, feed_url, website_url, is_ended)."""
    row = get_podcast_by_uuid(uuid)
    if not row:
        raise HTTPException(status_code=404, detail="Podcast not found")
    title = body.title if body.title is not None else row.get("title")
    author = body.author if body.author is not None else row.get("author")
    description = body.description if body.description is not None else row.get("description")
    image_url = body.image_url if body.image_url is not None else row.get("image_url")
    feed_url = body.feed_url if body.feed_url is not None else row.get("feed_url")
    website_url = body.website_url if body.website_url is not None else row.get("website_url")
    is_ended = body.is_ended if body.is_ended is not None else bool(row.get("is_ended", 0))
    upsert_podcast(
        uuid=uuid,
        title=title,
        author=author,
        description=description,
        feed_url=feed_url,
        website_url=website_url,
        image_url=image_url,
        deleted_at=row.get("deleted_at"),
        is_ended=is_ended,
    )
    updated = get_podcast_by_uuid(uuid)
    return PodcastResponse(**dict(updated))


@router.post("/{uuid}/archive", response_model=PodcastResponse)
def archive_podcast(uuid: str):
    """Archive a podcast (soft delete)."""
    row = get_podcast_by_uuid(uuid)
    if not row:
        raise HTTPException(status_code=404, detail="Podcast not found")
    now = datetime.utcnow().isoformat() + "Z"
    is_ended = bool(row.get("is_ended", 0))
    upsert_podcast(
        uuid=uuid,
        title=row.get("title"),
        author=row.get("author"),
        description=row.get("description"),
        feed_url=row.get("feed_url"),
        website_url=row.get("website_url"),
        image_url=row.get("image_url"),
        deleted_at=now,
        is_ended=is_ended,
    )
    updated = get_podcast_by_uuid(uuid, include_deleted=True)
    return PodcastResponse(**dict(updated))


@router.post("/{uuid}/unarchive", response_model=PodcastResponse)
def unarchive_podcast(uuid: str):
    """Restore an archived podcast."""
    row = get_podcast_by_uuid(uuid, include_deleted=True)
    if not row:
        raise HTTPException(status_code=404, detail="Podcast not found")
    is_ended = bool(row.get("is_ended", 0))
    upsert_podcast(
        uuid=uuid,
        title=row.get("title"),
        author=row.get("author"),
        description=row.get("description"),
        feed_url=row.get("feed_url"),
        website_url=row.get("website_url"),
        image_url=row.get("image_url"),
        deleted_at=None,
        is_ended=is_ended,
    )
    updated = get_podcast_by_uuid(uuid)
    return PodcastResponse(**dict(updated))


PODCAST_EPISODES_SORT = frozenset({"newest", "oldest", "last_played", "oldest_played"})


@router.get("/{uuid}/episodes", response_model=list[EpisodeResponse])
def list_podcast_episodes(
    uuid: str,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    playing_status: Optional[str] = Query(None, description="1=not played, 2=in progress, 3=completed, played=both 2 and 3"),
    sort: Optional[str] = Query("newest", description="newest | oldest | last_played | oldest_played"),
):
    """Get episodes for a podcast (includes archived podcasts)."""
    podcast = get_podcast_by_uuid(uuid, include_deleted=True)
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    sort_val = sort if sort in PODCAST_EPISODES_SORT else "newest"
    rows = get_episodes_by_podcast(
        podcast_uuid=uuid, limit=limit, offset=offset, playing_status=playing_status, sort=sort_val
    )
    return [EpisodeResponse(**dict(row)) for row in rows]
