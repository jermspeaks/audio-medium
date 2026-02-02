"""Podcast API endpoints."""
from typing import Optional
from fastapi import APIRouter, Query, HTTPException

from database import get_all_podcasts, get_podcast_by_uuid, get_episodes_by_podcast, get_connection, upsert_podcast
from api.schemas import PodcastResponse, EpisodeResponse, RefreshMetadataResponse
from api.utils.rss_fetcher import fetch_podcast_metadata

router = APIRouter()


@router.post("/refresh-metadata", response_model=RefreshMetadataResponse)
def refresh_metadata():
    """Refresh metadata (title, author, description, image_url) from RSS for all podcasts with feed URLs."""
    errors: list[str] = []
    podcasts_updated = 0
    with get_connection() as conn:
        cur = conn.execute(
            """SELECT uuid, title, author, description, feed_url, website_url, image_url
               FROM podcasts
               WHERE deleted_at IS NULL AND feed_url IS NOT NULL AND TRIM(feed_url) != ''"""
        )
        rows = [dict(row) for row in cur.fetchall()]
    podcasts_refreshed = len(rows)
    for row in rows:
        feed_url = (row.get("feed_url") or "").strip()
        if not feed_url:
            continue
        try:
            rss_meta = fetch_podcast_metadata(feed_url)
        except Exception as e:
            errors.append(f"{row.get('title') or row['uuid']}: {e}")
            continue
        title = (rss_meta.get("title") or "").strip() or row.get("title")
        author = (rss_meta.get("author") or "").strip() or row.get("author")
        description = (rss_meta.get("description") or "").strip() or row.get("description")
        image_url = (rss_meta.get("image_url") or "").strip() or row.get("image_url")
        upsert_podcast(
            uuid=row["uuid"],
            title=title,
            author=author,
            description=description,
            feed_url=row.get("feed_url"),
            website_url=row.get("website_url"),
            image_url=image_url,
        )
        podcasts_updated += 1
    return RefreshMetadataResponse(
        podcasts_refreshed=podcasts_refreshed,
        podcasts_updated=podcasts_updated,
        errors=errors,
    )


@router.get("", response_model=list[PodcastResponse])
def list_podcasts(
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List all podcasts with optional search and pagination."""
    rows = get_all_podcasts(search=search, limit=limit, offset=offset)
    return [PodcastResponse(**dict(row)) for row in rows]


@router.get("/{uuid}", response_model=PodcastResponse)
def get_podcast(uuid: str):
    """Get podcast details by uuid."""
    row = get_podcast_by_uuid(uuid)
    if not row:
        raise HTTPException(status_code=404, detail="Podcast not found")
    return PodcastResponse(**dict(row))


@router.get("/{uuid}/episodes", response_model=list[EpisodeResponse])
def list_podcast_episodes(
    uuid: str,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    playing_status: Optional[str] = Query(None, description="1=not played, 2=in progress, 3=completed, played=both 2 and 3"),
):
    """Get episodes for a podcast."""
    podcast = get_podcast_by_uuid(uuid)
    if not podcast:
        raise HTTPException(status_code=404, detail="Podcast not found")
    rows = get_episodes_by_podcast(
        podcast_uuid=uuid, limit=limit, offset=offset, playing_status=playing_status
    )
    return [EpisodeResponse(**dict(row)) for row in rows]
