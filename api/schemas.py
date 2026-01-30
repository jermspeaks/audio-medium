"""Pydantic models for API request/response validation."""
from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel


class PodcastResponse(BaseModel):
    id: Optional[int] = None
    uuid: str
    title: Optional[str] = None
    author: Optional[str] = None
    description: Optional[str] = None
    feed_url: Optional[str] = None
    image_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    episode_count: Optional[int] = None

    class Config:
        from_attributes = True


class EpisodeResponse(BaseModel):
    id: Optional[int] = None
    uuid: str
    podcast_uuid: str
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[float] = None
    published_date: Optional[float] = None
    file_url: Optional[str] = None
    file_type: Optional[str] = None
    size_bytes: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    podcast_title: Optional[str] = None
    podcast_author: Optional[str] = None
    podcast_image_url: Optional[str] = None
    played_up_to: Optional[float] = None
    playing_status: Optional[int] = None
    episode_status: Optional[int] = None
    completion_percentage: Optional[float] = None
    first_played_at: Optional[str] = None
    last_played_at: Optional[str] = None
    play_count: Optional[int] = None

    class Config:
        from_attributes = True


class ListeningHistoryResponse(BaseModel):
    id: Optional[int] = None
    episode_uuid: str
    played_up_to: float = 0
    duration: float = 0
    playing_status: int = 0
    episode_status: Optional[int] = None
    completion_percentage: Optional[float] = None
    first_played_at: Optional[str] = None
    last_played_at: Optional[str] = None
    play_count: int = 1
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class PlaySessionResponse(BaseModel):
    id: Optional[int] = None
    episode_uuid: str
    started_at: str
    ended_at: Optional[str] = None
    duration_seconds: Optional[float] = None
    played_from: float = 0
    played_to: float = 0

    class Config:
        from_attributes = True


class StatsSummaryResponse(BaseModel):
    total_listening_hours: float
    total_episodes: int
    average_completion_percent: float
    episodes_completed: int
    episodes_in_progress: int


class TopPodcastResponse(BaseModel):
    uuid: str
    title: Optional[str] = None
    author: Optional[str] = None
    episode_count: Optional[int] = None
    total_hours: Optional[float] = None


class SearchResultResponse(BaseModel):
    podcasts: List[PodcastResponse]
    episodes: List[EpisodeResponse]
