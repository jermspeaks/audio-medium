"""Fetch and parse RSS/Atom feeds to extract podcast metadata."""
import feedparser
from typing import Any, Dict, Optional

# Timeout in seconds for fetching feeds
RSS_FETCH_TIMEOUT = 15


def fetch_podcast_metadata(feed_url: str) -> Dict[str, Any]:
    """
    Fetch RSS feed and extract podcast metadata: title, author, description, image_url.
    Returns dict with keys title, author, description, image_url (any may be None).
    On error, returns empty dict and caller can use OPML title as fallback.
    """
    result: Dict[str, Any] = {
        "title": None,
        "author": None,
        "description": None,
        "image_url": None,
    }
    try:
        parsed = feedparser.parse(
            feed_url,
            request_headers={"User-Agent": "PodcastsReviewer/1.0"},
            timeout=RSS_FETCH_TIMEOUT,
        )
    except Exception:
        return result

    if parsed.bozo and not getattr(parsed, "entries", None) and not getattr(parsed, "feed", None):
        return result

    feed = getattr(parsed, "feed", None)
    if not feed:
        return result

    result["title"] = _get_text(feed.get("title"))
    result["author"] = _get_author(feed)
    result["description"] = _get_text(feed.get("description")) or _get_text(feed.get("subtitle"))
    result["image_url"] = _get_image_url(feed)
    return result


def _get_text(value: Any) -> Optional[str]:
    """Extract plain text from feedparser value (may be dict with 'value')."""
    if value is None:
        return None
    if isinstance(value, str):
        return value.strip() or None
    if isinstance(value, dict) and "value" in value:
        v = value["value"]
        return v.strip() if isinstance(v, str) else None
    return str(value).strip() or None


def _get_author(feed: Dict[str, Any]) -> Optional[str]:
    """Extract author from feed (author, itunes_author, etc.)."""
    author = feed.get("author")
    if author:
        s = _get_text(author) if not isinstance(author, str) else author.strip()
        if s:
            return s
    # feedparser sometimes puts author in author_detail
    author_detail = feed.get("author_detail")
    if isinstance(author_detail, dict) and author_detail.get("name"):
        return author_detail["name"].strip()
    itunes_author = feed.get("itunes_author")
    if itunes_author:
        s = _get_text(itunes_author) if not isinstance(itunes_author, str) else itunes_author.strip()
        if s:
            return s
    return None


def _get_image_url(feed: Dict[str, Any]) -> Optional[str]:
    """Extract podcast image URL from feed (image.href, itunes_image, etc.)."""
    image = feed.get("image")
    if image:
        if isinstance(image, dict) and image.get("href"):
            return image["href"].strip()
        if isinstance(image, str) and image.strip().startswith("http"):
            return image.strip()
    itunes_image = feed.get("itunes_image")
    if itunes_image:
        if isinstance(itunes_image, dict) and itunes_image.get("href"):
            return itunes_image["href"].strip()
        if isinstance(itunes_image, str) and itunes_image.strip().startswith("http"):
            return itunes_image.strip()
    return None
