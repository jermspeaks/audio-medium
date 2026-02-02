"""FastAPI application for podcasts listening history."""
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from api.routers import podcasts, episodes, stats, sync, settings
from api.routers.search import router as search_router
from api.services.feed_refresh_scheduler import start_scheduler, stop_scheduler

logger = logging.getLogger(__name__)


class LogRequestsMiddleware(BaseHTTPMiddleware):
    """Log each API request and response (method, path, status, duration)."""

    async def dispatch(self, request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        duration = time.perf_counter() - start
        path = request.url.path
        if request.url.query and len(request.url.query) <= 80:
            path = f"{path}?{request.url.query}"
        logger.info(
            "%s %s %d %.2fs",
            request.method,
            path,
            response.status_code,
            duration,
        )
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="Audiophile API",
    description="API for Audiophile – podcast listening history and statistics",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LogRequestsMiddleware)

app.include_router(podcasts.router, prefix="/api/podcasts", tags=["podcasts"])
app.include_router(episodes.router, prefix="/api/episodes", tags=["episodes"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])
app.include_router(sync.router, prefix="/api", tags=["sync"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(search_router, prefix="/api", tags=["search"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
