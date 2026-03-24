from __future__ import annotations

import dataclasses
import re
import ssl
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from typing import List, Optional

USER_AGENT = "Mozilla/5.0 (compatible; UpdateBeamVideoFeedAdapter/1.0)"
DEFAULT_TIMEOUT = 15
ATOM_NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
    "media": "http://search.yahoo.com/mrss/",
}


@dataclasses.dataclass(frozen=True)
class VideoFeedSourceConfig:
    slug: str
    root_url: str
    channel_handle: Optional[str] = None
    channel_id: Optional[str] = None
    review_notes: str = ""


@dataclasses.dataclass(frozen=True)
class VideoFeedEntry:
    source_slug: str
    title: str
    source_url: str
    published_at: Optional[str]
    updated_at: Optional[str]
    summary: str
    video_id: Optional[str] = None


ANC_GROUP_YOUTUBE = VideoFeedSourceConfig(
    slug="anc-group-youtube",
    root_url="https://youtube.com/@anc-group-tv",
    channel_handle="@anc-group-tv",
    channel_id="UC7RavcFRRABxa9ZQUZxdfbw",
    review_notes="Resolve channel_id once, then use the feed endpoint as the durable source.",
)


def fetch_text(url: str, timeout: int = DEFAULT_TIMEOUT) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.8",
        },
    )
    context = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
        payload = response.read()
    return payload.decode("utf-8", errors="ignore")


def build_feed_url(channel_id: str) -> str:
    return f"https://www.youtube.com/feeds/videos.xml?channel_id={urllib.parse.quote(channel_id)}"


def parse_channel_id_from_html(html_text: str) -> Optional[str]:
    patterns = (
        r'"channelId":"(UC[a-zA-Z0-9_-]+)"',
        r'"externalId":"(UC[a-zA-Z0-9_-]+)"',
        r'<meta[^>]+itemprop=["\']channelId["\'][^>]+content=["\'](UC[a-zA-Z0-9_-]+)',
    )
    for pattern in patterns:
        match = re.search(pattern, html_text)
        if match:
            return match.group(1)
    return None


def parse_youtube_feed(xml_text: str, source_slug: str) -> List[VideoFeedEntry]:
    root = ET.fromstring(xml_text)
    entries: List[VideoFeedEntry] = []
    for entry in root.findall("atom:entry", ATOM_NS):
        title = (entry.findtext("atom:title", default="", namespaces=ATOM_NS) or "").strip()
        link_element = entry.find("atom:link", ATOM_NS)
        href = link_element.attrib.get("href", "").strip() if link_element is not None else ""
        video_id = (entry.findtext("yt:videoId", default="", namespaces=ATOM_NS) or "").strip() or None
        summary = (entry.findtext("media:group/media:description", default="", namespaces=ATOM_NS) or "").strip()
        entries.append(
            VideoFeedEntry(
                source_slug=source_slug,
                title=title,
                source_url=href,
                published_at=(entry.findtext("atom:published", default="", namespaces=ATOM_NS) or "").strip() or None,
                updated_at=(entry.findtext("atom:updated", default="", namespaces=ATOM_NS) or "").strip() or None,
                summary=summary,
                video_id=video_id,
            )
        )
    return entries


def crawl_youtube_feed(config: VideoFeedSourceConfig, timeout: int = DEFAULT_TIMEOUT) -> List[VideoFeedEntry]:
    if not config.channel_id:
        raise ValueError(
            f"{config.slug} requires a resolved YouTube channel_id before automated feed crawling can run."
        )
    xml_text = fetch_text(build_feed_url(config.channel_id), timeout=timeout)
    return parse_youtube_feed(xml_text, config.slug)


__all__ = [
    "ANC_GROUP_YOUTUBE",
    "VideoFeedEntry",
    "VideoFeedSourceConfig",
    "build_feed_url",
    "crawl_youtube_feed",
    "parse_channel_id_from_html",
    "parse_youtube_feed",
]
