"""Parse OPML files to extract podcast feed URLs and titles."""
import xml.etree.ElementTree as ET
from typing import List, Dict, Any


def parse_opml(content: bytes | str) -> List[Dict[str, Any]]:
    """
    Parse OPML content and return list of podcast entries.
    Each entry has feed_url (from xmlUrl) and title (from text).
    Recursively walks outline elements to find entries with xmlUrl.
    """
    if isinstance(content, bytes):
        content = content.decode("utf-8", errors="replace")
    root = ET.fromstring(content)
    entries: List[Dict[str, Any]] = []

    def collect_outlines(element: ET.Element) -> None:
        for child in element:
            if child.tag.endswith("outline"):
                xml_url = child.get("xmlUrl") or child.get("xmlurl")
                if xml_url and xml_url.strip():
                    title = (child.get("text") or child.get("title") or "").strip()
                    entries.append({"feed_url": xml_url.strip(), "title": title or None})
            collect_outlines(child)

    collect_outlines(root)
    return entries
