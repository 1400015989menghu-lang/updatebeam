from __future__ import annotations

import dataclasses
import json
import re
import ssl
import urllib.parse
import urllib.request
from typing import Any, Iterable, List, Optional

USER_AGENT = "Mozilla/5.0 (compatible; UpdateBeamChangelogAdapter/1.0)"
DEFAULT_TIMEOUT = 15


@dataclasses.dataclass(frozen=True)
class ChangelogSourceConfig:
    slug: str
    root_url: str
    structured_types: tuple[str, ...] = ("Blog", "CollectionPage")


@dataclasses.dataclass(frozen=True)
class ChangelogEntry:
    source_slug: str
    title: str
    source_url: str
    published_at: Optional[str]
    summary: str
    version: Optional[str] = None


SQL_ACCOUNTING_CHANGELOG = ChangelogSourceConfig(
    slug="sql-accounting-changelog",
    root_url="https://docs.sql.com.my/sqlacc/changelog",
)


def fetch_text(url: str, timeout: int = DEFAULT_TIMEOUT) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        },
    )
    context = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
        payload = response.read()
        content_type = response.headers.get("Content-Type", "")
    charset_match = re.search(r"charset=([A-Za-z0-9._-]+)", content_type)
    encoding = charset_match.group(1) if charset_match else "utf-8"
    try:
        return payload.decode(encoding, errors="ignore")
    except LookupError:
        return payload.decode("utf-8", errors="ignore")


def extract_json_ld_blocks(html_text: str) -> List[Any]:
    pattern = re.compile(
        r"<script[^>]+type=['\"]application/ld\+json['\"][^>]*>(.*?)</script>",
        re.IGNORECASE | re.DOTALL,
    )
    blocks: List[Any] = []
    for raw_block in pattern.findall(html_text):
        block = raw_block.strip()
        if not block:
            continue
        try:
            blocks.append(json.loads(block))
        except json.JSONDecodeError:
            continue
    return blocks


def iter_graph_nodes(payload: Any) -> Iterable[dict[str, Any]]:
    if isinstance(payload, dict):
        if "@graph" in payload and isinstance(payload["@graph"], list):
            for item in payload["@graph"]:
                if isinstance(item, dict):
                    yield item
        yield payload
    elif isinstance(payload, list):
        for item in payload:
            if isinstance(item, dict):
                yield item


def normalize_url(url: str, base_url: str) -> str:
    return urllib.parse.urljoin(base_url, url.strip())


def extract_blog_posts(payload: Any, base_url: str) -> List[ChangelogEntry]:
    entries: List[ChangelogEntry] = []
    seen_urls: set[str] = set()

    for node in iter_graph_nodes(payload):
        if node.get("@type") not in SQL_ACCOUNTING_CHANGELOG.structured_types:
            continue

        blog_posts = node.get("blogPost")
        if not isinstance(blog_posts, list):
            continue

        for item in blog_posts:
            if not isinstance(item, dict):
                continue
            url = normalize_url(str(item.get("url") or item.get("@id") or ""), base_url)
            if not url or url in seen_urls:
                continue
            seen_urls.add(url)
            title = str(item.get("headline") or item.get("name") or "").strip()
            if not title:
                continue
            summary = str(item.get("description") or "").strip()
            version = title if re.match(r"^\d+\.\d+\.\d+\.\d+$", title) else None
            entries.append(
                ChangelogEntry(
                    source_slug=SQL_ACCOUNTING_CHANGELOG.slug,
                    title=title,
                    source_url=url,
                    published_at=str(item.get("datePublished") or "").strip() or None,
                    summary=summary,
                    version=version,
                )
            )

    return entries


def parse_sql_accounting_changelog(html_text: str, base_url: str = SQL_ACCOUNTING_CHANGELOG.root_url) -> List[ChangelogEntry]:
    entries: List[ChangelogEntry] = []
    for payload in extract_json_ld_blocks(html_text):
        entries.extend(extract_blog_posts(payload, base_url))

    entries.sort(key=lambda item: (item.published_at or "", item.source_url), reverse=True)
    return entries


def crawl_sql_accounting_changelog(timeout: int = DEFAULT_TIMEOUT) -> List[ChangelogEntry]:
    html_text = fetch_text(SQL_ACCOUNTING_CHANGELOG.root_url, timeout=timeout)
    return parse_sql_accounting_changelog(html_text)


__all__ = [
    "ChangelogEntry",
    "ChangelogSourceConfig",
    "SQL_ACCOUNTING_CHANGELOG",
    "crawl_sql_accounting_changelog",
    "extract_json_ld_blocks",
    "parse_sql_accounting_changelog",
]
