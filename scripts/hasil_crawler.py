from __future__ import annotations

import dataclasses
import datetime as dt
import html
import http.client
import io
import json
import os
import re
import socket
import ssl
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

USER_AGENT = "Mozilla/5.0 (compatible; HasilCrawler/1.0)"
BASE_URL = "https://www.hasil.gov.my"
EN_ROOT = "https://www.hasil.gov.my/en/"
DEFAULT_FETCH_TIMEOUT = int(os.getenv("HASIL_FETCH_TIMEOUT", "10"))
DEFAULT_FETCH_RETRIES = int(os.getenv("HASIL_FETCH_RETRIES", "2"))

SEED_PAGES: Sequence[Tuple[str, str]] = (
    (f"{BASE_URL}/en/announcement/", "announcement"),
    (f"{BASE_URL}/en/e-invoice/communication-and-publicity/media-release/", "media-release"),
    (f"{BASE_URL}/en/e-invoice/e-invoice-events/", "e-invoice-event"),
    (f"{BASE_URL}/en/e-invoice/communication-and-publicity/", "e-invoice"),
    (f"{BASE_URL}/en/eduzone/interview-video/", "interview-video"),
    (f"{BASE_URL}/en/eduzone/tax-education-and-awareness-video/", "tax-education-video"),
    (f"{BASE_URL}/en/eduzone/tax-education-and-awareness-video", "tax-education-video"),
    (f"{BASE_URL}/en/eduzone/tax-slide-poster/", "tax-slide-poster"),
    (f"{BASE_URL}/en/eduzone/tax-publication/", "tax-publication"),
    (f"{BASE_URL}/en/eduzone/tax-brochure/", "tax-brochure"),
    (f"{BASE_URL}/en/eduzone/tax-benefits-video/", "tax-benefits-video"),
    (f"{BASE_URL}/en/eduzone/taxedu-podcast/", "tax-podcast"),
)

CATEGORY_HINTS: Sequence[Tuple[str, str]] = (
    ("announcement", "announcement"),
    ("media-release", "media-release"),
    ("media release", "media-release"),
    ("e-invoice-events", "e-invoice-event"),
    ("e-invoice", "e-invoice"),
    ("interview-video", "interview-video"),
    ("tax-education-and-awareness-video", "tax-education-video"),
    ("tax-education", "tax-education-video"),
    ("tax-slide-poster", "tax-slide-poster"),
    ("tax-publication", "tax-publication"),
    ("tax-brochure", "tax-brochure"),
    ("tax-benefits-video", "tax-benefits-video"),
    ("taxedu-podcast", "tax-podcast"),
    ("podcast", "tax-podcast"),
    ("video", "video"),
    ("brochure", "tax-brochure"),
    ("publication", "tax-publication"),
    ("poster", "tax-slide-poster"),
)

CATEGORY_PATH_PREFIXES: Dict[str, Tuple[str, ...]] = {
    "announcement": ("/en/announcement/",),
    "media-release": ("/en/e-invoice/communication-and-publicity/media-release/",),
    "e-invoice": ("/en/e-invoice/",),
    "e-invoice-event": ("/en/e-invoice/e-invoice-events/",),
    "interview-video": ("/en/eduzone/interview-video/",),
    "tax-education-video": (
        "/en/eduzone/tax-education-and-awareness-video/",
        "/en/eduzone/tax-education-and-awareness-video",
    ),
    "tax-slide-poster": ("/en/eduzone/tax-slide-poster/",),
    "tax-publication": ("/en/eduzone/tax-publication/",),
    "tax-brochure": ("/en/eduzone/tax-brochure/",),
    "tax-benefits-video": ("/en/eduzone/tax-benefits-video/",),
    "tax-podcast": ("/en/eduzone/taxedu-podcast/",),
}
PRIORITY_CATEGORY_ORDER: Dict[str, int] = {
    "e-invoice-event": 0,
    "announcement": 1,
    "media-release": 2,
}

SKIP_DETAIL_SNIPPETS = (
    "/en/contact-us/",
    "/en/form/",
    "/en/sitemap/",
    "/en/faqs/",
    "/en/about-hasil/",
)

IMAGE_SUFFIXES = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".bmp", ".tif", ".tiff")


@dataclasses.dataclass
class ReportItem:
    page_title: str
    source_url: str
    published_date: Optional[str]
    updated_date: Optional[str]
    content_snippet: Optional[str]
    category: str
    is_yesterday_item: bool

    def to_dict(self) -> Dict[str, Optional[str]]:
        return {
            "page_title": self.page_title,
            "source_url": self.source_url,
            "published_date": self.published_date,
            "updated_date": self.updated_date,
            "content_snippet": self.content_snippet,
            "category": self.category,
            "is_yesterday_item": self.is_yesterday_item,
        }


@dataclasses.dataclass
class CrawlReport:
    generated_at: str
    yesterday: str
    list_pages: List[str]
    items: List[ReportItem]

    def to_dict(self) -> Dict[str, object]:
        return {
            "generated_at": self.generated_at,
            "yesterday": self.yesterday,
            "list_pages": list(self.list_pages),
            "items": [item.to_dict() for item in self.items],
        }


class LinkExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: List[Tuple[str, str]] = []
        self._capture = False
        self._href: Optional[str] = None
        self._text_parts: List[str] = []

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        if tag.lower() != "a":
            return
        href = None
        for key, value in attrs:
            if key.lower() == "href" and value:
                href = value.strip()
                break
        if href:
            self._capture = True
            self._href = href
            self._text_parts = []

    def handle_data(self, data: str) -> None:
        if self._capture and data:
            self._text_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() != "a" or not self._capture:
            return
        text = " ".join(part.strip() for part in self._text_parts if part.strip())
        self.links.append((self._href or "", text))
        self._capture = False
        self._href = None
        self._text_parts = []


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._texts: List[str] = []
        self._skip = False

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        if tag.lower() in ("script", "style"):
            self._skip = True

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in ("script", "style"):
            self._skip = False

    def handle_data(self, data: str) -> None:
        if not self._skip and data:
            self._texts.append(data)

    def text(self) -> str:
        return " ".join(self._texts)


def _request(url: str, timeout: int = DEFAULT_FETCH_TIMEOUT) -> Tuple[bytes, str]:
    headers = {"User-Agent": USER_AGENT, "Accept": "*/*"}
    req = urllib.request.Request(url, headers=headers)
    context = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=timeout, context=context) as resp:
        data = resp.read()
        content_type = resp.headers.get("Content-Type", "")
    return data, content_type


def fetch_text(url: str, timeout: int = DEFAULT_FETCH_TIMEOUT) -> Optional[str]:
    for attempt in range(DEFAULT_FETCH_RETRIES + 1):
        try:
            data, content_type = _request(url, timeout=timeout)
            encoding = "utf-8"
            match = re.search(r"charset=([A-Za-z0-9_-]+)", content_type)
            if match:
                encoding = match.group(1)
            try:
                return data.decode(encoding, errors="ignore")
            except LookupError:
                return data.decode("utf-8", errors="ignore")
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, socket.timeout, http.client.IncompleteRead):
            if attempt >= DEFAULT_FETCH_RETRIES:
                return None
            time.sleep(0.5 * (attempt + 1))
    return None


def fetch_bytes(url: str, timeout: int = DEFAULT_FETCH_TIMEOUT) -> Optional[bytes]:
    for attempt in range(DEFAULT_FETCH_RETRIES + 1):
        try:
            data, _ = _request(url, timeout=timeout)
            return data
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, socket.timeout, http.client.IncompleteRead):
            if attempt >= DEFAULT_FETCH_RETRIES:
                return None
            time.sleep(0.5 * (attempt + 1))
    return None


def normalize_url(base_url: str, href: str) -> str:
    return urllib.parse.urljoin(base_url, href)


def is_allowed_url(url: str) -> bool:
    try:
        parsed = urllib.parse.urlparse(url)
    except ValueError:
        return False
    if parsed.scheme not in ("http", "https"):
        return False
    if parsed.netloc and "hasil.gov.my" not in parsed.netloc:
        return False
    return True


def extract_links(html_text: str, base_url: str) -> List[Tuple[str, str]]:
    parser = LinkExtractor()
    parser.feed(html_text)
    links: List[Tuple[str, str]] = []
    for href, text in parser.links:
        if not href:
            continue
        full = normalize_url(base_url, href)
        if is_allowed_url(full):
            links.append((full, text))
    return links


def clean_text(text: str) -> str:
    text = html.unescape(text or "")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_visible_text(html_text: str) -> str:
    parser = TextExtractor()
    parser.feed(html_text)
    return clean_text(parser.text())


def extract_title(html_text: str) -> Optional[str]:
    match = re.search(r"<title[^>]*>(.*?)</title>", html_text, flags=re.I | re.S)
    if match:
        title = clean_text(match.group(1))
        if title:
            return title
    match = re.search(r"<h1[^>]*>(.*?)</h1>", html_text, flags=re.I | re.S)
    if match:
        title = clean_text(re.sub(r"<[^>]+>", " ", match.group(1)))
        if title:
            return title
    return None


def extract_date_from_filename(url: str) -> Optional[str]:
    filename = urllib.parse.urlparse(url).path.split("/")[-1]
    match = re.search(r"(20\d{2})(\d{2})(\d{2})", filename)
    if not match:
        return None
    year, month, day = match.groups()
    try:
        date_val = dt.date(int(year), int(month), int(day))
    except ValueError:
        return None
    return date_val.isoformat()


def extract_pdf_text(url: str) -> Tuple[str, Optional[str]]:
    data = fetch_bytes(url)
    if not data:
        return "", None
    title = extract_title_from_filename(url)
    text = ""
    try:
        import pypdf  # type: ignore

        reader = pypdf.PdfReader(io.BytesIO(data))
        parts = []
        for page in reader.pages:
            try:
                parts.append(page.extract_text() or "")
            except Exception:
                continue
        text = "\n".join(parts)
        if reader.metadata and not title:
            meta_title = getattr(reader.metadata, "title", None)
            if meta_title:
                title = clean_text(str(meta_title))
    except Exception:
        text = ""
    if not text and shutil_which("strings"):
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(data)
            tmp_path = tmp.name
        try:
            proc = subprocess.run(
                ["strings", "-n", "4", tmp_path],
                capture_output=True,
                text=True,
                check=False,
            )
            text = proc.stdout or ""
        finally:
            try:
                os.remove(tmp_path)
            except OSError:
                pass
    return clean_text(text), title


def extract_title_from_filename(url: str) -> Optional[str]:
    path = urllib.parse.urlparse(url).path
    if not path:
        return None
    filename = path.split("/")[-1]
    if not filename:
        return None
    name = re.sub(r"\.pdf$", "", filename, flags=re.I)
    name = name.replace("-", " ").replace("_", " ")
    return clean_text(name) or None


def shutil_which(cmd: str) -> Optional[str]:
    for path in os.environ.get("PATH", "").split(os.pathsep):
        candidate = os.path.join(path, cmd)
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate
    return None


MONTHS = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mac": 3,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "mei": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "ogos": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "okt": 10,
    "oktober": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
    "dis": 12,
    "disember": 12,
}

MONTH_SLUGS = {
    1: "jan",
    2: "feb",
    3: "mar",
    4: "apr",
    5: "may",
    6: "jun",
    7: "jul",
    8: "aug",
    9: "sep",
    10: "oct",
    11: "nov",
    12: "dec",
}


def parse_date_string(value: str) -> Optional[dt.date]:
    value = clean_text(value)
    if not value:
        return None
    match = re.search(r"(\d{4})-(\d{2})-(\d{2})", value)
    if match:
        year, month, day = match.groups()
        try:
            return dt.date(int(year), int(month), int(day))
        except ValueError:
            return None
    match = re.search(r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})", value)
    if match:
        day, month, year = match.groups()
        try:
            return dt.date(int(year), int(month), int(day))
        except ValueError:
            return None
    match = re.search(r"(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})", value)
    if match:
        day, month_name, year = match.groups()
        month = MONTHS.get(month_name.lower())
        if not month:
            return None
        try:
            return dt.date(int(year), int(month), int(day))
        except ValueError:
            return None
    return None


def extract_dates_with_context(text: str) -> List[Tuple[dt.date, str]]:
    results: List[Tuple[dt.date, str]] = []
    if not text:
        return results
    patterns = [
        r"\d{4}-\d{2}-\d{2}",
        r"\d{1,2}[/-]\d{1,2}[/-]\d{4}",
        r"\d{1,2}\s+[A-Za-z]+\s+\d{4}",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, text):
            date_val = parse_date_string(match.group(0))
            if not date_val:
                continue
            start = max(0, match.start() - 30)
            context = text[start : match.end() + 30].lower()
            results.append((date_val, context))
    return results


def detect_dates(html_text: str) -> Tuple[Optional[str], Optional[str]]:
    text = extract_visible_text(html_text)
    dates = extract_dates_with_context(text)
    published: Optional[str] = None
    updated: Optional[str] = None
    for date_val, context in dates:
        date_str = date_val.isoformat()
        if "update" in context or "kemaskini" in context or "last updated" in context:
            if not updated:
                updated = date_str
        elif not published:
            published = date_str
    return published, updated


def guess_category(url: str, fallback: str = "general") -> str:
    url_lower = url.lower()
    for needle, category in CATEGORY_HINTS:
        if needle in url_lower:
            return category
    return fallback


def find_date_near_link(html_text: str, url: str) -> Optional[str]:
    if not html_text or not url:
        return None
    matches = list(re.finditer(re.escape(url), html_text))
    for match in matches:
        start = max(0, match.start() - 200)
        end = min(len(html_text), match.end() + 200)
        snippet = clean_text(re.sub(r"<[^>]+>", " ", html_text[start:end]))
        for date_val, _context in extract_dates_with_context(snippet):
            return date_val.isoformat()
    return None


def is_list_page(url: str) -> bool:
    if url.endswith("/"):
        return True
    lower = url.lower()
    if "announcement" in lower or "media-release" in lower:
        return True
    if "events" in lower or "video" in lower or "publication" in lower:
        return True
    return False


def count_path_segments(url: str) -> int:
    path = urllib.parse.urlparse(url).path.strip("/")
    if not path:
        return 0
    return len([part for part in path.split("/") if part])


def is_detail_candidate(link: str, list_url: str, category: str) -> bool:
    parsed = urllib.parse.urlparse(link)
    path = parsed.path.lower()
    if not path:
        return False
    if path.endswith(IMAGE_SUFFIXES):
        return False
    if any(snippet in path for snippet in SKIP_DETAIL_SNIPPETS):
        return False
    if link.rstrip("/") == list_url.rstrip("/"):
        return False
    if "/media/" in path:
        return False
    prefixes = CATEGORY_PATH_PREFIXES.get(category)
    if prefixes and not any(path.startswith(prefix) for prefix in prefixes):
        return False
    return count_path_segments(link) > count_path_segments(list_url)


def discover_list_pages(seed_urls: Sequence[str]) -> List[str]:
    discovered: List[str] = []
    for url in seed_urls:
        html_text = fetch_text(url)
        if not html_text:
            continue
        for link, _text in extract_links(html_text, url):
            if EN_ROOT not in link:
                continue
            if is_list_page(link):
                discovered.append(link)
    return list(dict.fromkeys(discovered))


def build_month_archive_token(target_date: dt.date) -> str:
    month_slug = MONTH_SLUGS[target_date.month]
    return f"{month_slug}{target_date.year}"


def detail_priority(link: str, target_date: dt.date) -> Tuple[int, int]:
    lower = link.lower()
    month_token = build_month_archive_token(target_date)
    target_year = f"/{target_date.year}/"
    current_month = 0 if f"/{month_token}/" in lower else 1
    current_year = 0 if target_year in lower else 1
    return (current_month, current_year)


def category_priority(category: str) -> int:
    return PRIORITY_CATEGORY_ORDER.get(category, len(PRIORITY_CATEGORY_ORDER))


def is_root_event_page(list_url: str, category: str) -> bool:
    path = urllib.parse.urlparse(list_url).path.rstrip("/").lower()
    return category == "e-invoice-event" and path == "/en/e-invoice/e-invoice-events"


def build_seed_urls(target_date: dt.date) -> List[Tuple[str, str]]:
    seen = {}
    for url, category in SEED_PAGES:
        if url not in seen:
            seen[url] = category
    year = target_date.year
    month_token = build_month_archive_token(target_date)
    ordered: Dict[str, str] = {}
    insertion_order: List[Tuple[str, str]] = [
        (f"{BASE_URL}/en/announcement/", "announcement"),
        (f"{BASE_URL}/en/e-invoice/communication-and-publicity/media-release/", "media-release"),
        (f"{BASE_URL}/en/e-invoice/e-invoice-events/", "e-invoice-event"),
        (f"{BASE_URL}/en/e-invoice/e-invoice-events/{year}/{month_token}/", "e-invoice-event"),
        (f"{BASE_URL}/en/e-invoice/communication-and-publicity/media-release/{year}/{month_token}/", "media-release"),
        (f"{BASE_URL}/en/announcement/{year}/{month_token}/", "announcement"),
    ]
    insertion_order.extend(seed_pages_for_priority(seen))
    for url, category in insertion_order:
        if url not in ordered:
            ordered[url] = category
    return list(ordered.items())


def seed_pages_for_priority(existing: Dict[str, str]) -> List[Tuple[str, str]]:
    priority_urls = [
        f"{BASE_URL}/en/announcement/",
        f"{BASE_URL}/en/e-invoice/communication-and-publicity/media-release/",
        f"{BASE_URL}/en/e-invoice/e-invoice-events/",
        f"{BASE_URL}/en/e-invoice/communication-and-publicity/",
    ]
    ordered: List[Tuple[str, str]] = []
    for url in priority_urls:
        if url in existing:
            ordered.append((url, existing[url]))
    for url, category in existing.items():
        if url not in priority_urls:
            ordered.append((url, category))
    return ordered


def crawl_hasil(
    *,
    yesterday: Optional[dt.date] = None,
    max_list_pages: int = 60,
    max_detail_pages: int = 250,
) -> CrawlReport:
    tz = dt.timezone(dt.timedelta(hours=8))
    now = dt.datetime.now(tz=tz)
    yesterday = yesterday or (now.date() - dt.timedelta(days=1))
    seed_pages = build_seed_urls(yesterday)
    seed_urls = [url for url, _category in seed_pages]

    list_pages = seed_urls[:max_list_pages]
    list_pages.sort(key=lambda url: (category_priority(guess_category(url, fallback="general")), url))

    list_link_dates: Dict[str, str] = {}
    list_link_category: Dict[str, str] = {}
    detail_links: List[str] = []

    for list_url in list_pages:
        html_text = fetch_text(list_url)
        if not html_text:
            continue
        category = guess_category(list_url, fallback="general")
        candidate_links: List[Tuple[str, str]] = []
        target_month_token = build_month_archive_token(yesterday)
        for link, _text in extract_links(html_text, list_url):
            if not is_allowed_url(link):
                continue
            if "/en/" not in link and "/media/" not in link:
                continue
            if not is_detail_candidate(link, list_url, category):
                continue
            if is_root_event_page(list_url, category):
                if f"/{target_month_token}/" not in link.lower():
                    continue
            candidate_links.append((link, _text))
        candidate_links.sort(key=lambda pair: detail_priority(pair[0], yesterday))
        for link, _text in candidate_links:
            if link in detail_links:
                continue
            date_hint = find_date_near_link(html_text, link)
            if date_hint:
                list_link_dates[link] = date_hint
            list_link_category[link] = category
            detail_links.append(link)

    detail_links = detail_links[:max_detail_pages]
    items: List[ReportItem] = []
    for link in detail_links:
        if link.lower().endswith(".pdf"):
            text, title = extract_pdf_text(link)
            title = title or "PDF document"
            published = extract_date_from_filename(link)
            updated = None
            if not published:
                published = list_link_dates.get(link)
            snippet = text[:400] if text else None
        else:
            html_text = fetch_text(link)
            if not html_text:
                continue
            title = extract_title(html_text) or "Untitled page"
            published, updated = detect_dates(html_text)
            if not published:
                published = list_link_dates.get(link)
            snippet = extract_visible_text(html_text)[:400] or None

        category = list_link_category.get(link) or guess_category(link)
        is_yesterday_item = (published == yesterday.isoformat()) or (updated == yesterday.isoformat())
        items.append(
            ReportItem(
                page_title=title,
                source_url=link,
                published_date=published,
                updated_date=updated,
                content_snippet=snippet,
                category=category,
                is_yesterday_item=is_yesterday_item,
            )
        )

    report = CrawlReport(
        generated_at=now.isoformat(),
        yesterday=yesterday.isoformat(),
        list_pages=list_pages,
        items=items,
    )
    return report


def save_report(report: CrawlReport, output_path: str) -> None:
    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(report.to_dict(), handle, ensure_ascii=True, indent=2)


def _print_summary(report: CrawlReport, limit: int = 10) -> None:
    total = len(report.items)
    yesterday_items = [item for item in report.items if item.is_yesterday_item]
    print(f"Generated at: {report.generated_at}")
    print(f"Yesterday: {report.yesterday}")
    print(f"List pages: {len(report.list_pages)}")
    print(f"Total items: {total}")
    print(f"Yesterday items: {len(yesterday_items)}")
    for item in yesterday_items[:limit]:
        print(f"- {item.page_title} ({item.published_date or item.updated_date})")
        print(f"  {item.source_url}")


if __name__ == "__main__":
    started = time.time()
    report = crawl_hasil()
    _print_summary(report)
    elapsed = time.time() - started
    print(f"Done in {elapsed:.1f}s")
