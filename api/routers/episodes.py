"""Episode API endpoints."""
from typing import Optional
from fastapi import APIRouter, Query, HTTPException

from database import get_episodes_list, get_episode_by_uuid, get_listening_history_by_episode, get_play_sessions_by_episode
from api.schemas import EpisodeResponse, ListeningHistoryResponse, PlaySessionResponse

router = APIRouter()


@router.get("", response_model=list[EpisodeResponse])
def list_episodes(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    podcast_uuid: Optional[str] = Query(None),
    playing_status: Optional[int] = Query(None, description="1=not played, 2=completed, 3=in progress"),
):
    """List episodes with optional filters."""
    rows = get_episodes_list(
        limit=limit, offset=offset, podcast_uuid=podcast_uuid, playing_status=playing_status
    )
    return [EpisodeResponse(**dict(row)) for row in rows]


@router.get("/{uuid}", response_model=EpisodeResponse)
def get_episode(uuid: str):
    """Get episode details by uuid."""
    row = get_episode_by_uuid(uuid)
    if not row:
        raise HTTPException(status_code=404, detail="Episode not found")
    return EpisodeResponse(**dict(row))


@router.get("/{uuid}/history", response_model=ListeningHistoryResponse)
def get_episode_history(uuid: str):
    """Get listening history for an episode."""
    row = get_listening_history_by_episode(uuid)
    if not row:
        raise HTTPException(status_code=404, detail="Listening history not found for this episode")
    return ListeningHistoryResponse(**dict(row))


@router.get("/{uuid}/sessions", response_model=list[PlaySessionResponse])
def get_episode_sessions(
    uuid: str,
    limit: int = Query(100, ge=1, le=500),
):
    """Get play sessions for an episode."""
    episode = get_episode_by_uuid(uuid)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    rows = get_play_sessions_by_episode(episode_uuid=uuid, limit=limit)
    return [PlaySessionResponse(**dict(row)) for row in rows]
