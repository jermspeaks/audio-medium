"""FastAPI application for podcasts listening history."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import podcasts, episodes, stats
from api.routers.search import router as search_router

app = FastAPI(
    title="Podcasts Listening History API",
    description="API for viewing podcast listening history and statistics",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(podcasts.router, prefix="/api/podcasts", tags=["podcasts"])
app.include_router(episodes.router, prefix="/api/episodes", tags=["episodes"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])
app.include_router(search_router, prefix="/api", tags=["search"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
