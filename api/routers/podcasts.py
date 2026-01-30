"""Podcast API endpoints."""
from typing import Optional
from fastapi import APIRouter, Query, HTTPException

from database import get_all_podcasts, get_podcast_by_uuid, get_episodes_by_podcast
from api.schemas import PodcastResponse, EpisodeResponse

router = APIRouter()


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
