"""Fetch and parse RSS/Atom feeds to extract podcast metadata and episodes."""
import hashlib
import feedparser
from typing import Any, Dict, List, Optional

# Timeout in seconds for fetching feeds (used when feedparser supports it)
RSS_FETCH_TIMEOUT = 15


def fetch_podcast_with_episodes(feed_url: str) -> Dict[str, Any]:
    """
    Fetch RSS feed and extract podcast metadata plus all episode entries.
    Returns dict with keys: title, author, description, image_url, website_url, entries.
    entries is a list of episode dicts with uuid, title, description, duration, published_date,
    file_url, file_type, size_bytes, video_url (any may be None).
    On parse error, returns minimal result with empty entries.
    """
    result: Dict[str, Any] = {
        "title": None,
        "author": None,
        "description": None,
        "image_url": None,
        "website_url": None,
        "entries": [],
    }
    try:
        parsed = feedparser.parse(
            feed_url,
            request_headers={"User-Agent": "PodcastsReviewer/1.0"},
        )
    except Exception:
        return result

    feed = getattr(parsed, "feed", None)
    if not feed:
        return result

    result["title"] = _get_text(feed.get("title"))
    result["author"] = _get_author(feed)
    result["description"] = _get_text(feed.get("description")) or _get_text(feed.get("subtitle"))
    result["image_url"] = _get_image_url(feed)
    result["website_url"] = _get_link(feed) or feed_url

    entries = getattr(parsed, "entries", None) or []
    for entry in entries:
        ep = _parse_entry_to_episode(entry)
        if ep:
            result["entries"].append(ep)
    return result


def _get_link(feed: Any) -> Optional[str]:
    """Extract channel link (website URL) from feed."""
    link = feed.get("link") if hasattr(feed, "get") else None
    if link and isinstance(link, str) and link.strip().startswith("http"):
        return link.strip()
    link = getattr(feed, "link", None)
    if link and isinstance(link, str) and link.strip().startswith("http"):
        return link.strip()
    return None


def _parse_entry_to_episode(entry: Any) -> Optional[Dict[str, Any]]:
    """Convert a feedparser entry to an episode dict with uuid, title, description, duration, published_date, file_url, file_type, size_bytes, video_url."""
    entry_id = _get_text(entry.get("id")) if hasattr(entry, "get") else None
    link = entry.get("link") if hasattr(entry, "get") else None
    if not link and hasattr(entry, "link"):
        link = entry.link
    link = _get_text(link) if link else None
    # Stable uuid: prefer entry id, else hash of link
    if entry_id and entry_id.strip().startswith("http"):
        raw = entry_id.strip()
    elif link:
        raw = link.strip()
    else:
        raw = (entry_id or "") + (link or "") + str(entry.get("title", ""))
    if not raw:
        return None
    uuid = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]

    title = _get_text(entry.get("title")) if hasattr(entry, "get") else None
    description = _get_text(entry.get("description")) or _get_text(entry.get("summary"))
    if hasattr(entry, "summary") and not description:
        description = _get_text(entry.summary)

    duration = _get_duration(entry)
    published_date = _get_published_date(entry)

    file_url, file_type, size_bytes = _get_enclosure_audio(entry)
    video_url = _get_video_url(entry)

    return {
        "uuid": uuid,
        "title": title,
        "description": description,
        "duration": duration,
        "published_date": published_date,
        "file_url": file_url,
        "file_type": file_type,
        "size_bytes": size_bytes,
        "video_url": video_url,
    }


def _get_duration(entry: Any) -> Optional[float]:
    """Extract duration in seconds from entry (itunes_duration or similar)."""
    dur = entry.get("itunes_duration") if hasattr(entry, "get") else None
    if dur is None:
        dur = getattr(entry, "itunes_duration", None)
    if dur is None:
        return None
    if isinstance(dur, (int, float)):
        return float(dur)
    if isinstance(dur, str):
        parts = dur.strip().split(":")
        if len(parts) == 1:
            try:
                return float(parts[0])
            except ValueError:
                return None
        if len(parts) == 2:
            try:
                return float(parts[0]) * 60 + float(parts[1])
            except ValueError:
                return None
        if len(parts) == 3:
            try:
                return float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2])
            except ValueError:
                return None
    return None


def _get_published_date(entry: Any) -> Optional[float]:
    """Extract published date as Unix timestamp."""
    published = entry.get("published_parsed") if hasattr(entry, "get") else None
    if published is None:
        published = getattr(entry, "published_parsed", None)
    if published is None:
        published = entry.get("updated_parsed") if hasattr(entry, "get") else None
    if published is None:
        published = getattr(entry, "updated_parsed", None)
    if published and hasattr(published, "tm_year"):
        import time
        return float(time.mktime(published))
    return None


def _get_enclosure_audio(entry: Any) -> tuple[Optional[str], Optional[str], Optional[int]]:
    """Get primary audio enclosure: (href, type, length). Prefer audio type."""
    enclosures = entry.get("enclosures") if hasattr(entry, "get") else []
    if not enclosures and hasattr(entry, "enclosures"):
        enclosures = entry.enclosures
    if not enclosures:
        # Single enclosure
        enc = entry.get("enclosure") if hasattr(entry, "get") else getattr(entry, "enclosure", None)
        if enc:
            enclosures = [enc]
    href, typ, length = None, None, None
    for enc in enclosures:
        h = enc.get("href") if isinstance(enc, dict) else getattr(enc, "href", None)
        t = enc.get("type") if isinstance(enc, dict) else getattr(enc, "type", None)
        l = enc.get("length") if isinstance(enc, dict) else getattr(enc, "length", None)
        if h and isinstance(h, str) and h.strip().startswith("http"):
            mt = (t or "").lower()
            if "audio" in mt or not mt:
                href = h.strip()
                typ = t.strip() if t and isinstance(t, str) else None
                length = int(l) if l is not None else None
                break
    if not href and enclosures:
        enc = enclosures[0]
        h = enc.get("href") if isinstance(enc, dict) else getattr(enc, "href", None)
        if h and isinstance(h, str) and h.strip().startswith("http"):
            href = h.strip()
            t = enc.get("type") if isinstance(enc, dict) else getattr(enc, "type", None)
            length = enc.get("length") if isinstance(enc, dict) else getattr(enc, "length", None)
            typ = t.strip() if t and isinstance(t, str) else None
            length = int(length) if length is not None else None
    return href, typ, length


def _get_video_url(entry: Any) -> Optional[str]:
    """Extract video URL from entry (media:content, enclosure with video type, etc.)."""
    # media:content with medium=video or type video/*
    media_content = entry.get("media_content") if hasattr(entry, "get") else []
    if not media_content and hasattr(entry, "media_content"):
        media_content = entry.media_content
    if media_content:
        for mc in media_content:
            medium = mc.get("medium") if isinstance(mc, dict) else getattr(mc, "medium", None)
            mt = (mc.get("type") or "") if isinstance(mc, dict) else (getattr(mc, "type", None) or "")
            url = mc.get("url") if isinstance(mc, dict) else getattr(mc, "url", None)
            if url and isinstance(url, str) and url.strip().startswith("http"):
                if (medium and "video" in str(medium).lower()) or "video" in mt.lower():
                    return url.strip()
    # enclosures with video type
    enclosures = entry.get("enclosures") if hasattr(entry, "get") else []
    if not enclosures and hasattr(entry, "enclosures"):
        enclosures = entry.enclosures
    if not enclosures:
        enc = entry.get("enclosure") if hasattr(entry, "get") else getattr(entry, "enclosure", None)
        if enc:
            enclosures = [enc]
    for enc in enclosures:
        h = enc.get("href") if isinstance(enc, dict) else getattr(enc, "href", None)
        t = (enc.get("type") or "") if isinstance(enc, dict) else (getattr(enc, "type", None) or "")
        if h and isinstance(h, str) and h.strip().startswith("http") and "video" in t.lower():
            return h.strip()
    return None


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
