"""Play sessions are served under episodes router (GET /api/episodes/{uuid}/sessions)."""
# Routes are in episodes.py to keep episode-related endpoints together.
from fastapi import APIRouter

router = APIRouter()
