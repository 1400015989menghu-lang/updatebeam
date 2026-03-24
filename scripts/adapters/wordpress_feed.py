from __future__ import annotations

import dataclasses
import json
import re
import ssl
import urllib.request
from html import unescape
from html.parser import HTMLParser
from typing import Any, Iterable, List, Optional

USER_AGENT = "Mozilla/5.0 (compatible; UpdateBeamWordPressAdapter/1.0)"
DEFAULT_TIMEOUT = 15


@dataclasses.dataclass(frozen=True)
class WordPressSourceConfig:
    slug: str
    root_url: str
    api_url: str
    allowed_link_prefixes: tuple[str, ...]


@dataclasses.dataclass(frozen=True)
class WordPressEntry:
    source_slug: str
    title: str
    source_url: str
    published_at: Optional[str]
    updated_at: Optional[str]
    summary: str
    body_text: str


LANDCO_MY = WordPressSourceConfig(
    slug="landco-my",
    root_url="https://landco.my/",
    api_url="https://landco.my/wp-json/wp/v2/posts?per_page=20&_embed=1",
    allowed_link_prefixes=("https://landco.my/information-sharing/",),
)

CCS_CO_COM = WordPressSourceConfig(
    slug="ccs-co-com",
    root_url="https://ccs-co.com/",
    api_url="https://ccs-co.com/wp-json/wp/v2/posts?per_page=20&_embed=1",
    allowed_link_prefixes=("https://ccs-co.com/post/", "https://ccs-co.com/"),
)


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._skip = False
        self._parts: List[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        if tag.lower() in {"script", "style"}:
            self._skip = True

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {"script", "style"}:
            self._skip = False

    def handle_data(self, data: str) -> None:
        if not self._skip and data:
            self._parts.append(data)

    def text(self) -> str:
        return " ".join(part.strip() for part in self._parts if part.strip())


def fetch_json(url: str, timeout: int = DEFAULT_TIMEOUT) -> Any:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json,text/plain;q=0.9,*/*;q=0.8",
        },
    )
    context = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
        payload = response.read().decode("utf-8", errors="ignore")
    return json.loads(payload)


def html_to_text(html_text: str) -> str:
    parser = TextExtractor()
    parser.feed(html_text)
    text = parser.text()
    text = unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def summarize_text(text: str, limit: int = 240) -> str:
    if len(text) <= limit:
        return text
    return f"{text[: limit - 1].rstrip()}…"


def is_allowed_link(url: str, prefixes: Iterable[str]) -> bool:
    return any(url.startswith(prefix) for prefix in prefixes)


def parse_wordpress_posts(payload: Any, config: WordPressSourceConfig) -> List[WordPressEntry]:
    if not isinstance(payload, list):
        return []

    entries: List[WordPressEntry] = []
    seen_urls: set[str] = set()
    for item in payload:
        if not isinstance(item, dict):
            continue
        url = str(item.get("link") or "").strip()
        if not url or url in seen_urls or not is_allowed_link(url, config.allowed_link_prefixes):
            continue
        seen_urls.add(url)

        rendered_title = item.get("title", {}).get("rendered") if isinstance(item.get("title"), dict) else ""
        rendered_excerpt = item.get("excerpt", {}).get("rendered") if isinstance(item.get("excerpt"), dict) else ""
        rendered_content = item.get("content", {}).get("rendered") if isinstance(item.get("content"), dict) else ""
        body_text = html_to_text(rendered_content)
        summary = html_to_text(rendered_excerpt) or summarize_text(body_text)
        entries.append(
            WordPressEntry(
                source_slug=config.slug,
                title=html_to_text(str(rendered_title)),
                source_url=url,
                published_at=str(item.get("date_gmt") or item.get("date") or "").strip() or None,
                updated_at=str(item.get("modified_gmt") or item.get("modified") or "").strip() or None,
                summary=summary,
                body_text=body_text,
            )
        )

    entries.sort(key=lambda item: (item.published_at or "", item.source_url), reverse=True)
    return entries


def crawl_wordpress_source(config: WordPressSourceConfig, timeout: int = DEFAULT_TIMEOUT) -> List[WordPressEntry]:
    payload = fetch_json(config.api_url, timeout=timeout)
    return parse_wordpress_posts(payload, config)


__all__ = [
    "CCS_CO_COM",
    "LANDCO_MY",
    "WordPressEntry",
    "WordPressSourceConfig",
    "crawl_wordpress_source",
    "parse_wordpress_posts",
]
