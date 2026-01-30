"""Unified search API."""
from fastapi import APIRouter, Query

from database import search_podcasts, search_episodes
from api.schemas import PodcastResponse, EpisodeResponse, SearchResultResponse

router = APIRouter()


@router.get("/search", response_model=SearchResultResponse)
def search(
    q: str = Query(..., min_length=1),
    podcast_uuid: str | None = Query(None),
    playing_status: str | None = Query(None, description="1=not played, 2=in progress, 3=completed, played=both 2 and 3"),
    limit: int = Query(20, ge=1, le=100),
):
    """Unified search across podcasts and episodes."""
    podcasts = search_podcasts(q=q, limit=limit)
    episodes = search_episodes(
        q=q, podcast_uuid=podcast_uuid, playing_status=playing_status, limit=limit, offset=0
    )
    return SearchResultResponse(
        podcasts=[PodcastResponse(**dict(row)) for row in podcasts],
        episodes=[EpisodeResponse(**dict(row)) for row in episodes],
    )
