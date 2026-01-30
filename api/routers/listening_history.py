"""Listening history is served under episodes router (GET /api/episodes/{uuid}/history)."""
# Routes are in episodes.py to keep episode-related endpoints together.
from fastapi import APIRouter

router = APIRouter()
