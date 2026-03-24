from __future__ import annotations

import dataclasses
import datetime as dt
import email.utils
import html
import os
import re
import ssl
import sys
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable, Optional, Sequence

SCRIPT_ROOT = Path(__file__).resolve().parent.parent
if str(SCRIPT_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPT_ROOT))

from extract_pdf_text import extract_pdf_text_from_url  # noqa: E402

USER_AGENT = "Mozilla/5.0 (compatible; OpenClawProfessionalRSS/1.0)"
DEFAULT_TIMEOUT = int(os.getenv("RSS_PROFESSIONAL_TIMEOUT", "20"))
MIA_FEED_URL = "https://mia.org.my/feed/"
DEFAULT_MIA_KEYWORDS: Sequence[str] = (
    "by-laws",
    "audit quality",
    "international standards on auditing",
    "isa",
    "mia circular",
    "professional ethics",
    "quality management",
    "practice review",
)


@dataclasses.dataclass
class RssProfessionalItem:
    source_url: str
    title: str
    published_date: Optional[str]
    summary: str
    body_text: str
    matched_keywords: list[str]
    attachment_urls: list[str]
    content_type: str


@dataclasses.dataclass
class RssProfessionalReport:
    generated_at: str
    source_name: str
    feed_url: str
    items: list[RssProfessionalItem]


class HtmlTextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []
        self._skip = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        if tag.lower() in {"script", "style", "noscript"}:
            self._skip = True

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {"script", "style", "noscript"}:
            self._skip = False

    def handle_data(self, data: str) -> None:
        if not self._skip and data:
            self._parts.append(data)

    def text(self) -> str:
        return clean_text(" ".join(self._parts))


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value or "")).strip()


def fetch_bytes(url: str, timeout: int = DEFAULT_TIMEOUT) -> bytes:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/rss+xml,application/xml,text/xml,text/html,*/*;q=0.8",
    }
    request = urllib.request.Request(url, headers=headers)
    context = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
        return response.read()


def fetch_text(url: str, timeout: int = DEFAULT_TIMEOUT) -> str:
    body = fetch_bytes(url, timeout=timeout)
    return body.decode("utf-8", errors="ignore")


def parse_pub_date(raw_value: str | None) -> Optional[str]:
    if not raw_value:
        return None
    try:
        parsed = email.utils.parsedate_to_datetime(raw_value)
    except Exception:
        return None
    if parsed is None:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed.date().isoformat()


def normalize_keyword(keyword: str) -> str:
    return clean_text(keyword).lower()


def keyword_matches(texts: Iterable[str], keywords: Sequence[str]) -> list[str]:
    haystack = " ".join(clean_text(text).lower() for text in texts if text)
    matches = []
    for keyword in keywords:
        normalized = normalize_keyword(keyword)
        if not normalized:
            continue
        if normalized == "isa":
            if "isa" in haystack and ("audit" in haystack or "international standards on auditing" in haystack):
                matches.append(keyword)
            continue
        if normalized in haystack:
            matches.append(keyword)
    return matches


def extract_pdf_links(html_text: str) -> list[str]:
    links = re.findall(r'href=["\']([^"\']+\.pdf(?:\?[^"\']*)?)["\']', html_text, flags=re.I)
    return sorted(set(html.unescape(link) for link in links))


def extract_html_text(html_text: str) -> str:
    parser = HtmlTextExtractor()
    parser.feed(html_text)
    return parser.text()


def enrich_item_from_article(
    url: str,
    *,
    fetch_pdf: bool,
    keywords: Sequence[str],
) -> tuple[str, str, list[str], list[str], str]:
    try:
        html_text = fetch_text(url)
    except Exception:
        return "", "", [], [], "rss"

    body_text = extract_html_text(html_text)
    summary = clean_text(body_text[:400])
    attachment_urls = extract_pdf_links(html_text)
    matched_keywords = keyword_matches([body_text, summary], keywords)
    content_type = "html"

    if fetch_pdf and attachment_urls:
        try:
            pdf_result = extract_pdf_text_from_url(attachment_urls[0])
        except Exception:
            return summary, body_text, matched_keywords, attachment_urls, content_type
        merged_body = "\n".join(part for part in [body_text, pdf_result.text] if part)
        matched_keywords = keyword_matches([merged_body, summary], keywords)
        return summary, merged_body, matched_keywords, attachment_urls, "html+pdf"

    return summary, body_text, matched_keywords, attachment_urls, content_type


def crawl_mia_feed(
    *,
    feed_url: str = MIA_FEED_URL,
    keywords: Sequence[str] = DEFAULT_MIA_KEYWORDS,
    limit: int = 30,
    enrich_html: bool = True,
    fetch_pdf: bool = False,
) -> RssProfessionalReport:
    body = fetch_bytes(feed_url)
    root = ET.fromstring(body)
    items: list[RssProfessionalItem] = []

    channel = root.find("channel")
    if channel is None:
        return RssProfessionalReport(
            generated_at=dt.datetime.now(dt.timezone.utc).isoformat(),
            source_name="MIA",
            feed_url=feed_url,
            items=[],
        )

    for entry in channel.findall("item")[:limit]:
        title = clean_text(entry.findtext("title") or "")
        link = clean_text(entry.findtext("link") or "")
        description = clean_text(entry.findtext("description") or "")
        published_date = parse_pub_date(entry.findtext("pubDate"))
        body_text = description
        summary = description
        attachment_urls: list[str] = []
        content_type = "rss"
        matched_keywords = keyword_matches([title, description], keywords)

        if enrich_html and link:
            enriched_summary, enriched_body, enriched_matches, enriched_attachments, enriched_type = enrich_item_from_article(
                link,
                fetch_pdf=fetch_pdf,
                keywords=keywords,
            )
            if enriched_summary:
                summary = enriched_summary
            if enriched_body:
                body_text = enriched_body
            if enriched_attachments:
                attachment_urls = enriched_attachments
            if enriched_matches:
                matched_keywords = enriched_matches
            content_type = enriched_type

        items.append(
            RssProfessionalItem(
                source_url=link,
                title=title or link,
                published_date=published_date,
                summary=summary,
                body_text=body_text,
                matched_keywords=matched_keywords,
                attachment_urls=attachment_urls,
                content_type=content_type,
            )
        )

    return RssProfessionalReport(
        generated_at=dt.datetime.now(dt.timezone.utc).isoformat(),
        source_name="MIA",
        feed_url=feed_url,
        items=items,
    )


if __name__ == "__main__":
    report = crawl_mia_feed()
    print(f"MIA feed: {report.feed_url}")
    print(f"MIA items: {len(report.items)}")
    for item in report.items[:10]:
        print(f"- {item.published_date or 'n/a'} {item.title} [{item.content_type}] -> {item.source_url}")
