"""OPML import service: parse OPML, find missing podcasts, enrich metadata from RSS."""
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, List, Dict, Any
from urllib.parse import urlparse

from config import get_db_path
from database import (
    init_schema,
    get_connection,
    upsert_podcast,
)
from api.utils.opml_parser import parse_opml
from api.utils.rss_fetcher import fetch_podcast_metadata
import uuid as uuid_module


@dataclass
class OPMLImportReport:
    """Result of an OPML import run."""
    podcasts_found: int = 0
    podcasts_added: int = 0
    podcasts_updated: int = 0
    metadata_enriched: int = 0
    errors: List[str] = field(default_factory=list)


def _canonical_feed_url(url: str) -> str:
    """Normalize feed URL for matching: strip, no trailing slash, https, lowercase host."""
    if not url or not isinstance(url, str):
        return ""
    s = url.strip().rstrip("/")
    if not s:
        return ""
    parsed = urlparse(s)
    if not parsed.netloc:
        return s
    scheme = "https" if parsed.scheme in ("http", "https") else (parsed.scheme or "https")
    path = parsed.path or "/"
    if parsed.query:
        path = path + "?" + parsed.query
    if parsed.fragment:
        path = path + "#" + parsed.fragment
    return f"{scheme}://{parsed.netloc.lower()}{path}"


def _uuid_from_feed_url(feed_url: str) -> str:
    """Generate deterministic UUID from feed URL."""
    return str(uuid_module.uuid5(uuid_module.NAMESPACE_URL, feed_url.strip()))


def import_opml(content: bytes, db_path: Optional[Path] = None) -> OPMLImportReport:
    """
    Parse OPML content, find missing podcasts, enrich metadata from RSS, and upsert.
    Returns report with counts and any errors.
    """
    db_path = db_path or get_db_path()
    init_schema(db_path)
    report = OPMLImportReport()

    try:
        entries = parse_opml(content)
    except Exception as e:
        report.errors.append(f"Failed to parse OPML: {e}")
        return report

    report.podcasts_found = len(entries)
    if not entries:
        return report

    with get_connection(db_path) as conn:
        # Build canonical feed_url -> podcast row (prefer row with higher episode_count)
        cur = conn.execute(
            """SELECT p.uuid, p.title, p.author, p.description, p.feed_url, p.image_url,
                      (SELECT COUNT(*) FROM episodes e WHERE e.podcast_uuid = p.uuid AND e.deleted_at IS NULL) AS episode_count
               FROM podcasts p
               WHERE p.deleted_at IS NULL AND TRIM(COALESCE(p.feed_url, '')) != ''"""
        )
        by_canonical: Dict[str, Dict[str, Any]] = {}
        for row in cur.fetchall():
            row_dict = dict(row)
            canonical = _canonical_feed_url(row_dict.get("feed_url") or "")
            if not canonical:
                continue
            existing_row = by_canonical.get(canonical)
            if existing_row is None or (row_dict.get("episode_count") or 0) > (existing_row.get("episode_count") or 0):
                by_canonical[canonical] = row_dict

        for entry in entries:
            feed_url = entry.get("feed_url") or ""
            opml_title = (entry.get("title") or "").strip() or None
            if not feed_url:
                continue

            existing = by_canonical.get(_canonical_feed_url(feed_url))
            rss_meta = fetch_podcast_metadata(feed_url)

            # Build title, author, description, image from RSS with OPML fallback
            title = (rss_meta.get("title") or opml_title or "").strip() or None
            author = (rss_meta.get("author") or "").strip() or None
            description = (rss_meta.get("description") or "").strip() or None
            image_url = (rss_meta.get("image_url") or "").strip() or None
            if not title:
                title = opml_title

            if existing:
                # Enrich only missing fields; prefer existing if present
                uuid_val = existing["uuid"]
                final_title = existing.get("title") or title
                final_author = existing.get("author") or author
                final_description = existing.get("description") or description
                final_image_url = existing.get("image_url") or image_url
                enriched = (
                    (not existing.get("author") and author)
                    or (not existing.get("description") and description)
                    or (not existing.get("image_url") and image_url)
                )
                if enriched:
                    report.metadata_enriched += 1
                # Always ensure feed_url and title are set
                upsert_podcast(
                    uuid=uuid_val,
                    title=final_title or existing.get("title"),
                    author=final_author or existing.get("author"),
                    description=final_description or existing.get("description"),
                    feed_url=existing.get("feed_url") or feed_url,
                    image_url=final_image_url or existing.get("image_url"),
                    conn=conn,
                )
                report.podcasts_updated += 1
            else:
                # New podcast: use RSS + OPML; if RSS failed, use OPML title only
                uuid_val = _uuid_from_feed_url(feed_url)
                if not title:
                    report.errors.append(f"No title for feed: {feed_url[:80]}...")
                    title = "Unknown"
                if rss_meta.get("title") or rss_meta.get("author") or rss_meta.get("description") or rss_meta.get("image_url"):
                    report.metadata_enriched += 1
                upsert_podcast(
                    uuid=uuid_val,
                    title=title,
                    author=author,
                    description=description,
                    feed_url=feed_url,
                    image_url=image_url,
                    conn=conn,
                )
                report.podcasts_added += 1
                # So duplicate feeds in the same OPML don't create duplicate rows
                by_canonical[_canonical_feed_url(feed_url)] = {
                    "uuid": uuid_val,
                    "title": title,
                    "author": author,
                    "description": description,
                    "feed_url": feed_url,
                    "image_url": image_url,
                    "episode_count": 0,
                }

    return report
