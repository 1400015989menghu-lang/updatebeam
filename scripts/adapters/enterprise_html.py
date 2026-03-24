from __future__ import annotations

import dataclasses
import re
import ssl
import urllib.parse
import urllib.request
from html import unescape
from html.parser import HTMLParser
from typing import Any, Iterable, List, Optional

USER_AGENT = "Mozilla/5.0 (compatible; UpdateBeamEnterpriseAdapter/1.0)"
DEFAULT_TIMEOUT = 15


@dataclasses.dataclass(frozen=True)
class EnterpriseSourceConfig:
    slug: str
    root_url: str
    discovery_urls: tuple[str, ...]
    allowed_domains: tuple[str, ...]
    include_keywords: tuple[str, ...]
    excluded_url_snippets: tuple[str, ...] = ()
    preferred_mode: str = "html"
    notes: str = ""
    max_candidates: int = 12


@dataclasses.dataclass(frozen=True)
class EnterpriseCandidate:
    source_slug: str
    title: str
    source_url: str
    matched_keywords: tuple[str, ...]
    published_at: Optional[str]
    summary: str


@dataclasses.dataclass(frozen=True)
class ReviewOnlyStrategy:
    slug: str
    rationale: str
    recommended_mode: str
    unblock_conditions: tuple[str, ...]


KPMG_MY = EnterpriseSourceConfig(
    slug="kpmg-my",
    root_url="https://kpmg.com/my/en/home.html",
    discovery_urls=(
        "https://kpmg.com/my/en/services/tax/tax-whiz.html",
        "https://kpmg.com/my/en/home/insights.html",
        "https://kpmg.com/my/en/services/tax/tax-whiz-general.html",
    ),
    allowed_domains=("kpmg.com",),
    include_keywords=("tax", "malaysia", "budget", "advisory", "insight", "press release", "sustainability", "tax whiz"),
    excluded_url_snippets=("/search", "/contact", "/careers"),
    preferred_mode="html",
    notes="Use the live /my/en discovery pages instead of deprecated /home/* paths to avoid 404s.",
    max_candidates=5,
)

YYC_ADVISORS = EnterpriseSourceConfig(
    slug="yyc-advisors",
    root_url="https://www.yycadvisors.com/",
    discovery_urls=(
        "https://www.yycadvisors.com/",
        "https://www.yycadvisors.com/news-and-press.html",
        "https://www.yycadvisors.com/accounting-articles.html",
        "https://www.yycadvisors.com/newsletter.html",
        "https://www.yycadvisors.com/tax.html",
    ),
    allowed_domains=("www.yycadvisors.com", "yycadvisors.com"),
    include_keywords=("tax", "accounting", "e-invoice", "advisory", "malaysia", "budget", "gst", "sst", "newsletter"),
    excluded_url_snippets=("/contact-us", "/site-map", "/privacy-policy"),
    preferred_mode="html",
    notes="Prefer the news-and-press and accounting-articles pages; the old XML discovery URLs are no longer stable.",
    max_candidates=4,
)

REVIEW_ONLY_STRATEGIES: dict[str, ReviewOnlyStrategy] = {
    "deloitte-taxathand": ReviewOnlyStrategy(
        slug="deloitte-taxathand",
        rationale="Direct anonymous HTML fetch returns Access Denied. This source is blocked before content extraction starts.",
        recommended_mode="review-only",
        unblock_conditions=(
            "Identify a stable public RSS or sitemap endpoint",
            "Verify country-specific listing pages are reachable without bot blocking",
            "Add a lightweight manual review path if automation stays blocked",
        ),
    ),
    "anc-group-facebook": ReviewOnlyStrategy(
        slug="anc-group-facebook",
        rationale="Browser navigation still times out on the Facebook share URL, and the page remains unsuitable for unattended anonymous crawling.",
        recommended_mode="review-only",
        unblock_conditions=(
            "A stable public RSS or export feed exists",
            "The source provides a website mirror or blog mirror",
            "A manual capture flow is explicitly accepted",
        ),
    ),
    "sql-accounting-xiaohongshu": ReviewOnlyStrategy(
        slug="sql-accounting-xiaohongshu",
        rationale="The profile HTML exposes a shell page, but browser sessions immediately hit a login wall before any notes become visible.",
        recommended_mode="review-only",
        unblock_conditions=(
            "Vendor provides an official website mirror",
            "A stable public API or feed becomes available",
            "A human-reviewed social ingestion flow is added",
        ),
    ),
    "sql-payroll-xiaohongshu": ReviewOnlyStrategy(
        slug="sql-payroll-xiaohongshu",
        rationale="The profile HTML exposes a shell page, but browser sessions immediately hit a login wall before any notes become visible.",
        recommended_mode="review-only",
        unblock_conditions=(
            "Vendor provides an official website mirror",
            "A stable public API or feed becomes available",
            "A human-reviewed social ingestion flow is added",
        ),
    ),
}


class LinkExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: List[tuple[str, str]] = []
        self._href: Optional[str] = None
        self._capture = False
        self._text_parts: List[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        if tag.lower() != "a":
            return
        href = None
        for key, value in attrs:
            if key.lower() == "href" and value:
                href = value.strip()
                break
        if href:
            self._href = href
            self._capture = True
            self._text_parts = []

    def handle_data(self, data: str) -> None:
        if self._capture and data:
            self._text_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() != "a" or not self._capture:
            return
        text = " ".join(part.strip() for part in self._text_parts if part.strip())
        self.links.append((self._href or "", text))
        self._href = None
        self._capture = False
        self._text_parts = []


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


def fetch_text(url: str, timeout: int = DEFAULT_TIMEOUT) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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


def html_to_text(html_text: str) -> str:
    parser = TextExtractor()
    parser.feed(html_text)
    text = unescape(parser.text())
    return re.sub(r"\s+", " ", text).strip()


def normalize_url(base_url: str, href: str) -> str:
    return urllib.parse.urljoin(base_url, href.strip())


def is_allowed_url(url: str, config: EnterpriseSourceConfig) -> bool:
    try:
        parsed = urllib.parse.urlparse(url)
    except ValueError:
        return False
    if parsed.scheme not in {"http", "https"}:
        return False
    if not any(domain in parsed.netloc for domain in config.allowed_domains):
        return False
    lowered = url.lower()
    if any(snippet.lower() in lowered for snippet in config.excluded_url_snippets):
        return False
    return True


def extract_links(html_text: str, base_url: str, config: EnterpriseSourceConfig) -> List[tuple[str, str]]:
    parser = LinkExtractor()
    parser.feed(html_text)
    seen: set[str] = set()
    links: List[tuple[str, str]] = []
    for href, text in parser.links:
        full_url = normalize_url(base_url, href)
        if not full_url or full_url in seen or not is_allowed_url(full_url, config):
            continue
        seen.add(full_url)
        links.append((full_url, html_to_text(text)))
    return links


def match_keywords(text: str, keywords: Iterable[str]) -> tuple[str, ...]:
    lowered = text.lower()
    return tuple(keyword for keyword in keywords if keyword.lower() in lowered)


def parse_published_at(html_text: str) -> Optional[str]:
    patterns = (
        r'"datePublished"\s*:\s*"([^"]+)"',
        r'"dateModified"\s*:\s*"([^"]+)"',
        r'<meta[^>]+property=["\']article:published_time["\'][^>]+content=["\']([^"\']+)',
        r'<meta[^>]+property=["\']article:modified_time["\'][^>]+content=["\']([^"\']+)',
        r'<time[^>]+datetime=["\']([^"\']+)',
    )
    for pattern in patterns:
        match = re.search(pattern, html_text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def discover_candidates(config: EnterpriseSourceConfig, timeout: int = DEFAULT_TIMEOUT) -> List[EnterpriseCandidate]:
    candidates: List[EnterpriseCandidate] = []
    seen_urls: set[str] = set()

    for discovery_url in config.discovery_urls:
        html_text = fetch_text(discovery_url, timeout=timeout)
        for url, title in extract_links(html_text, discovery_url, config):
            text_for_match = f"{title} {url}"
            matched = match_keywords(text_for_match, config.include_keywords)
            if not matched or url in seen_urls:
                continue
            seen_urls.add(url)
            candidates.append(
                EnterpriseCandidate(
                    source_slug=config.slug,
                    title=title or url,
                    source_url=url,
                    matched_keywords=matched,
                    published_at=None,
                    summary="Candidate detail page discovered from configured entrypoints.",
                )
            )
            if len(candidates) >= config.max_candidates:
                return candidates

    return candidates


def hydrate_candidate(candidate: EnterpriseCandidate, timeout: int = DEFAULT_TIMEOUT) -> EnterpriseCandidate:
    html_text = fetch_text(candidate.source_url, timeout=timeout)
    body_text = html_to_text(html_text)
    summary = body_text[:239].rstrip() + "…" if len(body_text) > 240 else body_text
    return EnterpriseCandidate(
        source_slug=candidate.source_slug,
        title=candidate.title,
        source_url=candidate.source_url,
        matched_keywords=candidate.matched_keywords,
        published_at=parse_published_at(html_text),
        summary=summary,
    )


def describe_review_only_strategy(slug: str) -> Optional[dict[str, Any]]:
    strategy = REVIEW_ONLY_STRATEGIES.get(slug)
    if not strategy:
        return None
    return dataclasses.asdict(strategy)


__all__ = [
    "EnterpriseCandidate",
    "EnterpriseSourceConfig",
    "KPMG_MY",
    "REVIEW_ONLY_STRATEGIES",
    "ReviewOnlyStrategy",
    "YYC_ADVISORS",
    "describe_review_only_strategy",
    "discover_candidates",
    "hydrate_candidate",
]
