"""Statistics API endpoints."""
from typing import Optional
from fastapi import APIRouter, Query

from listening_stats import summary_report, top_podcasts_by_episodes, top_podcasts_by_hours
from api.schemas import StatsSummaryResponse, TopPodcastResponse

router = APIRouter()


@router.get("/summary", response_model=StatsSummaryResponse)
def get_summary():
    """Overall listening statistics."""
    data = summary_report()
    return StatsSummaryResponse(**data)


@router.get("/top-podcasts", response_model=list[TopPodcastResponse])
def get_top_podcasts(
    sort: str = Query("hours", description="Sort by 'hours' or 'episodes'"),
    limit: int = Query(20, ge=1, le=100),
):
    """Top podcasts by listening hours or episode count."""
    if sort == "episodes":
        rows = top_podcasts_by_episodes(limit=limit)
    else:
        rows = top_podcasts_by_hours(limit=limit)
    return [TopPodcastResponse(**row) for row in rows]
