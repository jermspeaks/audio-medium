"""Episode API endpoints."""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Query, HTTPException

from database import (
    get_episodes_list,
    get_episode_by_uuid,
    get_listening_history_by_episode,
    get_play_sessions_by_episode,
    upsert_listening_history,
)
from api.schemas import EpisodeResponse, ListeningHistoryResponse, ListeningHistoryUpdateRequest, PlaySessionResponse

router = APIRouter()


@router.get("", response_model=list[EpisodeResponse])
def list_episodes(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    podcast_uuid: Optional[str] = Query(None),
    playing_status: Optional[str] = Query(None, description="1=not played, 2=in progress, 3=completed, played=both 2 and 3"),
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


@router.put("/{uuid}/history", response_model=ListeningHistoryResponse)
def update_episode_history(uuid: str, body: ListeningHistoryUpdateRequest):
    """Update listening history for an episode (e.g. playback position, playing status)."""
    episode = get_episode_by_uuid(uuid)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    existing = get_listening_history_by_episode(uuid)
    now = datetime.utcnow().isoformat() + "Z"
    played_up_to = body.played_up_to if body.played_up_to is not None else (existing["played_up_to"] if existing else 0)
    duration = body.duration if body.duration is not None else (existing.get("duration") or episode.get("duration") or 0)
    playing_status = body.playing_status if body.playing_status is not None else (existing["playing_status"] if existing else 0)
    first_played_at = existing["first_played_at"] if existing else now
    last_played_at = now
    play_count = existing["play_count"] if existing else 1
    upsert_listening_history(
        episode_uuid=uuid,
        played_up_to=played_up_to,
        duration=duration,
        playing_status=playing_status,
        first_played_at=first_played_at,
        last_played_at=last_played_at,
        play_count=play_count,
    )
    row = get_listening_history_by_episode(uuid)
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
