"""Background scheduler for hourly feed refresh."""
import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from api.services.feed_refresh import refresh_all_feeds

logger = logging.getLogger(__name__)
_scheduler: BackgroundScheduler | None = None


def _run_refresh() -> None:
    try:
        podcasts_refreshed, episodes_added, episodes_updated, errors = refresh_all_feeds()
        logger.info(
            "Feed refresh completed: %d podcasts, %d episodes added, %d updated",
            podcasts_refreshed,
            episodes_added,
            episodes_updated,
        )
        for err in errors:
            logger.warning("Feed refresh error: %s", err)
    except Exception as e:
        logger.exception("Feed refresh failed: %s", e)


def start_scheduler() -> None:
    """Start the background scheduler for hourly feed refresh."""
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler()
    _scheduler.add_job(_run_refresh, IntervalTrigger(hours=1), id="feed_refresh")
    _scheduler.start()
    logger.info("Feed refresh scheduler started (hourly)")


def stop_scheduler() -> None:
    """Stop the background scheduler."""
    global _scheduler
    if _scheduler is None:
        return
    _scheduler.shutdown(wait=False)
    _scheduler = None
    logger.info("Feed refresh scheduler stopped")
