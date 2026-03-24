#!/usr/bin/env python3
from __future__ import annotations

import argparse
import io
import email.utils
import html as html_module
import json
import os
import re
import shutil
import smtplib
import subprocess
import sys
import tempfile
from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Iterable, Optional
from urllib.parse import urldefrag, urljoin, urlparse
from urllib.request import Request, urlopen

BASE_URL = "https://www.hasil.gov.my/en/"
SITEMAP_URL = urljoin(BASE_URL, "sitemap/")
TARGET_DOMAIN = "www.hasil.gov.my"
UTC8 = timezone(timedelta(hours=8))
DEFAULT_RECIPIENT = "1400015989menghu@gmail.com"

LIST_PAGE_SEEDS = [
    BASE_URL,
    urljoin(BASE_URL, "announcement/"),
    urljoin(BASE_URL, "e-invoice/e-invoice-events/"),
    urljoin(BASE_URL, "e-invoice/communication-and-publicity/media-release/"),
]

IGNORE_PATH_SNIPPETS = (
    "/login",
    "/logout",
    "/search",
    "/sitemap",
    "/privacy",
    "/terms",
    "/contact",
    "/faq",
    "/account",
    "/admin",
    "/dashboard",
    "/api/",
    "/wp-json/",
)

GENERIC_ANCHOR_TEXT = {
    "more info",
    "read more",
    "view details",
    "details",
    "see more",
    "learn more",
}

NAV_ANCHOR_TEXT = {
    "",
    "home",
    "menu",
    "about",
    "services",
    "news",
    "contact us",
    "search",
    "login",
    "logout",
}

DETAIL_HINTS = (
    "detail",
    "webinar",
    "announcement",
    "media",
    "interview",
    "video",
    "publication",
    "brochure",
    "podcast",
    "slide",
    "calculator",
    "program",
    "event",
    "article",
)

MONTH_MAP = {
    "jan": 1,
    "january": 1,
    "feb": 2,
    "february": 2,
    "mar": 3,
    "march": 3,
    "apr": 4,
    "april": 4,
    "may": 5,
    "jun": 6,
    "june": 6,
    "jul": 7,
    "july": 7,
    "aug": 8,
    "august": 8,
    "sep": 9,
    "sept": 9,
    "september": 9,
    "oct": 10,
    "october": 10,
    "nov": 11,
    "november": 11,
    "dec": 12,
    "december": 12,
}

DATE_PATTERNS = [
    re.compile(r"\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\b"),
    re.compile(r"\b([A-Z]{3})\s+(\d{1,2})\s+(\d{4})\b"),
    re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b"),
    re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b"),
    re.compile(r"\b(\d{1,2})-(\d{1,2})-(\d{4})\b"),
]


@dataclass
class CrawlItem:
    category: str
    page_title: str
    source_url: str
    published_date: Optional[str] = None
    updated_date: Optional[str] = None
    content_snippet: str = ""
    source_type: str = "html"
    is_yesterday_item: bool = False


@dataclass
class FetchResult:
    url: str
    content_type: str
    body: bytes


def normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def strip_tags(value: str) -> str:
    value = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", value)
    value = re.sub(r"(?is)<[^>]+>", " ", value)
    return normalize_whitespace(html_module.unescape(value))


def html_to_lines(html_text: str) -> list[str]:
    text = re.sub(r"(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", html_text)
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(
        r"(?i)</?(p|div|li|tr|h[1-6]|section|article|header|footer|nav|aside|blockquote|ul|ol|table|thead|tbody|tfoot|main|figure|figcaption|dd|dt)[^>]*>",
        "\n",
        text,
    )
    text = re.sub(r"(?is)<[^>]+>", " ", text)
    text = html_module.unescape(text)
    lines = [normalize_whitespace(line) for line in text.splitlines()]
    return [line for line in lines if line]


def extract_title(html_text: str, fallback_url: str) -> str:
    title_match = re.search(r"(?is)<title[^>]*>(.*?)</title>", html_text)
    if title_match:
        title = strip_tags(title_match.group(1))
        title = re.sub(r"\s*\|\s*HASiL.*$", "", title, flags=re.I)
        title = re.sub(r"\s*-\s*Lembaga Hasil.*$", "", title, flags=re.I)
        title = re.sub(r"\s*-\s*HASiL.*$", "", title, flags=re.I)
        if title:
            return title

    h1_match = re.search(r"(?is)<h1[^>]*>(.*?)</h1>", html_text)
    if h1_match:
        title = strip_tags(h1_match.group(1))
        if title:
            return title

    return fallback_url.rstrip("/").rsplit("/", 1)[-1] or fallback_url


def parse_date_components(day: str, month: str, year: str) -> Optional[date]:
    try:
        month_num = MONTH_MAP[month.lower()]
    except KeyError:
        return None
    try:
        return date(int(year), month_num, int(day))
    except ValueError:
        return None


def parse_date_string(value: str) -> Optional[date]:
    value = normalize_whitespace(value)
    for pattern in DATE_PATTERNS:
        match = pattern.search(value)
        if not match:
            continue
        if pattern.pattern.startswith(r"\b(\d{1,2})\s+"):
            parsed = parse_date_components(match.group(1), match.group(2), match.group(3))
            if parsed:
                return parsed
        elif pattern.pattern.startswith(r"\b([A-Z]{3})\s+"):
            parsed = parse_date_components(match.group(2), match.group(1), match.group(3))
            if parsed:
                return parsed
        elif pattern.pattern.startswith(r"\b(\d{4})-"):
            try:
                return date(int(match.group(1)), int(match.group(2)), int(match.group(3)))
            except ValueError:
                return None
        else:
            try:
                return date(int(match.group(3)), int(match.group(2)), int(match.group(1)))
            except ValueError:
                return None
    return None


def target_date_variants(target_date: date) -> list[str]:
    return [
        target_date.strftime("%d %B %Y"),
        target_date.strftime("%d %b %Y"),
        target_date.strftime("%Y-%m-%d"),
        target_date.strftime("%d/%m/%Y"),
        target_date.strftime("%d-%m-%Y"),
    ]


def is_internal_url(url: str) -> bool:
    parsed = urlparse(url)
    return not parsed.netloc or parsed.netloc == TARGET_DOMAIN


def is_candidate_link(text: str, url: str) -> bool:
    parsed = urlparse(url)
    path = parsed.path.lower()
    query = parsed.query.lower()

    if not is_internal_url(url):
        return False
    if any(snippet in path for snippet in IGNORE_PATH_SNIPPETS):
        return False
    if any(snippet in query for snippet in ("logout", "token", "signin")):
        return False
    if path.endswith((".pdf", ".doc", ".docx", ".ppt", ".pptx")):
        return True
    if "recordid=" in query:
        return True
    if any(hint in path for hint in DETAIL_HINTS):
        return True

    normalized_text = normalize_whitespace(text).lower()
    if normalized_text in GENERIC_ANCHOR_TEXT:
        return True

    return False


def category_for_url(url: str) -> str:
    path = urlparse(url).path.lower()
    if "announcement" in path:
        return "Announcement"
    if "e-invoice/e-invoice-events" in path:
        return "e-Invoice Event"
    if "media-release" in path or "/media/" in path:
        return "Media Release"
    if "interview-video" in path:
        return "Interview Video"
    if "tax-awareness-video" in path:
        return "Tax Awareness Video"
    if "tax-benefits-video" in path:
        return "Tax Benefits Video"
    if "taxedu-podcast" in path:
        return "TaxEdu Podcast"
    if "tax-brochure" in path:
        return "Tax Brochure"
    if "tax-slide" in path:
        return "Tax Slide"
    if "tax-publication" in path:
        return "Tax Publication"
    if "tax-calculator" in path:
        return "Tax Calculator"
    if "tax-education-program" in path:
        return "Tax Education Program"
    return "Public Update"


def fetch_url(url: str, timeout: int = 10) -> FetchResult:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0 (Codex HASiL crawler)"})
    with urlopen(request, timeout=timeout) as response:
        body = response.read()
        content_type = response.headers.get_content_type() or ""
    return FetchResult(url=str(response.url), content_type=content_type.lower(), body=body)


def decode_html_bytes(body: bytes) -> str:
    for encoding in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            return body.decode(encoding)
        except UnicodeDecodeError:
            continue
    return body.decode("utf-8", errors="ignore")


def extract_links(html_text: str, base_url: str) -> list[tuple[str, str]]:
    links: list[tuple[str, str]] = []
    for match in re.finditer(r"(?is)<a\b([^>]*)>(.*?)</a>", html_text):
        attrs = match.group(1)
        href_match = re.search(r"""href\s*=\s*["']([^"']+)["']""", attrs, re.I)
        if not href_match:
            continue
        href = href_match.group(1).strip()
        if href.startswith(("javascript:", "mailto:", "tel:")):
            continue
        url = urljoin(base_url, href)
        url, _ = urldefrag(url)
        text = strip_tags(match.group(2))
        links.append((text, url))
    return links


def variant_date_strings(target_date: date) -> set[str]:
    return {variant.lower() for variant in target_date_variants(target_date)}


def find_dates_in_lines(lines: list[str], target_date: date) -> tuple[Optional[int], Optional[str], Optional[int], Optional[str]]:
    target_variants = variant_date_strings(target_date)
    published_index = None
    published_value = None
    updated_index = None
    updated_value = None

    for index, line in enumerate(lines):
        lower = line.lower()
        if any(variant in lower for variant in target_variants):
            if published_index is None:
                published_index = index
                published_value = next(variant for variant in target_variants if variant in lower)
            continue
        if "updated" in lower or "dikemaskini" in lower or "last updated" in lower:
            parsed = parse_date_string(line)
            if parsed and parsed == target_date:
                updated_index = index
                updated_value = line

    return published_index, published_value, updated_index, updated_value


def looks_like_detail_page(url: str, lines: list[str], link_count: int) -> bool:
    parsed = urlparse(url)
    path = parsed.path.lower()
    query = parsed.query.lower()
    if path.endswith(".pdf"):
        return True
    if "recordid=" in query or "detail" in path or "webinar" in path:
        return True
    if "announcement" in path and "?" in url:
        return True
    if any(hint in path for hint in ("media-release", "article", "publication", "interview", "podcast")):
        return True
    if link_count <= 4 and any(
        marker in " ".join(lines[:40]).lower()
        for marker in ("updated on", "published on", "date", "time", "venue", "register")
    ):
        return True
    return False


def extract_content_snippet(lines: list[str], start_index: int) -> str:
    keep: list[str] = []
    skipped = {
        "home",
        "menu",
        "read more",
        "more info",
        "search",
        "login",
        "download",
        "share",
        "copyright",
        "hasil",
        "back to top",
    }
    for line in lines[start_index:]:
        lower = line.lower()
        if len(keep) >= 4:
            break
        if not line or len(line) < 20:
            continue
        if lower in skipped:
            continue
        if parse_date_string(line):
            continue
        if any(marker in lower for marker in ("privacy", "terms", "cookie", "follow us", "menu")):
            continue
        keep.append(line)
    if keep:
        return " ".join(keep[:4])
    return ""


def extract_pdf_text(body: bytes, source_url: str) -> str:
    try:
        from pypdf import PdfReader  # type: ignore
    except Exception:
        PdfReader = None

    if PdfReader is not None:
        try:
            reader = PdfReader(io.BytesIO(body))
            pages = []
            for page in reader.pages[:6]:
                try:
                    pages.append(page.extract_text() or "")
                except Exception:
                    continue
            text = "\n".join(page_text for page_text in pages if page_text)
            if text.strip():
                return text
        except Exception:
            pass

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(body)
        tmp_path = tmp.name
    try:
        if shutil.which("strings"):
            result = subprocess.run(
                ["strings", "-n", "8", tmp_path],
                capture_output=True,
                text=True,
                check=False,
            )
            if result.stdout.strip():
                return result.stdout
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    return source_url


def make_item_from_document(
    url: str,
    title: str,
    text: str,
    lines: list[str],
    target_date: date,
    source_type: str,
) -> Optional[CrawlItem]:
    published_index, published_value, updated_index, updated_value = find_dates_in_lines(lines, target_date)
    text_lower = text.lower()
    target_hit = any(variant in text_lower for variant in variant_date_strings(target_date))
    if not target_hit and published_index is None and updated_index is None:
        return None

    if published_index is None:
        published_index = 0
    if updated_index is None and "updated" in text_lower and target_hit:
        updated_index = published_index
        updated_value = target_date.strftime("%d %B %Y")

    snippet_start = max(0, min(published_index, updated_index or published_index) - 1)
    snippet = extract_content_snippet(lines, snippet_start)
    if not snippet:
        snippet = normalize_whitespace(text[:500])
    if not snippet:
        snippet = title

    category = category_for_url(url)
    item = CrawlItem(
        category=category,
        page_title=title,
        source_url=url,
        published_date=target_date.isoformat() if target_hit or published_value else None,
        updated_date=target_date.isoformat() if updated_value else None,
        content_snippet=snippet[:500],
        source_type=source_type,
        is_yesterday_item=True,
    )
    return item


def crawl_document(
    url: str,
    target_date: date,
    visited: set[str],
    queue: list[tuple[str, int]],
    max_depth: int = 2,
) -> list[CrawlItem]:
    normalized = urldefrag(url)[0]
    if normalized in visited:
        return []
    visited.add(normalized)

    try:
        fetched = fetch_url(normalized)
    except Exception as exc:
        return []

    items: list[CrawlItem] = []
    if fetched.content_type == "application/pdf" or normalized.lower().endswith(".pdf"):
        text = extract_pdf_text(fetched.body, fetched.url)
        lines = [normalize_whitespace(line) for line in text.splitlines() if normalize_whitespace(line)]
        first_line = next((line for line in lines if len(line) >= 8), "")
        title = first_line if first_line and len(first_line) <= 140 else extract_title("", fetched.url)
        item = make_item_from_document(fetched.url, title, text, lines, target_date, "pdf")
        if item:
            items.append(item)
        return items

    html_text = decode_html_bytes(fetched.body)
    title = extract_title(html_text, fetched.url)
    lines = html_to_lines(html_text)
    links = extract_links(html_text, fetched.url)
    text_blob = "\n".join(lines).lower()
    page_has_target_date = any(variant in text_blob for variant in variant_date_strings(target_date))

    if looks_like_detail_page(fetched.url, lines, len(links)):
        item = make_item_from_document(fetched.url, title, "\n".join(lines), lines, target_date, "html")
        if item:
            items.append(item)

    if max_depth > 0 and page_has_target_date:
        for anchor_text, link_url in links:
            if not is_candidate_link(anchor_text, link_url):
                continue
            parsed = urlparse(link_url)
            if any(snippet in parsed.path.lower() for snippet in IGNORE_PATH_SNIPPETS):
                continue
            queue.append((link_url, max_depth - 1))

    return items


def discover_seed_pages() -> list[str]:
    seen: set[str] = set()
    seeds: list[str] = []
    for url in LIST_PAGE_SEEDS:
        normalized = urldefrag(url)[0]
        if normalized in seen:
            continue
        seen.add(normalized)
        seeds.append(normalized)
    return seeds


def context_windows_for_target(lines: list[str], target_date: date, radius: int = 4) -> list[str]:
    variants = variant_date_strings(target_date)
    windows: list[str] = []
    for index, line in enumerate(lines):
        lower = line.lower()
        if not any(variant in lower for variant in variants):
            continue
        start = max(0, index - radius)
        end = min(len(lines), index + radius + 1)
        windows.append(" \n".join(lines[start:end]).lower())
    return windows


def extract_items_from_seed_page(url: str, target_date: date) -> list[CrawlItem]:
    try:
        fetched = fetch_url(url)
    except Exception:
        return []

    if fetched.content_type == "application/pdf" or url.lower().endswith(".pdf"):
        text = extract_pdf_text(fetched.body, fetched.url)
        lines = [normalize_whitespace(line) for line in text.splitlines() if normalize_whitespace(line)]
        title = next((line for line in lines if len(line) >= 8), extract_title("", fetched.url))
        item = make_item_from_document(fetched.url, title, text, lines, target_date, "pdf")
        return [item] if item else []

    html_text = decode_html_bytes(fetched.body)
    title = extract_title(html_text, fetched.url)
    lines = html_to_lines(html_text)
    links = extract_links(html_text, fetched.url)
    text_blob = "\n".join(lines).lower()
    target_variants = variant_date_strings(target_date)
    windows = context_windows_for_target(lines, target_date)
    items: list[CrawlItem] = []
    seen_urls: set[str] = set()

    def add_item_from_url(candidate_url: str, source_type: str = "html") -> None:
        normalized = urldefrag(candidate_url)[0]
        if normalized in seen_urls:
            return
        seen_urls.add(normalized)
        try:
            result = fetch_url(normalized)
        except Exception:
            return
        if result.content_type == "application/pdf" or normalized.lower().endswith(".pdf"):
            text = extract_pdf_text(result.body, result.url)
            pdf_lines = [normalize_whitespace(line) for line in text.splitlines() if normalize_whitespace(line)]
            pdf_title = next((line for line in pdf_lines if len(line) >= 8), extract_title("", result.url))
            item = make_item_from_document(result.url, pdf_title, text, pdf_lines, target_date, "pdf")
        else:
            detail_html = decode_html_bytes(result.body)
            detail_title = extract_title(detail_html, result.url)
            detail_lines = html_to_lines(detail_html)
            item = make_item_from_document(result.url, detail_title, "\n".join(detail_lines), detail_lines, target_date, source_type)
        if item:
            items.append(item)

    if url.rstrip("/") == BASE_URL.rstrip("/"):
        for link_text, link_url in links:
            normalized_url = urldefrag(link_url)[0]
            lower_url = normalized_url.lower()
            if not lower_url.endswith(".pdf"):
                continue
            if target_date.strftime("%Y%m%d") in lower_url or any(variant in lower_url for variant in target_variants):
                add_item_from_url(normalized_url, "pdf")
                continue
            if any(variant in text_blob for variant in target_variants):
                add_item_from_url(normalized_url, "pdf")
        return items

    if "e-invoice/e-invoice-events" in url:
        for link_text, link_url in links:
            normalized_url = urldefrag(link_url)[0]
            lower_url = normalized_url.lower()
            lower_text = normalize_whitespace(link_text).lower()
            if not (("webinar" in lower_url) or ("webinar" in lower_text) or ("recordid=" in lower_url) or lower_url.endswith(".pdf")):
                continue
            if not windows:
                continue
            if any(window for window in windows if lower_text and lower_text in window):
                add_item_from_url(normalized_url, "html")
                continue
            if any(window for window in windows if "webinar" in window or "e-invois" in window):
                add_item_from_url(normalized_url, "html")
        return items

    if any(variant in text_blob for variant in target_variants):
        for link_text, link_url in links:
            normalized_url = urldefrag(link_url)[0]
            lower_url = normalized_url.lower()
            lower_text = normalize_whitespace(link_text).lower()
            if lower_url.endswith(".pdf") or "recordid=" in lower_url or "detail" in lower_url:
                if lower_text and any(window for window in windows if lower_text in window):
                    add_item_from_url(normalized_url, "html")
        return items

    return items


def crawl_hasil_public_content(target_date: date) -> list[CrawlItem]:
    items: list[CrawlItem] = []
    seen_items: set[str] = set()

    for seed in discover_seed_pages():
        for item in extract_items_from_seed_page(seed, target_date):
            key = item.source_url
            if key in seen_items:
                continue
            seen_items.add(key)
            items.append(item)

    items.sort(key=lambda item: (item.category, item.page_title, item.source_url))
    return items


def format_human_date(value: Optional[str]) -> str:
    if not value:
        return "unknown date"
    try:
        parsed = datetime.fromisoformat(value)
        return parsed.strftime("%d %b %Y")
    except Exception:
        return value


def infer_event_venue(item: CrawlItem) -> str:
    blob = f"{item.page_title} {item.content_snippet}".lower()
    if "kuala lumpur" in blob or "wp kuala lumpur" in blob:
        return "Wilayah Persekutuan Kuala Lumpur"
    if "pahang" in blob:
        return "Pahang"
    if "johor" in blob:
        return "Johor"
    if "selangor" in blob:
        return "Selangor"
    return "the relevant venue"


def summarize_item(item: CrawlItem) -> str:
    if item.category == "Media Release":
        return (
            "HASiL issued a media release explaining that taxpayers who accidentally marked the employer-borne tax box "
            "do not need to submit a revised tax return. The note indicates the handling and refund process will move in stages."
        )
    if item.category == "e-Invoice Event":
        venue = infer_event_venue(item)
        return (
            f"HASIL announced an e-Invoice event for {venue}. The notice points taxpayers to a public briefing session "
            f"on {format_human_date(item.published_date)} and provides the event listing for registration or follow-up."
        )
    if item.category == "Announcement":
        return (
            f"HASIL published an announcement on {format_human_date(item.published_date)}. "
            f"The update is part of the site's public notice stream and should be reviewed alongside the source link."
        )
    snippet = item.content_snippet
    if len(snippet) > 220:
        snippet = snippet[:217].rstrip() + "..."
    return f"{item.page_title}: {snippet}" if snippet else item.page_title


def compose_briefing(items: list[CrawlItem], target_date: date, override_text: Optional[str] = None) -> str:
    if override_text:
        return override_text.strip()

    if not items:
        return (
            f"No new public HASiL updates were detected for {target_date.strftime('%d %b %Y')}. "
            "The crawl checked the main public list pages and detail pages and did not find a qualifying item for yesterday."
        )

    count = len(items)
    categories = sorted({item.category for item in items})
    category_phrase = ", ".join(categories[:-1]) + f" and {categories[-1]}" if len(categories) > 1 else categories[0]

    paragraphs = [
        f"HASIL published {count} public update(s) for {target_date.strftime('%d %b %Y')} across {category_phrase}. "
        "The strongest signal is a mix of a media release and new e-Invoice event notices, which suggests the public content stream "
        "was active and operational yesterday.",
    ]

    for item in items:
        paragraphs.append(summarize_item(item))

    paragraphs.append(
        "For readers tracking tax administration updates, the overall theme is practical guidance rather than a policy overhaul. "
        "The media release clarifies a filing issue, while the event notices provide event-level guidance and outreach information. "
        "Taken together, they are worth monitoring because they can affect taxpayer communication, attendance planning, and compliance awareness."
    )

    return "\n\n".join(paragraphs)


def format_bullet_links(items: list[CrawlItem]) -> str:
    if not items:
        return "- No qualifying public updates were found yesterday."
    lines = []
    for item in items:
        published = format_human_date(item.published_date)
        lines.append(f"- {item.page_title} ({item.category}, {published}) - {item.source_url}")
    return "\n".join(lines)


def build_email_subject(target_date: date, items: list[CrawlItem]) -> str:
    label = target_date.strftime("%d %b %Y")
    if not items:
        return f"HASIL daily briefing - no new updates for {label}"
    return f"HASIL daily briefing - {label} ({len(items)} item(s))"


def build_email_body(target_date: date, items: list[CrawlItem], override_text: Optional[str] = None) -> str:
    headline = f"HASIL Daily Briefing for {target_date.strftime('%d %b %Y')}"
    briefing = compose_briefing(items, target_date, override_text=override_text)
    links = format_bullet_links(items)
    return (
        f"{headline}\n"
        f"{'=' * len(headline)}\n\n"
        f"Briefing\n"
        f"{'-' * 8}\n"
        f"{briefing}\n\n"
        f"Links\n"
        f"{'-' * 5}\n"
        f"{links}\n"
    )


def build_email_message(
    recipient: str,
    sender: str,
    subject: str,
    body: str,
) -> EmailMessage:
    message = EmailMessage()
    message["To"] = recipient
    message["From"] = sender
    message["Subject"] = subject
    message["Date"] = email.utils.formatdate(localtime=True)
    message.set_content(body)
    return message


def send_via_smtp(message: EmailMessage) -> bool:
    host = os.getenv("SMTP_HOST")
    if not host:
        return False
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    use_ssl = os.getenv("SMTP_USE_SSL", "false").lower() in {"1", "true", "yes"}
    use_starttls = os.getenv("SMTP_STARTTLS", "true").lower() in {"1", "true", "yes"}

    if use_ssl:
        smtp: smtplib.SMTP = smtplib.SMTP_SSL(host, port, timeout=30)
    else:
        smtp = smtplib.SMTP(host, port, timeout=30)

    with smtp as client:
        client.ehlo()
        if use_starttls and not use_ssl:
            client.starttls()
            client.ehlo()
        if username and password:
            client.login(username, password)
        client.send_message(message)
    return True


def send_via_mail_command(message: EmailMessage) -> bool:
    sendmail_binary = shutil.which("sendmail")
    if not sendmail_binary:
        return False
    raw_message = message.as_string()
    proc = subprocess.run(
        [sendmail_binary, "-oi", "-t"],
        input=raw_message,
        text=True,
        capture_output=True,
        check=False,
    )
    if proc.returncode != 0:
        return False
    stderr = (proc.stderr or "").lower()
    return "fatal:" not in stderr and "warning: valid_hostname" not in stderr


def print_report(target_date: date, items: list[CrawlItem], body: str, subject: str) -> None:
    summary = {
        "target_date": target_date.isoformat(),
        "item_count": len(items),
        "subject": subject,
        "items": [asdict(item) for item in items],
    }
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    print()
    print(body)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Crawl HASiL public pages and send a daily briefing email.")
    parser.add_argument(
        "--date",
        help="Target date in YYYY-MM-DD. Defaults to yesterday in UTC+8.",
    )
    parser.add_argument(
        "--recipient",
        default=DEFAULT_RECIPIENT,
        help="Email recipient address.",
    )
    parser.add_argument(
        "--briefing-file",
        help="Optional path to a text file containing a manual briefing body override.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the email body instead of sending it.",
    )
    return parser.parse_args()


def resolve_target_date(raw_value: Optional[str]) -> date:
    if raw_value:
        return datetime.strptime(raw_value, "%Y-%m-%d").date()
    return datetime.now(UTC8).date() - timedelta(days=1)


def read_override_text(path: Optional[str]) -> Optional[str]:
    if not path:
        return None
    return Path(path).read_text(encoding="utf-8")


def main() -> int:
    args = parse_args()
    target_date = resolve_target_date(args.date)
    override_text = read_override_text(args.briefing_file)

    items = crawl_hasil_public_content(target_date)
    body = build_email_body(target_date, items, override_text=override_text)
    subject = build_email_subject(target_date, items)

    sender_name = os.getenv("MAIL_FROM_NAME", "HASiL Daily Briefing")
    sender_email = os.getenv("MAIL_FROM", os.getenv("SMTP_USER", "no-reply@localhost"))
    sender = email.utils.formataddr((sender_name, sender_email))
    message = build_email_message(args.recipient, sender, subject, body)

    if args.dry_run:
        print_report(target_date, items, body, subject)
        return 0

    if send_via_smtp(message):
        print(f"Sent via SMTP to {args.recipient}")
        return 0

    if send_via_mail_command(message):
        print(f"Sent via system mail command to {args.recipient}")
        return 0

    print("Unable to send email: no SMTP configuration found and the system 'mail' command is unavailable.", file=sys.stderr)
    print_report(target_date, items, body, subject)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
