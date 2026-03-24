from __future__ import annotations

import re
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

from browser_probe import run_browser_probe  # noqa: E402
from review_queue import AdapterResult, DiscoveredUpdate, make_review_item  # noqa: E402

UTC8 = timezone(timedelta(hours=8))
BrowserMode = Literal["playwright-browser", "browser-plus-http"]


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._skip = False
        self._parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
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
        blockers=("Latest announcement cards are only partially visible in naive link extraction; row-level parsing is required.",),
        notes=("Parse dated announcement cards directly from the latest-announcement listing and hydrate matching detail pages with HTTP.",),
    ),
    "kwsp-gov-my": BrowserOfficialStrategy(
        slug="kwsp-gov-my",
        root_url="https://www.kwsp.gov.my/en/",
        mode="playwright-browser",
        entry_points=("https://www.kwsp.gov.my/en/",),
        blockers=("HTTP fetch returns 403, but browser sessions can still reach /en/w/* article pages.",),
        notes=("Use a browser session to discover /en/w/* detail links, then filter by visible article date or last-modified.",),
    ),
    "perkeso-gov-my": BrowserOfficialStrategy(
        slug="perkeso-gov-my",
        root_url="https://www.perkeso.gov.my/",
        mode="playwright-browser",
        entry_points=("https://www.perkeso.gov.my/en/about-us/source/media-statement.html",),
        blockers=("Anonymous HTTP returns a Request Rejected shell, but browser sessions can access the dated media-release listing page.",),
        notes=("Use the public Media Release page as the canonical dated listing for employer-facing updates.",),
    ),
    "deloitte-taxathand": BrowserOfficialStrategy(
        slug="deloitte-taxathand",
        root_url="https://www.taxathand.com/",
        mode="playwright-browser",
        entry_points=("https://www.taxathand.com/",),
        blockers=("Anonymous HTTP returns Access Denied, but browser sessions can access article pages and visible publication dates.",),
        notes=("Use browser discovery on the landing page and hydrate article detail pages directly.",),
    ),
}

CUSTOMS_ROW_RE = re.compile(r'<li class="latestnews-item.*?</li>', re.IGNORECASE | re.DOTALL)


def supports_slug(slug: str) -> bool:
    return slug in STRATEGIES


def strategy_for_slug(slug: str) -> BrowserOfficialStrategy:
    return STRATEGIES[slug]


def default_target_date(now: datetime | None = None) -> date:
    current = now.astimezone(UTC8) if now else datetime.now(tz=UTC8)
    return current.date() - timedelta(days=1)


def html_to_text(html_text: str) -> str:
    parser = TextExtractor()
    parser.feed(html_text)
    return re.sub(r"\s+", " ", parser.text()).strip()


def fetch_html(url: str, timeout: int = 20) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="ignore")


def parse_human_date(value: str) -> str | None:
    normalized = re.sub(r"\s+", " ", value or "").strip()
    if not normalized:
        return None
    for fmt in ("%d %b %Y", "%d %B %Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(normalized, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def extract_meta_title(html_text: str) -> str | None:
    for pattern in (
        r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)',
        r'<meta[^>]+name=["\']title["\'][^>]+content=["\']([^"\']+)',
        r"<title>([^<]+)</title>",
    ):
        match = re.search(pattern, html_text, re.IGNORECASE)
        if match:
            title = re.sub(r"\s+", " ", match.group(1)).strip()
            if title:
                return title
    return None


def summarize(value: str) -> str | None:
    normalized = re.sub(r"\s+", " ", value or "").strip()
    if not normalized:
        return None
    return f"{normalized[:239].rstrip()}…" if len(normalized) > 240 else normalized


def parse_customs_rows(list_html: str, entry_url: str) -> list[tuple[str, str, str]]:
    rows: list[tuple[str, str, str]] = []
    for row in CUSTOMS_ROW_RE.findall(list_html):
        href_match = re.search(r'href=["\']([^"\']*/en/archive/announcement/[^"\']+)["\']', row, re.IGNORECASE)
        if not href_match:
            continue
        date_match = re.search(r'<span class="detail_data">([^<]+)</span>', row, re.IGNORECASE)
        title_match = re.search(r'title=["\']([^"\']+)["\']', row, re.IGNORECASE)
        title_fallback = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", row)).strip()
        detail_url = urllib.parse.urljoin(entry_url, href_match.group(1))
        title = title_match.group(1).strip() if title_match else title_fallback
        published_date = parse_human_date(date_match.group(1)) if date_match else None
        if detail_url and published_date:
            rows.append((detail_url, title, published_date))
    return rows


def crawl_customs_source(source_slug: str, strategy: BrowserOfficialStrategy, target_date: date) -> AdapterResult:
    list_html = fetch_html(strategy.entry_points[0], timeout=20)
    candidates = parse_customs_rows(list_html, strategy.entry_points[0])
    if not candidates:
        return AdapterResult(
            source_slug=source_slug,
            adapter_name="browser-official",
            automation_level="review_required",
            review_items=[
                make_review_item(
                    source_slug=source_slug,
                    queue_reason="selector-review",
                    priority="high",
                    summary="No dated Customs announcement rows were found on the latest-announcement page.",
                    seed_url=strategy.entry_points[0],
                )
            ],
            notes=list(strategy.notes),
            metadata={"candidate_count": 0, "entry_points": list(strategy.entry_points)},
        )

    items: list[DiscoveredUpdate] = []
    for detail_url, title, published_date in candidates:
        if published_date != target_date.isoformat():
            continue
        detail_html = fetch_html(detail_url, timeout=20)
        body_text = html_to_text(detail_html)
        items.append(
            DiscoveredUpdate(
                source_slug=source_slug,
                title=extract_meta_title(detail_html) or title,
                url=detail_url,
                label="Announcement",
                published_date=published_date,
                summary=summarize(body_text),
                metadata={"discovered_from": strategy.entry_points[0]},
            )
        )

    return AdapterResult(
        source_slug=source_slug,
        adapter_name="browser-official",
        automation_level="automatic",
        items=items,
        review_items=[],
        notes=list(strategy.notes)
        + (
            ["No Customs announcement matched the requested target date."]
            if not items
            else ["Customs latest-announcement rows were parsed directly from the public listing page."]
        ),
        metadata={"candidate_count": len(candidates), "entry_points": list(strategy.entry_points)},
    )


def _adapter_result_from_probe(slug: str, probe_result: dict[str, Any]) -> AdapterResult:
    items = [
        DiscoveredUpdate(
            source_slug=slug,
            title=str(item.get("title") or item.get("url") or "Untitled update"),
            url=str(item.get("url") or ""),
            label=str(item.get("label") or "Other"),
            published_date=str(item.get("publishedDate") or "") or None,
            updated_date=str(item.get("updatedDate") or "") or None,
            summary=str(item.get("summary") or "") or None,
            metadata=dict(item.get("metadata") or {}),
        )
        for item in probe_result.get("items", [])
        if item.get("url")
    ]

    review_items = [
        make_review_item(
            source_slug=slug,
            queue_reason=str(review_item.get("queue_reason") or "browser-required"),
            priority=str(review_item.get("priority") or "high"),
            summary=str(review_item.get("summary") or "Browser review required."),
            seed_url=review_item.get("seed_url"),
            **dict(review_item.get("details") or {}),
        )
        for review_item in probe_result.get("reviewItems", [])
    ]

    return AdapterResult(
        source_slug=slug,
        adapter_name="browser-official",
        automation_level=str(probe_result.get("automationLevel") or "review_required"),
        items=items,
        review_items=review_items,
        notes=[str(note) for note in probe_result.get("notes", [])],
        metadata=dict(probe_result.get("metadata") or {}),
    )


def crawl_source(source: Mapping[str, Any], *, target_date: date | None = None) -> AdapterResult:
    crawl_date = target_date or default_target_date()
    slug = str(source["slug"])
    strategy = strategy_for_slug(slug)

    if slug == "customs-gov-my":
        return crawl_customs_source(slug, strategy, crawl_date)

    probe_result = run_browser_probe(slug, crawl_date, timeout_seconds=120)
    return _adapter_result_from_probe(slug, probe_result)
