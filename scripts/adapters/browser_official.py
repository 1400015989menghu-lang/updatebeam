from __future__ import annotations

import sys
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Literal, Mapping

SCRIPT_DIR = Path(__file__).resolve().parent
SCRIPTS_ROOT = SCRIPT_DIR.parent
if str(SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_ROOT))

from review_queue import AdapterResult, make_review_item  # noqa: E402

UTC8 = timezone(timedelta(hours=8))
BrowserMode = Literal["playwright-browser", "browser-plus-http"]


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


@dataclass(frozen=True)
class BrowserOfficialStrategy:
    slug: str
    root_url: str
    mode: BrowserMode
    entry_points: tuple[str, ...]
    blockers: tuple[str, ...]
    notes: tuple[str, ...]


STRATEGIES: dict[str, BrowserOfficialStrategy] = {
    "customs-gov-my": BrowserOfficialStrategy(
        slug="customs-gov-my",
        root_url="https://www.customs.gov.my/",
        mode="browser-plus-http",
        entry_points=(
            "https://www.customs.gov.my/en/latest-announcement",
            "https://www.customs.gov.my/",
        ),
        blockers=("WAF redirect/header anomalies", "Latest announcement page is publicly readable but does not expose stable detail links in raw HTML."),
        notes=("Prefer the public latest-announcement page for anonymous probing; keep this source review-only unless stable detail URLs surface.",),
    ),
    "kwsp-gov-my": BrowserOfficialStrategy(
        slug="kwsp-gov-my",
        root_url="https://www.kwsp.gov.my/en/",
        mode="playwright-browser",
        entry_points=("https://www.kwsp.gov.my/en/",),
        blockers=("Cloudflare challenge",),
        notes=("Do not rely on pure HTTP for discovery; start from browser session state and known employer/news sections.",),
    ),
    "perkeso-gov-my": BrowserOfficialStrategy(
        slug="perkeso-gov-my",
        root_url="https://www.perkeso.gov.my/",
        mode="playwright-browser",
        entry_points=("https://www.perkeso.gov.my/",),
        blockers=("Request Rejected",),
        notes=("Expect manual seed maintenance or browser snapshot review before safe automation is possible.",),
    ),
}


def supports_slug(slug: str) -> bool:
    return slug in STRATEGIES


def strategy_for_slug(slug: str) -> BrowserOfficialStrategy:
    return STRATEGIES[slug]


def default_target_date(now: datetime | None = None) -> date:
    current = now.astimezone(UTC8) if now else datetime.now(tz=UTC8)
    return current.date() - timedelta(days=1)


def build_playwright_plan(strategy: BrowserOfficialStrategy) -> list[str]:
    first_url = strategy.entry_points[0]
    return [
        f"open {first_url} --headed",
        "snapshot",
        "open the latest updates / announcements / employer section",
        "snapshot",
        "capture stable detail links and visible dates",
        "hand off detail URLs for HTTP/body extraction when available",
    ]


def http_probe(url: str) -> dict[str, Any]:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "text/html"})
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = response.read(6000)
        html_text = payload.decode("utf-8", errors="ignore")
        return {
            "url": url,
            "status": getattr(response, "status", 200),
            "final_url": response.geturl(),
            "html_text": html_text,
            "snippet": html_text[:400],
        }


def customs_detail_links(html_text: str, base_url: str) -> list[str]:
    parser = AnchorExtractor()
    parser.feed(html_text)
    detail_links: list[str] = []
    for href, _text in parser.links:
        absolute = urllib.parse.urljoin(base_url, href)
        lowered = absolute.lower()
        if "view=article" in lowered or "/article/" in lowered:
            detail_links.append(absolute)
    return list(dict.fromkeys(detail_links))


def crawl_source(source: Mapping[str, Any], *, target_date: date | None = None) -> AdapterResult:
    crawl_date = target_date or default_target_date()
    slug = str(source["slug"])
    strategy = strategy_for_slug(slug)
    details: dict[str, Any] = {
        "target_date": crawl_date.isoformat(),
        "mode": strategy.mode,
        "blockers": list(strategy.blockers),
        "playwright_plan": build_playwright_plan(strategy),
    }
    if slug == "customs-gov-my":
        try:
            probe = http_probe(strategy.entry_points[0])
            details["http_probe"] = {
                "status": probe["status"],
                "final_url": probe["final_url"],
            }
            details["detail_link_count"] = len(customs_detail_links(probe["html_text"], strategy.entry_points[0]))
        except Exception as exc:
            details["http_probe_error"] = str(exc)
    else:
        try:
            probe = http_probe(strategy.entry_points[0])
            details["http_probe"] = {
                "status": probe["status"],
                "final_url": probe["final_url"],
                "snippet": probe["snippet"][:180],
            }
        except Exception as exc:
            details["http_probe_error"] = str(exc)
    review_item = make_review_item(
        source_slug=slug,
        queue_reason="browser-required",
        priority="critical" if slug in {"kwsp-gov-my", "perkeso-gov-my"} else "high",
        summary="This source requires browser-assisted discovery before reliable automation can proceed.",
        seed_url=strategy.entry_points[0],
        **details,
    )
    return AdapterResult(
        source_slug=slug,
        adapter_name="browser-official",
        automation_level="review_required",
        review_items=[review_item],
        notes=list(strategy.notes),
        metadata={
            "mode": strategy.mode,
            "entry_points": list(strategy.entry_points),
            "blockers": list(strategy.blockers),
            "target_date": crawl_date.isoformat(),
        },
    )
