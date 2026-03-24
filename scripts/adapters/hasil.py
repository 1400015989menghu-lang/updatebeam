from __future__ import annotations

import sys
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Mapping

SCRIPT_DIR = Path(__file__).resolve().parent
SCRIPTS_ROOT = SCRIPT_DIR.parent
if str(SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_ROOT))

from hasil_crawler import crawl_hasil  # noqa: E402
from review_queue import AdapterResult, DiscoveredUpdate  # noqa: E402

UTC8 = timezone(timedelta(hours=8))
SUPPORTED_SLUGS = {"hasil-en"}


@dataclass(frozen=True)
class HasilStrategy:
    slug: str
    root_url: str
    list_pages: tuple[str, ...]
    max_list_pages: int = 4
    max_detail_pages: int = 12


HASIL_STRATEGY = HasilStrategy(
    slug="hasil-en",
    root_url="https://www.hasil.gov.my/en/",
    list_pages=(
        "https://www.hasil.gov.my/en/announcement/",
        "https://www.hasil.gov.my/en/e-invoice/communication-and-publicity/media-release/",
        "https://www.hasil.gov.my/en/e-invoice/e-invoice-events/",
    ),
)


def supports_slug(slug: str) -> bool:
    return slug in SUPPORTED_SLUGS


def strategy_for_slug(slug: str) -> HasilStrategy:
    if slug != HASIL_STRATEGY.slug:
        raise KeyError(f"Unsupported hasil slug: {slug}")
    return HASIL_STRATEGY


def default_target_date(now: datetime | None = None) -> date:
    current = now.astimezone(UTC8) if now else datetime.now(tz=UTC8)
    return current.date() - timedelta(days=1)


def _map_label(category: str) -> str:
    if category == "e-invoice-event":
        return "Training / Webinar"
    if category in {"announcement", "e-invoice"}:
        return "Tax Notice"
    if category in {"media-release", "tax-publication", "tax-brochure"}:
        return "Public Guidance / Outreach"
    return "Other"


def crawl_source(
    source: Mapping[str, Any],
    *,
    target_date: date | None = None,
    max_list_pages: int | None = None,
    max_detail_pages: int | None = None,
) -> AdapterResult:
    slug = str(source["slug"])
    strategy = strategy_for_slug(slug)
    crawl_date = target_date or default_target_date()
    report = crawl_hasil(
        yesterday=crawl_date,
        max_list_pages=max_list_pages or strategy.max_list_pages,
        max_detail_pages=max_detail_pages or strategy.max_detail_pages,
    )

    items = []
    for item in report.items:
        if not item.source_url.lower().startswith(strategy.root_url.rstrip("/").lower()):
            continue
        items.append(
            DiscoveredUpdate(
                source_slug=slug,
                title=item.page_title,
                url=item.source_url,
                label=_map_label(item.category),
                published_date=item.published_date,
                updated_date=item.updated_date,
                summary=item.content_snippet,
                metadata={
                    "category": item.category,
                    "is_yesterday_item": item.is_yesterday_item,
                },
            )
        )

    return AdapterResult(
        source_slug=slug,
        adapter_name="hasil",
        automation_level="automatic",
        items=items,
        notes=[
            "Uses the existing HASiL-specific crawler with archive-aware seed generation.",
            "Detail URL dedupe should remain URL-hash based in the ingestion layer.",
        ],
        metadata={
            "target_date": crawl_date.isoformat(),
            "list_pages": list(strategy.list_pages),
            "discovered_count": len(items),
        },
    )
