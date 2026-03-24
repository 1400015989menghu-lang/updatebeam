from __future__ import annotations

import json
import re
import sys
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Any, Iterable, Literal, Mapping

SCRIPT_DIR = Path(__file__).resolve().parent
SCRIPTS_ROOT = SCRIPT_DIR.parent
if str(SCRIPTS_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_ROOT))

from hasil_crawler import fetch_text  # noqa: E402
from review_queue import AdapterResult, DiscoveredUpdate, make_review_item  # noqa: E402

UTC8 = timezone(timedelta(hours=8))
PortalMode = Literal["wordpress-json", "sharepoint-html", "static-portal"]


@dataclass(frozen=True)
class OfficialPortalStrategy:
    slug: str
    mode: PortalMode
    root_url: str
    seed_urls: tuple[str, ...]
    keywords: tuple[str, ...]
    api_endpoints: tuple[str, ...] = ()
    notes: tuple[str, ...] = ()


STRATEGIES: dict[str, OfficialPortalStrategy] = {
    "mida-gov-my": OfficialPortalStrategy(
        slug="mida-gov-my",
        mode="static-portal",
        root_url="https://www.mida.gov.my/",
        seed_urls=(
            "https://www.mida.gov.my/media-and-events/news/",
            "https://www.mida.gov.my/media-and-events/announcement-media-release/",
            "https://www.mida.gov.my/why-malaysia/mida-insights/",
        ),
        keywords=(
            "investment",
            "investments",
            "incentive",
            "allowance",
            "automation",
            "digital",
            "manufacturing",
            "semiconductor",
            "data centre",
            "fdi",
            "news release",
            "mida news",
        ),
        notes=("MIDA now exposes the public article stream in HTML pages; the old wp-json endpoints are no longer reliable.",),
    ),
    "ssm-com-my": OfficialPortalStrategy(
        slug="ssm-com-my",
        mode="sharepoint-html",
        root_url="https://www.ssm.com.my/Pages/Home.aspx",
        seed_urls=(
            "https://www.ssm.com.my/Pages/Home.aspx",
            "https://www.ssm.com.my/Pages/RSS.aspx",
            "https://www.ssm.com.my/Pages/Publication/Press_Release/Press-Release.aspx",
            "https://www.ssm.com.my/Pages/Gallery/Online_News/Online_News.aspx",
            "https://www.ssm.com.my/Lists/Announcement/AllItems.aspx",
            "https://www.ssm.com.my/Pages/Footer/Sitemap.aspx",
        ),
        keywords=(
            "practice note",
            "mbrs",
            "beneficial ownership",
            "annual return",
            "financial statement",
            "press release",
            "announcement",
            "online news",
            "circular",
            "compliance",
        ),
        notes=("SSM exposes better discovery through RSS, press releases, online news, and the announcement list than through the homepage alone.",),
    ),
    "mysst-customs-gov-my": OfficialPortalStrategy(
        slug="mysst-customs-gov-my",
        mode="static-portal",
        root_url="https://mysst.customs.gov.my/",
        seed_urls=(
            "https://mysst.customs.gov.my/Announcement",
            "https://mysst.customs.gov.my/highlights",
            "https://mysst.customs.gov.my/SSTOrders",
            "https://mysst.customs.gov.my/SSTHandbook",
            "https://mysst.customs.gov.my/SSTOffice",
        ),
        keywords=("service tax", "sales tax", "sst", "tourism tax", "customs ruling", "announcement", "highlights"),
        notes=("Static announcement and highlights pages are the primary discovery source; homepage-only discovery is too sparse.",),
    ),
}


class AnchorExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self._href: str | None = None
        self._buffer: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        for key, value in attrs:
            if key.lower() == "href" and value:
                self._href = value.strip()
                break
        self._buffer = []

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


def supports_slug(slug: str) -> bool:
    return slug in STRATEGIES


def strategy_for_slug(slug: str) -> OfficialPortalStrategy:
    return STRATEGIES[slug]


def default_target_date(now: datetime | None = None) -> date:
    current = now.astimezone(UTC8) if now else datetime.now(tz=UTC8)
    return current.date() - timedelta(days=1)


def parse_human_date(value: str) -> str | None:
    normalized = re.sub(r"\s+", " ", value or "").strip().strip("[]")
    if not normalized:
        return None
    for fmt in ("%d %b %Y", "%d %B %Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(normalized, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def normalize_url(url: str, base_url: str) -> str:
    joined = urllib.parse.urljoin(base_url, url)
    parsed = urllib.parse.urlsplit(joined)
    query_items = urllib.parse.parse_qsl(parsed.query, keep_blank_values=False)
    keep_query = [(key, value) for key, value in query_items if key.lower() in {"id", "page", "category"}]
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urllib.parse.urlencode(keep_query), ""))


def html_to_text(html_text: str) -> str:
    parser = TextExtractor()
    parser.feed(html_text)
    return re.sub(r"\s+", " ", parser.text()).strip()


def extract_meta_title(html_text: str) -> str | None:
    patterns = (
        r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)',
        r'<meta[^>]+name=["\']title["\'][^>]+content=["\']([^"\']+)',
        r"<title>([^<]+)</title>",
    )
    for pattern in patterns:
        match = re.search(pattern, html_text, re.IGNORECASE)
        if match:
            title = re.sub(r"\s+", " ", match.group(1)).strip()
            if title:
                return title
    return None


def extract_article_dates(html_text: str) -> tuple[str | None, str | None]:
    patterns = (
        ("published", r'"datePublished"\s*:\s*"([^"]+)"'),
        ("updated", r'"dateModified"\s*:\s*"([^"]+)"'),
        ("published", r'<meta[^>]+property=["\']article:published_time["\'][^>]+content=["\']([^"\']+)'),
        ("updated", r'<meta[^>]+property=["\']article:modified_time["\'][^>]+content=["\']([^"\']+)'),
        ("published", r'<time[^>]+datetime=["\']([^"\']+)'),
    )
    published: str | None = None
    updated: str | None = None
    for field, pattern in patterns:
        match = re.search(pattern, html_text, re.IGNORECASE)
        if not match:
            continue
        value = match.group(1).strip()
        if len(value) >= 10:
            normalized = value[:10]
            if field == "published" and published is None:
                published = normalized
            elif field == "updated" and updated is None:
                updated = normalized
    return published, updated


def derive_title_from_url(url: str) -> str:
    path = urllib.parse.urlsplit(url).path.rstrip("/")
    slug = path.split("/")[-1] if path else url
    if not slug:
        return url
    return re.sub(r"[-_]+", " ", slug).strip().title() or url


def mida_detail_urls(html_text: str) -> list[str]:
    matches = re.findall(r'https://www\.mida\.gov\.my/(?:mida-news|media-release)/[^"\s<>]+', html_text, re.IGNORECASE)
    seen: set[str] = set()
    ordered: list[str] = []
    for url in matches:
        normalized = url.rstrip("/")
        if normalized in seen:
            continue
        seen.add(normalized)
        ordered.append(normalized)
    return ordered


def crawl_mida_detail_pages(source_slug: str, strategy: OfficialPortalStrategy, target_date: date) -> AdapterResult:
    detail_urls: list[str] = []
    failed_seed_urls: list[str] = []
    notes = list(strategy.notes)

    for seed_url in strategy.seed_urls:
        html_text = fetch_text(seed_url, timeout=12)
        if not html_text:
            failed_seed_urls.append(seed_url)
            continue
        detail_urls.extend(mida_detail_urls(html_text))

    deduped_urls = list(dict.fromkeys(detail_urls))[:5]
    if not deduped_urls:
        review_items = [make_review_item(
            source_slug=source_slug,
            queue_reason="selector-review",
            priority="medium",
            summary="No MIDA detail article URLs were discovered from the current seed pages.",
            seed_url=strategy.seed_urls[0],
            mode=strategy.mode,
        )]
        for seed_url in failed_seed_urls:
            review_items.append(
                make_review_item(
                    source_slug=source_slug,
                    queue_reason="seed-fetch-failed",
                    priority="medium",
                    summary="Seed page returned no HTML; selectors or browser fallback may be required.",
                    seed_url=seed_url,
                    mode=strategy.mode,
                )
            )
        return AdapterResult(
            source_slug=source_slug,
            adapter_name="official-portal",
            automation_level="review_required",
            review_items=review_items,
            notes=notes,
            metadata={"mode": strategy.mode, "seed_urls": list(strategy.seed_urls), "candidate_count": 0, "failed_seed_urls": failed_seed_urls},
        )

    items: list[DiscoveredUpdate] = []
    stale_count = 0
    for detail_url in deduped_urls:
        detail_html = fetch_text(detail_url, timeout=6)
        if not detail_html:
            continue
        published_date, updated_date = extract_article_dates(detail_html)
        if published_date != target_date.isoformat() and updated_date != target_date.isoformat():
            older_than_target = (
                (published_date is not None and published_date < target_date.isoformat())
                or (updated_date is not None and updated_date < target_date.isoformat())
            )
            if older_than_target:
                stale_count += 1
                if stale_count >= 3:
                    break
            continue
        title = extract_meta_title(detail_html) or derive_title_from_url(detail_url)
        body_text = html_to_text(detail_html)
        items.append(
            DiscoveredUpdate(
                source_slug=source_slug,
                title=title,
                url=detail_url,
                label="Other",
                published_date=published_date,
                updated_date=updated_date,
                summary=body_text[:240] or None,
                metadata={"detail_only": True},
            )
        )

    automation_level: Literal["automatic", "review_required"] = "automatic"
    review_items = []
    if not items:
        notes.append(f"No MIDA detail pages matched target_date={target_date.isoformat()}.")
    return AdapterResult(
        source_slug=source_slug,
        adapter_name="official-portal",
        automation_level=automation_level,
        items=items,
        review_items=review_items,
        notes=notes + ([f"Failed seed URLs: {', '.join(failed_seed_urls)}"] if failed_seed_urls else []),
        metadata={"mode": strategy.mode, "seed_urls": list(strategy.seed_urls), "candidate_count": len(items), "failed_seed_urls": failed_seed_urls},
    )


def mysst_overlay_map(html_text: str, base_url: str) -> dict[str, str]:
    overlays: dict[str, str] = {}
    for overlay_id, asset_path in re.findall(
        r'<div id="(myNav\d+)".*?<object[^>]+data="([^"]+)"',
        html_text,
        re.IGNORECASE | re.DOTALL,
    ):
        overlays[overlay_id] = normalize_url(asset_path, base_url)
    return overlays


def crawl_mysst_pages(source_slug: str, strategy: OfficialPortalStrategy, target_date: date) -> AdapterResult:
    items: dict[str, DiscoveredUpdate] = {}
    failed_seed_urls: list[str] = []

    for seed_url in strategy.seed_urls:
        html_text = fetch_text(seed_url, timeout=12)
        if not html_text:
            failed_seed_urls.append(seed_url)
            continue

        overlay_targets = mysst_overlay_map(html_text, seed_url)
        for row in re.findall(r"<tr>.*?</tr>", html_text, re.IGNORECASE | re.DOTALL):
            date_match = re.search(r"\[\s*([0-9]{1,2}/[0-9]{1,2}/[0-9]{4})\s*\]", row)
            if not date_match:
                continue
            published_date = parse_human_date(date_match.group(1))
            if published_date != target_date.isoformat():
                continue

            title_match = re.search(r"<b>(.*?)</b>", row, re.IGNORECASE | re.DOTALL)
            link_match = re.search(r'href="([^"]+)"', row, re.IGNORECASE)
            overlay_match = re.search(r"openNav(\d+)\(\)", row, re.IGNORECASE)
            title = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", title_match.group(1) if title_match else row)).strip()

            detail_url = None
            if link_match:
                detail_url = normalize_url(link_match.group(1), seed_url)
            elif overlay_match:
                detail_url = overlay_targets.get(f"myNav{overlay_match.group(1)}")

            if not title or not detail_url:
                continue

            items[detail_url] = DiscoveredUpdate(
                source_slug=source_slug,
                title=title,
                url=detail_url,
                label="Tax Notice",
                published_date=published_date,
                summary=title,
                metadata={"discovered_from": seed_url},
            )

    review_items = []
    if not items and failed_seed_urls:
        for failed_seed_url in failed_seed_urls:
            review_items.append(
                make_review_item(
                    source_slug=source_slug,
                    queue_reason="seed-fetch-failed",
                    priority="medium",
                    summary="A MySST seed page returned no HTML during the crawl window.",
                    seed_url=failed_seed_url,
                    mode=strategy.mode,
                )
            )
    if not items and not failed_seed_urls:
        notes = ["MySST pages were reachable, but no row matched the requested target date."]
    else:
        notes = ["MySST highlights and announcement tables were parsed directly from the public portal."]

    return AdapterResult(
        source_slug=source_slug,
        adapter_name="official-portal",
        automation_level="automatic",
        items=list(items.values()),
        review_items=review_items,
        notes=list(strategy.notes) + notes,
        metadata={"mode": strategy.mode, "seed_urls": list(strategy.seed_urls), "candidate_count": len(items), "failed_seed_urls": failed_seed_urls},
    )


def link_matches(text: str, keywords: Iterable[str]) -> bool:
    lower = text.lower()
    return any(keyword in lower for keyword in keywords)


def infer_label(strategy: OfficialPortalStrategy, combined: str) -> str:
    lower = combined.lower()
    if strategy.slug == "ssm-com-my" and any(term in lower for term in ("practice note", "beneficial ownership", "annual return")):
        return "Policy / Legal Change"
    if strategy.slug in {"mida-gov-my", "mysst-customs-gov-my"} and any(term in lower for term in ("tax", "sst", "incentive", "allowance")):
        return "Tax Notice"
    return "Other"


def parse_html_candidates(
    source_slug: str,
    strategy: OfficialPortalStrategy,
    html_text: str,
    base_url: str,
) -> list[DiscoveredUpdate]:
    parser = AnchorExtractor()
    parser.feed(html_text)
    results: list[DiscoveredUpdate] = []
    for href, text in parser.links:
        combined = f"{text} {href}"
        if not link_matches(combined, strategy.keywords):
            continue
        normalized_url = normalize_url(href, base_url)
        lower_url = normalized_url.lower()
        if strategy.slug == "mida-gov-my":
            generic_text = re.sub(r"\s+", " ", text or "").strip().lower()
            if generic_text in {"read more", "more", "continue reading", "view more", "learn more"}:
                continue
            path = urllib.parse.urlsplit(normalized_url).path.rstrip("/")
            if path in {
                "/media-and-events/news",
                "/media-and-events/announcement-media-release",
                "/why-malaysia/mida-insights",
                "/why-malaysia/investment-statistics",
            }:
                continue
            detail_patterns = (
                r"/mida-news/",
                r"/media-release/",
                r"/20\d{2}/\d{2}/",
            )
            if not any(re.search(pattern, path) for pattern in detail_patterns):
                continue
            if path.startswith("/why-malaysia/") and path.count("/") < 4:
                continue
        if strategy.slug == "ssm-com-my" and not any(
            snippet in lower_url
            for snippet in (
                "/pages/publication/",
                "/pages/gallery/",
                "/lists/announcement/",
                "/pages/rss.aspx",
            )
        ):
            continue
        results.append(
            DiscoveredUpdate(
                source_slug=source_slug,
                title=text or normalized_url,
                url=normalized_url,
                label=infer_label(strategy, combined),
                metadata={"discovered_from": base_url},
            )
        )
    return results


def fetch_json(url: str) -> list[dict[str, Any]]:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
    with urllib.request.urlopen(request, timeout=12) as response:
        payload = response.read().decode("utf-8", errors="ignore")
    parsed = json.loads(payload)
    return parsed if isinstance(parsed, list) else []


def crawl_wordpress_json(source_slug: str, strategy: OfficialPortalStrategy) -> AdapterResult:
    items: list[DiscoveredUpdate] = []
    review_items = []
    for endpoint in strategy.api_endpoints:
        try:
            for entry in fetch_json(endpoint):
                title = re.sub(r"<[^>]+>", " ", str(entry.get("title", {}).get("rendered", ""))).strip()
                summary = re.sub(r"<[^>]+>", " ", str(entry.get("excerpt", {}).get("rendered", ""))).strip()
                items.append(
                    DiscoveredUpdate(
                        source_slug=source_slug,
                        title=title or str(entry.get("link") or "Untitled post"),
                        url=str(entry.get("link") or ""),
                        label="Other",
                        published_date=str(entry.get("date") or "")[:10] or None,
                        updated_date=str(entry.get("modified") or "")[:10] or None,
                        summary=summary or None,
                        metadata={"endpoint": endpoint, "wordpress_id": entry.get("id")},
                    )
                )
        except Exception as exc:
            review_items.append(
                make_review_item(
                    source_slug=source_slug,
                    queue_reason="api-fetch-failed",
                    priority="medium",
                    summary="WordPress JSON endpoint failed; HTML fallback or selector review required.",
                    seed_url=endpoint,
                    error=str(exc),
                )
            )

    deduped = {item.url: item for item in items if item.url}
    return AdapterResult(
        source_slug=source_slug,
        adapter_name="official-portal",
        automation_level="automatic" if deduped else "hybrid",
        items=list(deduped.values()),
        review_items=review_items,
        notes=list(strategy.notes),
        metadata={"mode": strategy.mode, "api_endpoints": list(strategy.api_endpoints)},
    )


def crawl_html_portal(source_slug: str, strategy: OfficialPortalStrategy) -> AdapterResult:
    items: list[DiscoveredUpdate] = []
    review_items = []
    failed_seed_urls: list[str] = []

    for seed_url in strategy.seed_urls:
        html_text = fetch_text(seed_url, timeout=12)
        if not html_text:
            failed_seed_urls.append(seed_url)
            continue

        items.extend(parse_html_candidates(source_slug, strategy, html_text, seed_url))

    deduped = {item.url: item for item in items}
    successful_seed_count = len(strategy.seed_urls) - len(failed_seed_urls)
    automation_level: Literal["hybrid", "review_required"]
    automation_level = "hybrid" if deduped else "review_required"
    if not deduped:
        if strategy.slug == "ssm-com-my" and successful_seed_count > 0:
            return AdapterResult(
                source_slug=source_slug,
                adapter_name="official-portal",
                automation_level="automatic",
                items=[],
                review_items=[],
                notes=list(strategy.notes) + ["No SSM candidates matched the configured keywords on this run."],
                metadata={
                    "mode": strategy.mode,
                    "seed_urls": list(strategy.seed_urls),
                    "candidate_count": 0,
                    "failed_seed_urls": failed_seed_urls,
                },
            )
        for seed_url in failed_seed_urls:
            review_items.append(
                make_review_item(
                    source_slug=source_slug,
                    queue_reason="seed-fetch-failed",
                    priority="high" if strategy.mode == "sharepoint-html" else "medium",
                    summary="Seed page returned no HTML; selectors or browser fallback may be required.",
                    seed_url=seed_url,
                    mode=strategy.mode,
                )
            )
        review_items.append(
            make_review_item(
                source_slug=source_slug,
                queue_reason="selector-review",
                priority="high" if strategy.mode == "sharepoint-html" else "medium",
                summary="No candidates matched the configured keywords from the current seed pages.",
                seed_url=strategy.seed_urls[0],
                mode=strategy.mode,
            )
        )

    return AdapterResult(
        source_slug=source_slug,
        adapter_name="official-portal",
        automation_level=automation_level,
        items=list(deduped.values()),
        review_items=review_items,
        notes=list(strategy.notes) + ([f"Failed seed URLs: {', '.join(failed_seed_urls)}"] if failed_seed_urls else []),
        metadata={"mode": strategy.mode, "seed_urls": list(strategy.seed_urls), "candidate_count": len(deduped), "failed_seed_urls": failed_seed_urls},
    )


def crawl_source(source: Mapping[str, Any], *, target_date: date | None = None) -> AdapterResult:
    crawl_date = target_date or default_target_date()
    slug = str(source["slug"])
    strategy = strategy_for_slug(slug)
    if slug == "mida-gov-my":
        return crawl_mida_detail_pages(slug, strategy, crawl_date)
    if slug == "mysst-customs-gov-my":
        return crawl_mysst_pages(slug, strategy, crawl_date)
    if strategy.mode == "wordpress-json":
        return crawl_wordpress_json(slug, strategy)
    return crawl_html_portal(slug, strategy)
