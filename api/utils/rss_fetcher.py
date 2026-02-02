"""Fetch and parse RSS/Atom feeds to extract podcast metadata."""
import feedparser
from typing import Any, Dict, Optional

# Timeout in seconds for fetching feeds (used when feedparser supports it)
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


def _extract_href(obj: Any) -> Optional[str]:
    """Get URL from feedparser image object (dict with 'href' or object with .href attribute)."""
    if obj is None:
        return None
    if isinstance(obj, str) and obj.strip().startswith("http"):
        return obj.strip()
    href = None
    if isinstance(obj, dict):
        href = obj.get("href")
    else:
        href = getattr(obj, "href", None)
    if href and isinstance(href, str):
        return href.strip()
    return None


def _get_image_url(feed: Dict[str, Any]) -> Optional[str]:
    """Extract podcast image URL from feed (image.href, itunes_image, logo, etc.)."""
    def get_obj(key: str) -> Any:
        """Prefer attribute access (feedparser often exposes feed.image, feed.itunes_image)."""
        obj = getattr(feed, key, None)
        if obj is None and hasattr(feed, "get"):
            obj = feed.get(key)
        return obj

    for key in ("image", "itunes_image", "logo"):
        obj = get_obj(key)
        url = _extract_href(obj)
        if url:
            return url
    # Fallback: scan feed for any key containing 'image' or 'logo' (namespaced keys)
    try:
        keys_iter = getattr(feed, "keys", None)
        if callable(keys_iter):
            for k in keys_iter():
                if k and ("image" in k.lower() or "logo" in k.lower()):
                    v = feed.get(k) if hasattr(feed, "get") else None
                    if v is None:
                        v = getattr(feed, k, None)
                    url = _extract_href(v)
                    if url:
                        return url
    except Exception:
        pass
    return None
