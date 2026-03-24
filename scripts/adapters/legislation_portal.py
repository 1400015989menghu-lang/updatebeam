from __future__ import annotations

import re
import sys
import urllib.parse
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable, Mapping

SCRIPT_DIR = Path(__file__).resolve().parent
SCRIPTS_ROOT = SCRIPT_DIR.parent
if str(SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_ROOT))

from hasil_crawler import fetch_text  # noqa: E402
from review_queue import AdapterResult, DiscoveredUpdate, make_review_item  # noqa: E402

UTC8 = timezone(timedelta(hours=8))
SUPPORTED_SLUGS = {"lom-agc-my"}


@dataclass(frozen=True)
class LegislationPortalStrategy:
    slug: str
    root_url: str
    seed_urls: tuple[str, ...]
    allowed_keywords: tuple[str, ...]
    title_keywords: tuple[str, ...]
    timeout_note: str


LOM_AGC_STRATEGY = LegislationPortalStrategy(
    slug="lom-agc-my",
    root_url="https://lom.agc.gov.my/index.php",
    seed_urls=(
        "https://lom.agc.gov.my/index.php",
        "https://lom.agc.gov.my/act-view.php",
        "https://lom.agc.gov.my/list-of-acts.php",
    ),
    allowed_keywords=("income tax", "stamp duty", "gazette", "order", "act", "amendment"),
    title_keywords=("income tax", "stamp duty", "order", "gazette", "amendment", "act"),
    timeout_note="The legislation portal is slow and should be treated as a query-driven registry, not a generic news site.",
)


class AnchorExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self._href: str | None = None
        self._buffer: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        self._href = None
        self._buffer = []
        for key, value in attrs:
            if key.lower() == "href" and value:
                self._href = value.strip()
                break

    def handle_data(self, data: str) -> None:
        if self._href is not None and data:
            self._buffer.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() != "a" or self._href is None:
            return
        text = " ".join(part.strip() for part in self._buffer if part.strip())
        self.links.append((self._href, text))
        self._href = None
        self._buffer = []


def supports_slug(slug: str) -> bool:
    return slug in SUPPORTED_SLUGS


def strategy_for_slug(slug: str) -> LegislationPortalStrategy:
    if slug != LOM_AGC_STRATEGY.slug:
        raise KeyError(f"Unsupported legislation slug: {slug}")
    return LOM_AGC_STRATEGY


def default_target_date(now: datetime | None = None) -> date:
    current = now.astimezone(UTC8) if now else datetime.now(tz=UTC8)
    return current.date() - timedelta(days=1)


def normalize_url(url: str, base_url: str) -> str:
    absolute = urllib.parse.urljoin(base_url, url)
    parsed = urllib.parse.urlsplit(absolute)
    cleaned_query = urllib.parse.parse_qsl(parsed.query, keep_blank_values=False)
    keep_query = [(key, value) for key, value in cleaned_query if key.lower() in {"id", "lang", "search"}]
    return urllib.parse.urlunsplit(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            urllib.parse.urlencode(keep_query),
            "",
        )
    )


def discover_links(html_text: str, base_url: str) -> list[tuple[str, str]]:
    parser = AnchorExtractor()
    parser.feed(html_text)
    return [(normalize_url(href, base_url), text) for href, text in parser.links if href]


def match_keywords(text: str, keywords: Iterable[str]) -> bool:
    lower = text.lower()
    return any(keyword in lower for keyword in keywords)


def detect_dates(text: str) -> tuple[str | None, str | None]:
    date_match = re.findall(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b", text)
    if not date_match:
        return None, None
    normalized = []
    for value in date_match:
        if re.match(r"\d{4}-\d{2}-\d{2}", value):
            normalized.append(value)
            continue
        day, month, year = re.split(r"[/-]", value)
        year = year if len(year) == 4 else f"20{year}"
        normalized.append(f"{year}-{int(month):02d}-{int(day):02d}")
    published = normalized[0]
    updated = normalized[1] if len(normalized) > 1 else None
    return published, updated


def crawl_source(source: Mapping[str, Any], *, target_date: date | None = None) -> AdapterResult:
    slug = str(source["slug"])
    strategy = strategy_for_slug(slug)
    crawl_date = target_date or default_target_date()
    items: list[DiscoveredUpdate] = []
    notes = [strategy.timeout_note]
    review_items = []
    failed_seed_urls: list[str] = []

    for seed_url in strategy.seed_urls:
        html_text = fetch_text(seed_url, timeout=12)
        if not html_text:
            failed_seed_urls.append(seed_url)
            continue

        for url, anchor_text in discover_links(html_text, seed_url):
            combined = f"{anchor_text} {url}"
            if not match_keywords(combined, strategy.allowed_keywords):
                continue
            published_date, updated_date = detect_dates(combined)
            items.append(
                DiscoveredUpdate(
                    source_slug=slug,
                    title=anchor_text or url,
                    url=url,
                    label="Policy / Legal Change",
                    published_date=published_date,
                    updated_date=updated_date,
                    summary=None,
                    metadata={"seed_url": seed_url},
                )
            )

    deduped: dict[str, DiscoveredUpdate] = {}
    for item in items:
        if item.url not in deduped:
            deduped[item.url] = item

    if not deduped:
        for seed_url in failed_seed_urls:
            review_items.append(
                make_review_item(
                    source_slug=slug,
                    queue_reason="portal-timeout",
                    priority="high",
                    summary="Legislation portal seed URL timed out or returned no HTML.",
                    seed_url=seed_url,
                    strategy="query-driven legislation portal",
                )
            )
        review_items.append(
            make_review_item(
                source_slug=slug,
                queue_reason="selector-review",
                priority="high",
                summary="No legislation candidates were discovered from the current seed URLs.",
                seed_url=strategy.seed_urls[0],
                target_date=crawl_date.isoformat(),
                recommendation="Use fixed search/result pages for tax-related Acts, Orders, and Gazette entries.",
            )
        )

    return AdapterResult(
        source_slug=slug,
        adapter_name="legislation-portal",
        automation_level="hybrid",
        items=list(deduped.values()),
        review_items=review_items,
        notes=notes + ([f"Failed seed URLs: {', '.join(failed_seed_urls)}"] if failed_seed_urls else []),
        metadata={
            "target_date": crawl_date.isoformat(),
            "seed_urls": list(strategy.seed_urls),
            "candidate_count": len(deduped),
            "failed_seed_urls": failed_seed_urls,
        },
    )
