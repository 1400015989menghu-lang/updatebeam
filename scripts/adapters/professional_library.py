from __future__ import annotations

import dataclasses
import datetime as dt
import html
import os
import re
import ssl
import sys
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable, Optional, Sequence

SCRIPT_ROOT = Path(__file__).resolve().parent.parent
if str(SCRIPT_ROOT) not in sys.path:
    sys.path.insert(0, str(SCRIPT_ROOT))

from extract_pdf_text import extract_pdf_text_from_url  # noqa: E402

USER_AGENT = "Mozilla/5.0 (compatible; OpenClawProfessionalLibrary/1.0)"
DEFAULT_TIMEOUT = int(os.getenv("PROFESSIONAL_LIBRARY_TIMEOUT", "6"))
DEFAULT_KEYWORDS: Sequence[str] = (
    "mfrs",
    "mpers",
    "pers",
    "financial reporting standards",
    "exposure draft",
    "technical pronouncement",
    "publication order",
    "standard",
    "amendment",
    "guidance",
    "consultation",
)
MASB_SEED_PAGES: Sequence[tuple[str, str]] = (
    ("exposure-drafts", "http://www.masb.org.my/pages.php?id=34"),
)
SKIP_URL_SNIPPETS = (
    "career",
    "committee",
    "secretariat",
    "annual report",
    "profile",
    "about us",
    "contact",
)


@dataclasses.dataclass
class ProfessionalLibraryItem:
    source_section: str
    source_url: str
    title: str
    published_date: Optional[str]
    summary: str
    content_type: str
    matched_keywords: list[str]
    attachment_urls: list[str]
    body_text: str


@dataclasses.dataclass
class ProfessionalLibraryReport:
    generated_at: str
    source_name: str
    seed_urls: list[str]
    items: list[ProfessionalLibraryItem]


class AnchorExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self._href: Optional[str] = None
        self._capture = False
        self._parts: list[str] = []

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
            self._parts = []

    def handle_data(self, data: str) -> None:
        if self._capture and data:
            self._parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() != "a" or not self._capture:
            return
        text = clean_text(" ".join(self._parts))
        self.links.append((self._href or "", text))
        self._href = None
        self._capture = False
        self._parts = []


class TextExtractor(HTMLParser):
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


def fetch_text(url: str, timeout: int = DEFAULT_TIMEOUT) -> str:
    headers = {"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8"}
    request = urllib.request.Request(url, headers=headers)
    context = ssl.create_default_context()
    with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
        body = response.read()
        content_type = response.headers.get("Content-Type", "")
    match = re.search(r"charset=([A-Za-z0-9_-]+)", content_type)
    encoding = match.group(1) if match else "utf-8"
    return body.decode(encoding, errors="ignore")


def normalize_url(base_url: str, href: str) -> str:
    return urllib.parse.urljoin(base_url, href)


def same_domain(url: str, expected_host: str) -> bool:
    return urllib.parse.urlparse(url).netloc.endswith(expected_host)


def extract_links(html_text: str, base_url: str) -> list[tuple[str, str]]:
    parser = AnchorExtractor()
    parser.feed(html_text)
    return [(normalize_url(base_url, href), text) for href, text in parser.links if href]


def extract_page_title(html_text: str, fallback_url: str) -> str:
    for pattern in (r"<h1[^>]*>(.*?)</h1>", r"<title[^>]*>(.*?)</title>"):
        match = re.search(pattern, html_text, flags=re.I | re.S)
        if match:
            text = clean_text(re.sub(r"<[^>]+>", " ", match.group(1)))
            if text:
                return text
    path = urllib.parse.urlparse(fallback_url).path.rsplit("/", 1)[-1]
    return clean_text(re.sub(r"\.php$", "", path).replace("-", " ").replace("_", " ")) or fallback_url


def extract_summary(html_text: str) -> str:
    match = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']', html_text, flags=re.I)
    if match:
        return clean_text(match.group(1))
    text = TextExtractor()
    text.feed(html_text)
    lines = [line.strip() for line in re.split(r"(?<=[.!?])\s+", text.text()) if line.strip()]
    return clean_text(" ".join(lines[:2]))


def parse_date_string(value: str) -> Optional[str]:
    candidate = clean_text(value)
    if not candidate:
        return None

    patterns = (
        (r"\b(20\d{2})-(\d{2})-(\d{2})\b", "%Y-%m-%d"),
        (r"\b(\d{1,2})/(\d{1,2})/(20\d{2})\b", "%d/%m/%Y"),
        (r"\b(\d{1,2}) ([A-Za-z]+) (20\d{2})\b", None),
    )
    for pattern, fmt in patterns:
        match = re.search(pattern, candidate, flags=re.I)
        if not match:
            continue
        if fmt:
            try:
                return dt.datetime.strptime(match.group(0), fmt).date().isoformat()
            except ValueError:
                continue
        day, month_name, year = match.groups()
        try:
            return dt.datetime.strptime(f"{day} {month_name} {year}", "%d %B %Y").date().isoformat()
        except ValueError:
            try:
                return dt.datetime.strptime(f"{day} {month_name} {year}", "%d %b %Y").date().isoformat()
            except ValueError:
                continue
    return None


def extract_published_date(html_text: str, page_text: str) -> Optional[str]:
    meta_patterns = (
        r'property=["\']article:published_time["\'][^>]+content=["\']([^"\']+)["\']',
        r'name=["\']publish_date["\'][^>]+content=["\']([^"\']+)["\']',
        r'name=["\']date["\'][^>]+content=["\']([^"\']+)["\']',
    )
    for pattern in meta_patterns:
        match = re.search(pattern, html_text, flags=re.I)
        if match:
            parsed = parse_date_string(match.group(1))
            if parsed:
                return parsed

    for line in re.split(r"[\r\n]+", page_text):
        parsed = parse_date_string(line)
        if parsed:
            return parsed
    return None


def normalize_keyword(keyword: str) -> str:
    return clean_text(keyword).lower()


def match_keywords(texts: Iterable[str], keywords: Sequence[str]) -> list[str]:
    haystack = " ".join(clean_text(text).lower() for text in texts if text)
    matches = []
    for keyword in keywords:
        normalized = normalize_keyword(keyword)
        if normalized and normalized in haystack:
            matches.append(keyword)
    return matches


def is_candidate_link(url: str, text: str, section: str) -> bool:
    lower_url = url.lower()
    lower_text = clean_text(text).lower()

    if not lower_url.startswith("http"):
        return False
    if any(snippet in lower_url or snippet in lower_text for snippet in SKIP_URL_SNIPPETS):
        return False
    if lower_url.endswith(".pdf"):
        return any(
            token in lower_text or token in lower_url
            for token in (
                "mfrs",
                "mpers",
                "pers",
                "technical pronouncement",
                "publication order",
                "exposure draft",
                "standard",
                "guidance",
            )
        )
    if section == "news":
        return "event" in lower_url or "news" in lower_url or "announcement" in lower_text
    if section == "exposure-drafts":
        return any(
            token in lower_text or token in lower_url
            for token in (
                "technical pronouncements",
                "technical pronouncement",
                "preface to technical pronouncements",
                "mfrs application and implementation guide",
                "implementation guide",
                "mfrs",
                "mpers",
                "pers",
            )
        )
    return False


def inspect_document(
    url: str,
    section: str,
    keywords: Sequence[str],
    *,
    fetch_pdf: bool,
) -> Optional[ProfessionalLibraryItem]:
    if url.lower().endswith(".pdf"):
        if not fetch_pdf:
            return None
        result = extract_pdf_text_from_url(url)
        title = result.title or url
        lines = [line.strip() for line in result.text.splitlines() if line.strip()]
        summary = clean_text(" ".join(lines[:2])) or title
        matched = match_keywords([title, summary, result.text, section], keywords)
        return ProfessionalLibraryItem(
            source_section=section,
            source_url=url,
            title=title,
            published_date=None,
            summary=summary,
            content_type="pdf",
            matched_keywords=matched,
            attachment_urls=[],
            body_text=result.text,
        )

    html_text = fetch_text(url)
    return inspect_html_document(url, section, keywords, html_text)


def inspect_html_document(
    url: str,
    section: str,
    keywords: Sequence[str],
    html_text: str,
) -> Optional[ProfessionalLibraryItem]:
    title = extract_page_title(html_text, url)
    text_extractor = TextExtractor()
    text_extractor.feed(html_text)
    body_text = text_extractor.text()
    summary = extract_summary(html_text)
    published_date = extract_published_date(html_text, body_text)
    attachment_urls = []
    for link_url, _text in extract_links(html_text, url):
        if link_url.lower().endswith(".pdf"):
            attachment_urls.append(link_url)
    matched = match_keywords([title, summary, body_text, section], keywords)
    return ProfessionalLibraryItem(
        source_section=section,
        source_url=url,
        title=title,
        published_date=published_date,
        summary=summary,
        content_type="html",
        matched_keywords=matched,
        attachment_urls=sorted(set(attachment_urls)),
        body_text=body_text,
    )


def crawl_masb(
    *,
    keywords: Sequence[str] = DEFAULT_KEYWORDS,
    fetch_pdf: bool = False,
    max_documents_per_section: int = 20,
) -> ProfessionalLibraryReport:
    host = "masb.org.my"
    seen_urls: set[str] = set()
    items: list[ProfessionalLibraryItem] = []
    seed_urls: list[str] = []

    for section, seed_url in MASB_SEED_PAGES:
        seed_urls.append(seed_url)
        try:
            html_text = fetch_text(seed_url, timeout=DEFAULT_TIMEOUT)
        except Exception:
            continue
        seed_item = inspect_html_document(seed_url, section, keywords, html_text)
        if seed_item and seed_item.source_url not in seen_urls:
            seen_urls.add(seed_item.source_url)
            items.append(seed_item)
            continue

        candidates = []
        for link_url, text in extract_links(html_text, seed_url):
            if not same_domain(link_url, host):
                continue
            if is_candidate_link(link_url, text, section):
                candidates.append((link_url, text))

        for link_url, _text in candidates[: min(max_documents_per_section, 1)]:
            canonical = link_url.split("#", 1)[0]
            if canonical in seen_urls:
                continue
            seen_urls.add(canonical)
            try:
                item = inspect_document(canonical, section, keywords, fetch_pdf=fetch_pdf)
            except Exception:
                continue
            if item is None:
                continue
            items.append(item)

    return ProfessionalLibraryReport(
        generated_at=dt.datetime.now(dt.timezone.utc).isoformat(),
        source_name="MASB",
        seed_urls=seed_urls,
        items=items,
    )


if __name__ == "__main__":
    report = crawl_masb()
    print(f"MASB seeds: {len(report.seed_urls)}")
    print(f"MASB items: {len(report.items)}")
    for item in report.items[:10]:
        print(f"- [{item.source_section}] {item.title} ({item.content_type}) -> {item.source_url}")
