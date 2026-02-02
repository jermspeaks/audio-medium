#!/usr/bin/env python3
"""
Match OPML entries to DB podcasts by title and set feed_url from OPML's xmlUrl.
Run from project root. Usage:
  python enrich_feeds_from_opml.py [path/to/file.opml]
Default OPML path: PocketCasts.opml in project root.
"""
import argparse
import html
import re
import sys
from pathlib import Path

# Ensure project root is on path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from config import get_db_path
from database import get_connection, init_schema, update_podcast_feed_url
from api.utils.opml_parser import parse_opml


def _normalize_title(title: str) -> str:
    """Normalize for matching: strip, lower, decode entities, collapse spaces."""
    if not title:
        return ""
    s = title.strip().lower()
    s = html.unescape(s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Match OPML entries to DB podcasts by title and set feed_url from OPML."
    )
    parser.add_argument(
        "opml_path",
        nargs="?",
        default=str(PROJECT_ROOT / "PocketCasts.opml"),
        help="Path to OPML file (default: PocketCasts.opml in project root)",
    )
    args = parser.parse_args()
    opml_path = Path(args.opml_path)
    if not opml_path.is_file():
        print(f"Error: OPML file not found: {opml_path}", file=sys.stderr)
        sys.exit(1)

    opml_content = opml_path.read_bytes()
    try:
        entries = parse_opml(opml_content)
    except Exception as e:
        print(f"Error parsing OPML: {e}", file=sys.stderr)
        sys.exit(1)

    db_path = get_db_path()
    init_schema(db_path)

    with get_connection(db_path) as conn:
        cur = conn.execute(
            """SELECT uuid, title, website_url, feed_url FROM podcasts
               WHERE deleted_at IS NULL"""
        )
        podcasts = [dict(row) for row in cur.fetchall()]

    # Build normalized_title -> list of podcasts (for duplicate detection)
    by_normalized: dict[str, list[dict]] = {}
    for p in podcasts:
        t = (p.get("title") or "").strip()
        key = _normalize_title(t)
        if key not in by_normalized:
            by_normalized[key] = []
        by_normalized[key].append(p)

    updated = 0
    unmatched: list[str] = []
    multiple_matches: list[str] = []

    for entry in entries:
        feed_url = (entry.get("feed_url") or "").strip()
        opml_title = (entry.get("title") or "").strip()
        website_url = (entry.get("website_url") or "").strip() or None
        if not feed_url:
            continue
        key = _normalize_title(opml_title)
        candidates = by_normalized.get(key, [])
        if len(candidates) == 0:
            unmatched.append(opml_title)
            continue
        if len(candidates) > 1:
            multiple_matches.append(opml_title)
            continue
        podcast = candidates[0]
        update_podcast_feed_url(
            uuid=podcast["uuid"],
            feed_url=feed_url,
            website_url=website_url,
            db_path=db_path,
        )
        updated += 1

    print(f"Updated feed_url for {updated} podcast(s).")
    if unmatched:
        print(f"Unmatched OPML titles ({len(unmatched)}):")
        for t in unmatched[:20]:
            print(f"  - {t}")
        if len(unmatched) > 20:
            print(f"  ... and {len(unmatched) - 20} more")
    if multiple_matches:
        print(f"Multiple DB matches (skipped) ({len(multiple_matches)}):")
        for t in multiple_matches[:10]:
            print(f"  - {t}")
        if len(multiple_matches) > 10:
            print(f"  ... and {len(multiple_matches) - 10} more")


if __name__ == "__main__":
    main()
