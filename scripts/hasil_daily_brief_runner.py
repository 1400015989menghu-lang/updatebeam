#!/usr/bin/env python3
from __future__ import annotations

import argparse
import email.utils
import json
import os
import re
import sqlite3
import sys
from dataclasses import asdict
from datetime import date, datetime, time, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Iterable, Optional
from urllib.parse import urlparse

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

try:
    from hasil_crawler import ReportItem as CrawlItem, crawl_hasil as crawl_hasil_public_content
except Exception as exc:
    raise SystemExit(
        f"Unable to import hasil_crawler from {SCRIPT_DIR}: {exc}. "
        "Make sure scripts/hasil_crawler.py exists and is importable."
    )

DEFAULT_RECIPIENTS = [
    "1400015989menghu@gmail.com",
    "kit.everfine@gmail.com",
    "melissayee@yahoo.com",
]
UTC8 = timezone(timedelta(hours=8))
PROJECT_ROOT = SCRIPT_DIR.parent
DOTENV_FILES = (PROJECT_ROOT / ".env", PROJECT_ROOT / ".env.local")
STATE_FILE = PROJECT_ROOT / ".hasil_daily_brief_state.json"
DEFAULT_SOURCE_SLUG = "hasil-en"
TAG_ORDER = [
    "Policy / Legal Change",
    "Tax Notice",
    "Training / Webinar",
    "Public Guidance / Outreach",
    "Other",
]
PRIORITY_CATEGORIES = {
    "e-invoice-event",
    "announcement",
    "media-release",
}

GENERIC_TITLE_PATTERNS = [
    r"^home \(en\) \| lembaga hasil dalam negeri malaysia$",
    r"^about hasil \| lembaga hasil dalam negeri malaysia$",
    r"^corporate profile \| lembaga hasil dalam negeri malaysia$",
    r"^corporate culture \| lembaga hasil dalam negeri malaysia$",
    r"^hasil integrity \| lembaga hasil dalam negeri malaysia$",
    r"^untitled page$",
]

NOISE_URL_SNIPPETS = [
    "/en/#site-content",
    "/en/about-hasil/",
    "/en/corporate-profile/",
    "/en/corporate-culture/",
    "/en/integrity/",
    "/en/pearl-book/",
    "/en/whistleblowing/",
]

IMAGE_SUFFIXES = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".bmp", ".tif", ".tiff")

POLICY_KEYWORDS = [
    "policy change",
    "policy statement",
    "legal",
    "law",
    "act",
    "amend",
    "amendment",
    "regulation",
    "gazette",
    "order",
    "ruling",
    "guideline",
    "rules",
    "stamp duty",
    "income tax act",
    "tax act",
]

TRAINING_KEYWORDS = [
    "webinar",
    "seminar",
    "training",
    "talk",
    "briefing",
    "workshop",
    "e-invoice event",
    "event",
]

NOTICE_KEYWORDS = [
    "announcement",
    "notice",
    "notification",
    "reminder",
    "e-invoice",
    "public notice",
]

PROMO_KEYWORDS = [
    "media release",
    "press release",
    "publicity",
    "video",
    "podcast",
    "brochure",
    "publication",
    "poster",
    "interview",
]

PAGE_UPDATE_KEYWORDS = [
    "site-content",
    "about hasil",
    "corporate profile",
    "corporate culture",
]

PAGE_UPDATE_PATTERNS = [
    re.compile(r"^/en/?$"),
    re.compile(r"^/en/about-hasil/?$"),
    re.compile(r"^/en/about-hasil/[^/]+/?$"),
]


def resolve_database_path() -> Path:
    raw_url = os.getenv("DATABASE_URL", "file:./dev.db")
    if raw_url.startswith("file:"):
        raw_path = raw_url[len("file:") :]
        path = Path(raw_path)
        if not path.is_absolute():
            candidate = (PROJECT_ROOT / "prisma" / raw_path).resolve()
            if candidate.exists():
                return candidate
            return (PROJECT_ROOT / raw_path).resolve()
        return path
    return (PROJECT_ROOT / "prisma" / "dev.db").resolve()


def get_db_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(resolve_database_path())
    connection.row_factory = sqlite3.Row
    return connection


def make_target_datetime(target_date: date) -> str:
    return datetime.combine(target_date, time.min, tzinfo=UTC8).isoformat()


def create_token() -> str:
    return os.urandom(24).hex()


def get_tracked_source(connection: sqlite3.Connection, slug: str) -> Optional[sqlite3.Row]:
    return connection.execute(
        """
        SELECT id, slug, name, rootUrl, category, adapterType, timezone, isActive, isPublic
        FROM "TrackedSource"
        WHERE slug = ?
        """,
        (slug,),
    ).fetchone()


def ensure_unsubscribe_token(
    connection: sqlite3.Connection,
    subscriber_id: str,
    subscription_id: str,
) -> str:
    existing = connection.execute(
        """
        SELECT token
        FROM "SubscriptionToken"
        WHERE subscriberId = ?
          AND subscriptionId = ?
          AND type = 'unsubscribe'
          AND consumedAt IS NULL
          AND expiresAt > ?
        ORDER BY createdAt DESC
        LIMIT 1
        """,
        (subscriber_id, subscription_id, datetime.now(UTC8).isoformat()),
    ).fetchone()
    if existing:
        return str(existing["token"])

    token = create_token()
    expires_at = (datetime.now(UTC8) + timedelta(days=30)).isoformat()
    connection.execute(
        """
        INSERT INTO "SubscriptionToken" (id, token, subscriberId, subscriptionId, type, expiresAt, createdAt)
        VALUES (?, ?, ?, ?, 'unsubscribe', ?, ?)
        """,
        (f"py_{create_token()[:20]}", token, subscriber_id, subscription_id, expires_at, datetime.now(UTC8).isoformat()),
    )
    return token


def fetch_source_recipients(
    connection: sqlite3.Connection,
    source_id: str,
    target_date: date,
) -> list[dict[str, Optional[str]]]:
    sent_date = make_target_datetime(target_date)
    rows = connection.execute(
        """
        SELECT s.id AS subscriberId,
               s.email AS email,
               sub.id AS subscriptionId
        FROM "SubscriberSourceSubscription" sub
        JOIN "EmailSubscriber" s ON s.id = sub.subscriberId
        WHERE sub.sourceId = ?
          AND sub.status = 'active'
          AND s.status = 'active'
          AND NOT EXISTS (
            SELECT 1
            FROM "DigestDelivery" dd
            WHERE dd.sourceId = sub.sourceId
              AND dd.subscriberId = s.id
              AND dd.targetDate = ?
              AND dd.status = 'sent'
          )
        ORDER BY s.email ASC
        """,
        (source_id, sent_date),
    ).fetchall()

    recipients = []
    for row in rows:
        token = ensure_unsubscribe_token(connection, str(row["subscriberId"]), str(row["subscriptionId"]))
        recipients.append(
            {
                "subscriber_id": str(row["subscriberId"]),
                "subscription_id": str(row["subscriptionId"]),
                "email": str(row["email"]),
                "unsubscribe_token": token,
            }
        )
    return recipients


def record_delivery(
    connection: sqlite3.Connection,
    *,
    source_id: str,
    subscriber_id: str,
    target_date: date,
    subject: str,
    item_count: int,
    summary: str,
    status: str,
    email_id: Optional[str] = None,
    failure_reason: Optional[str] = None,
    retry_increment: bool = False,
) -> None:
    target_date_value = make_target_datetime(target_date)
    now = datetime.now(UTC8).isoformat()
    existing = connection.execute(
        """
        SELECT id, retryCount
        FROM "DigestDelivery"
        WHERE sourceId = ? AND subscriberId = ? AND targetDate = ?
        """,
        (source_id, subscriber_id, target_date_value),
    ).fetchone()

    if existing:
        retry_count = int(existing["retryCount"] or 0) + (1 if retry_increment else 0)
        connection.execute(
            """
            UPDATE "DigestDelivery"
            SET status = ?,
                subject = ?,
                emailId = ?,
                itemCount = ?,
                summary = ?,
                failureReason = ?,
                retryCount = ?,
                sentAt = ?,
                updatedAt = ?
            WHERE id = ?
            """,
            (
                status,
                subject,
                email_id,
                item_count,
                summary,
                failure_reason,
                retry_count,
                now if status == "sent" else None,
                now,
                str(existing["id"]),
            ),
        )
        return

    connection.execute(
        """
        INSERT INTO "DigestDelivery"
          (id, sourceId, subscriberId, targetDate, status, subject, emailId, itemCount, summary, failureReason, retryCount, sentAt, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            f"py_{create_token()[:20]}",
            source_id,
            subscriber_id,
            target_date_value,
            status,
            subject,
            email_id,
            item_count,
            summary,
            failure_reason,
            1 if retry_increment else 0,
            now if status == "sent" else None,
            now,
            now,
        ),
    )


def mark_source_run(connection: sqlite3.Connection, source_id: str) -> None:
    connection.execute(
        """
        UPDATE "TrackedSource"
        SET lastSuccessfulRunAt = ?, updatedAt = ?
        WHERE id = ?
        """,
        (datetime.now(UTC8).isoformat(), datetime.now(UTC8).isoformat(), source_id),
    )


def normalize_whitespace(value: str) -> str:
    return " ".join(value.split()).strip()


def word_count(text: str) -> int:
    return len([word for word in text.split() if word.strip()])


def trim_to_words(text: str, max_words: int) -> str:
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]).rstrip() + "..."


def summarize_item(item: CrawlItem, max_words: int = 55) -> str:
    snippet = normalize_whitespace(item.content_snippet or "")
    base = f"{item.page_title} ({item.category})."
    if not snippet:
        return base
    combined = f"{base} {snippet}"
    return trim_to_words(combined, max_words)


def compose_briefing(items: list[CrawlItem], target_date: date) -> str:
    if not items:
        return (
            f"No new public HASiL updates were detected for {target_date.strftime('%d %b %Y')}. "
            "The crawl checked the main public list pages and detail pages and did not find a qualifying item for yesterday."
        )

    categories = sorted({item.category for item in items})
    category_phrase = ", ".join(categories[:-1]) + f" and {categories[-1]}" if len(categories) > 1 else categories[0]
    intro = (
        f"Here is the HASiL public update briefing for {target_date.strftime('%d %b %Y')}. "
        f"We identified {len(items)} item(s) published or updated yesterday across {category_phrase}. "
        "The updates lean toward public communication and outreach rather than major policy changes."
    )

    paragraphs = [intro]
    for item in items:
        paragraphs.append(summarize_item(item))

    closing = (
        "Overall, the content signals ongoing taxpayer engagement and operational guidance. "
        "If you need deeper detail, the source links below provide the official wording and any attached documents."
    )
    paragraphs.append(closing)

    briefing = "\n\n".join(paragraphs)
    if word_count(briefing) > 330:
        briefing = trim_to_words(briefing, 300)
    elif word_count(briefing) < 240:
        briefing = (
            briefing
            + "\n\n"
            + "These notices are useful for tracking communication trends, event scheduling, and updates to taxpayer-facing instructions."
        )

    return briefing


def format_links(items: list[CrawlItem]) -> str:
    if not items:
        return "- No qualifying public updates were found yesterday."
    lines = []
    for item in items:
        lines.append(f"- {item.page_title} - {item.source_url}")
    return "\n".join(lines)


def build_email_subject(
    target_date: date,
    items: list[tuple[CrawlItem, str]],
    source_name: Optional[str] = None,
) -> str:
    label = target_date.strftime("%d %b %Y")
    prefix = source_name or "HASIL"
    if not items:
        return f"{prefix} Daily Briefing - {label} (No new verified updates)"
    item_label = "item" if len(items) == 1 else "items"
    return f"{prefix} Daily Briefing - {label} ({len(items)} {item_label})"


def build_email_body(
    target_date: date,
    items: list[tuple[CrawlItem, str]],
    source_name: Optional[str] = None,
    unsubscribe_url: Optional[str] = None,
) -> str:
    prefix = source_name or "HASIL"
    headline = f"{prefix} Daily Briefing for {target_date.strftime('%d %b %Y')}"
    if not items:
        body = (
            f"{headline}\n"
            f"{'=' * len(headline)}\n\n"
            "Summary\n"
            "-------\n"
            "No verified public article-like pages were found as newly published or updated yesterday after filtering out navigation pages, images, and generic section pages.\n\n"
            "Article Links\n"
            "-------------\n"
            "- None\n"
        )
        if unsubscribe_url:
            body += f"\nManage subscription\n------------------\n- Unsubscribe: {unsubscribe_url}\n"
        return body

    counts: dict[str, int] = {tag: 0 for tag in TAG_ORDER}
    for _item, tag in items:
        counts[tag] = counts.get(tag, 0) + 1

    policy_count = counts.get("Policy / Legal Change", 0)
    summary_lines = [
        f"This briefing covers verified public {prefix} pages that were newly published or updated on {target_date.strftime('%d %b %Y')}.",
        f"We kept {len(items)} article-like item(s) after filtering out navigation pages, images, duplicate site furniture, and generic section pages.",
    ]
    if policy_count:
        summary_lines.append(f"{policy_count} item(s) appear to involve policy or legal change and should be read carefully in the original source.")
    else:
        summary_lines.append("We did not find any clearly published formal policy or legal changes in this batch.")

    sections: list[str] = []
    for tag in TAG_ORDER:
        tagged_items = [(item, item_tag) for item, item_tag in items if item_tag == tag]
        if not tagged_items:
            continue
        sections.append(f"\n[{tag}]")
        for item, item_tag in tagged_items:
            summary = summarize_tagged_item(item, item_tag)
            sections.append(f"- Title: {normalize_text(item.page_title)}")
            sections.append(f"  Summary: {summary}")
            sections.append(f"  Link: {item.source_url}")

    link_lines = [f"- {normalize_text(item.page_title)} - {item.source_url}" for item, _tag in items]

    body = (
        f"{headline}\n"
        f"{'=' * len(headline)}\n\n"
        f"Summary\n"
        f"-------\n"
        f"{' '.join(summary_lines)}\n"
        + "\n".join(sections)
        + "\n\nArticle Links\n-------------\n"
        + "\n".join(link_lines)
        + "\n"
    )
    if unsubscribe_url:
        body += f"\nManage subscription\n------------------\n- Unsubscribe: {unsubscribe_url}\n"
    return body


def build_email_message(recipients: list[str], sender: str, subject: str, body: str) -> EmailMessage:
    message = EmailMessage()
    message["To"] = ", ".join(recipients)
    message["From"] = sender
    message["Subject"] = subject
    message["Date"] = email.utils.formatdate(localtime=True)
    message.set_content(body)
    return message


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'\"")
        os.environ.setdefault(key, value)


def load_project_env() -> None:
    for path in DOTENV_FILES:
        load_env_file(path)


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def normalize_title(value: str) -> str:
    title = normalize_text(value)
    suffix = " | Lembaga Hasil Dalam Negeri Malaysia"
    if title.endswith(suffix):
        return title[: -len(suffix)].rstrip()
    return title


def extract_path(url: str) -> str:
    from urllib.parse import urlparse

    return urlparse(url).path.lower()


def has_any(text: str, keywords: list[str]) -> bool:
    lowered = (text or "").lower()
    return any(keyword in lowered for keyword in keywords)


def is_noise_item(item: CrawlItem) -> bool:
    title = normalize_text(item.page_title).lower()
    url = item.source_url.lower()
    path = extract_path(item.source_url)
    snippet = (item.content_snippet or "").lower()

    if not item.source_url.startswith("https://www.hasil.gov.my/"):
        return True
    if path.endswith(IMAGE_SUFFIXES):
        return True
    if any(snippet_key in url for snippet_key in NOISE_URL_SNIPPETS):
        return True
    if any(re.fullmatch(pattern, title) for pattern in GENERIC_TITLE_PATTERNS):
        return True
    if title == "untitled page" and any(marker in snippet for marker in ("png", "ihdr", "plte", "chrm", "idat")):
        return True
    if title.startswith("home (en)") and "#site-content" in url:
        return True
    if any(pattern.fullmatch(path) for pattern in PAGE_UPDATE_PATTERNS):
        return True
    if item.category == "general" and not has_any(f"{title} {url} {snippet}", POLICY_KEYWORDS + TRAINING_KEYWORDS + NOTICE_KEYWORDS + PROMO_KEYWORDS):
        if any(noise in path for noise in NOISE_URL_SNIPPETS):
            return True
    return False


def classify_tag(item: CrawlItem) -> str:
    title = normalize_title(item.page_title)
    keyword_text = " ".join(
        filter(
            None,
            [
                title,
                item.source_url,
                item.category,
            ],
        )
    ).lower()
    if item.category == "e-invoice-event":
        return "Training / Webinar"
    if item.category == "announcement":
        return "Tax Notice"
    if item.category == "media-release":
        return "Public Guidance / Outreach"
    if has_any(keyword_text, POLICY_KEYWORDS):
        return "Policy / Legal Change"
    if has_any(keyword_text, TRAINING_KEYWORDS):
        return "Training / Webinar"
    if item.category in {"media-release", "tax-publication", "tax-brochure", "tax-podcast", "interview-video", "tax-education-video"} or has_any(
        keyword_text, PROMO_KEYWORDS
    ):
        return "Public Guidance / Outreach"
    if item.category in {"announcement", "e-invoice"} or has_any(keyword_text, NOTICE_KEYWORDS):
        return "Tax Notice"
    if item.category == "general":
        return "Other"
    return "Other"


def should_keep_item(item: CrawlItem) -> bool:
    if not item.is_yesterday_item:
        return False
    if item.category in PRIORITY_CATEGORIES:
        title = normalize_text(item.page_title).lower()
        path = extract_path(item.source_url)
        if path.endswith(IMAGE_SUFFIXES):
            return False
        if any(re.fullmatch(pattern, title) for pattern in GENERIC_TITLE_PATTERNS):
            return False
        return True
    return not is_noise_item(item)


def item_priority(item: CrawlItem, tag: str) -> tuple[int, int, str]:
    category_rank = 0 if item.category in PRIORITY_CATEGORIES else 1
    tag_rank = TAG_ORDER.index(tag) if tag in TAG_ORDER else len(TAG_ORDER)
    title = normalize_text(item.page_title).lower()
    return (category_rank, tag_rank, title)


def filter_and_tag_items(items: list[CrawlItem]) -> list[tuple[CrawlItem, str]]:
    tagged: list[tuple[CrawlItem, str]] = []
    seen: set[str] = set()
    for item in items:
        if not should_keep_item(item):
            continue
        tag = classify_tag(item)
        if item.source_url in seen:
            continue
        seen.add(item.source_url)
        tagged.append((item, tag))
    tagged.sort(key=lambda pair: item_priority(pair[0], pair[1]))
    return tagged


def summarize_tagged_item(item: CrawlItem, tag: str) -> str:
    title = normalize_title(item.page_title)
    date_value = item.updated_date or item.published_date
    if tag == "Policy / Legal Change":
        lead = "This item appears to involve a policy or legal change."
    elif tag == "Tax Notice":
        lead = "This item is an official tax notice or explanatory notice."
    elif tag == "Training / Webinar":
        lead = "This item is a training session, webinar, talk, or event notice."
    elif tag == "Public Guidance / Outreach":
        lead = "This item is public guidance, outreach, or communication material."
    else:
        lead = "This item does not clearly fit the main policy, notice, or event buckets."

    parts = [f"{lead} Original title: {title}."]
    if date_value:
        try:
            parts.append(f"Published/updated date: {datetime.strptime(date_value, '%Y-%m-%d').date().strftime('%d %b %Y')}.")
        except ValueError:
            parts.append(f"Published/updated date: {date_value}.")
    return " ".join(parts)


def extract_recipients(message: EmailMessage) -> list[str]:
    addresses = [addr for _, addr in email.utils.getaddresses([message.get("To", "")]) if addr]
    if not addresses:
        raise ValueError("Email message does not have valid recipients.")
    return addresses


def send_via_resend(message: EmailMessage, idempotency_key: Optional[str] = None) -> dict[str, object]:
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        raise RuntimeError("RESEND_API_KEY is missing.")

    try:
        import resend
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "The Python 'resend' package is not installed. Run 'python3 -m pip install --user resend' "
            "and try again."
        ) from exc

    resend.api_key = api_key
    params = {
        "from": message.get("From", ""),
        "to": extract_recipients(message),
        "subject": message.get("Subject", ""),
        "text": message.get_content(),
    }
    options: dict[str, object] = {}
    if idempotency_key:
        options["idempotency_key"] = idempotency_key

    response = resend.Emails.send(params, options or None)
    if hasattr(response, "model_dump"):
        return response.model_dump()
    if hasattr(response, "dict"):
        return response.dict()
    if isinstance(response, dict):
        return response
    return {"id": getattr(response, "id", "unknown")}


def print_report(target_date: date, items: list[tuple[CrawlItem, str]], body: str, subject: str) -> None:
    summary = {
        "target_date": target_date.isoformat(),
        "item_count": len(items),
        "subject": subject,
        "items": [{"tag": tag, **asdict(item)} for item, tag in items],
    }
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    print()
    print(body)


def build_unsubscribe_url(token: str) -> str:
    base_url = (os.getenv("NEXT_PUBLIC_APP_URL") or os.getenv("APP_URL") or "http://localhost:3000").rstrip("/")
    return f"{base_url}/unsubscribe?token={token}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Send a daily HASiL public update briefing.")
    parser.add_argument("--date", help="Target date in YYYY-MM-DD. Defaults to yesterday in UTC+8.")
    parser.add_argument(
        "--recipient",
        action="append",
        help="Recipient email address. Repeat or provide comma-separated values.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print the email body instead of sending it.")
    parser.add_argument(
        "--source-slug",
        default=os.getenv("HASIL_SOURCE_SLUG", DEFAULT_SOURCE_SLUG),
        help="TrackedSource.slug to use when resolving subscribers and recording deliveries.",
    )
    parser.add_argument(
        "--max-list-pages",
        type=int,
        default=int(os.getenv("HASIL_MAX_LIST_PAGES", "20")),
        help="Upper bound on list pages to crawl.",
    )
    parser.add_argument(
        "--max-detail-pages",
        type=int,
        default=int(os.getenv("HASIL_MAX_DETAIL_PAGES", "80")),
        help="Upper bound on detail pages to crawl.",
    )
    return parser.parse_args()


def parse_recipient_values(raw_values: Optional[list[str]]) -> list[str]:
    resolved = raw_values or []
    if not resolved:
        env_value = os.getenv("MAIL_TO", "")
        if env_value.strip():
            resolved = [env_value]
    if not resolved:
        return list(DEFAULT_RECIPIENTS)

    recipients: list[str] = []
    for raw in resolved:
        for part in raw.split(","):
            email_address = part.strip()
            if email_address and email_address not in recipients:
                recipients.append(email_address)
    return recipients or list(DEFAULT_RECIPIENTS)


def load_send_state() -> dict[str, dict[str, object]]:
    if not STATE_FILE.exists():
        return {}
    try:
        data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    if not isinstance(data, dict):
        return {}
    return {str(key): value for key, value in data.items() if isinstance(value, dict)}


def save_send_state(state: dict[str, dict[str, object]]) -> None:
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def build_send_key(target_date: date, recipients: list[str]) -> str:
    return f"{target_date.isoformat()}|{'|'.join(sorted(address.lower() for address in recipients))}"


def already_sent(state: dict[str, dict[str, object]], target_date: date, recipients: list[str]) -> Optional[dict[str, object]]:
    return state.get(build_send_key(target_date, recipients))


def record_send(
    state: dict[str, dict[str, object]],
    target_date: date,
    recipients: list[str],
    subject: str,
    email_id: str,
) -> None:
    state[build_send_key(target_date, recipients)] = {
        "target_date": target_date.isoformat(),
        "recipients": recipients,
        "subject": subject,
        "email_id": email_id,
        "sent_at": datetime.now(UTC8).isoformat(),
    }
    save_send_state(state)


def resolve_target_date(raw_value: Optional[str]) -> date:
    if raw_value:
        return datetime.strptime(raw_value, "%Y-%m-%d").date()
    return datetime.now(UTC8).date() - timedelta(days=1)


def main() -> int:
    load_project_env()
    args = parse_args()
    target_date = resolve_target_date(args.date)
    explicit_recipients = parse_recipient_values(args.recipient) if args.recipient else []
    state = load_send_state()
    source_row: Optional[sqlite3.Row] = None
    source_recipients: list[dict[str, Optional[str]]] = []

    try:
        connection = get_db_connection()
    except sqlite3.Error:
        connection = None

    if connection and args.source_slug:
        source_row = get_tracked_source(connection, args.source_slug)
        if source_row:
            source_recipients = fetch_source_recipients(connection, str(source_row["id"]), target_date)

    recipients = explicit_recipients or [entry["email"] for entry in source_recipients if entry.get("email")] or parse_recipient_values(None)

    if not args.dry_run:
        existing = already_sent(state, target_date, recipients) if recipients else None
        if existing and not source_recipients:
            print(
                "Skipping send because this target date has already been delivered "
                f"to the same recipients (id={existing.get('email_id', 'unknown')})."
            )
            if connection:
                connection.close()
            return 0

    report = crawl_hasil_public_content(
        yesterday=target_date,
        max_list_pages=args.max_list_pages,
        max_detail_pages=args.max_detail_pages,
    )
    items = filter_and_tag_items(report.items)
    source_name = str(source_row["name"]) if source_row else None
    subject = build_email_subject(target_date, items, source_name=source_name)

    sender_name = os.getenv("MAIL_FROM_NAME", "HASiL Daily Briefing")
    sender_email = os.getenv("MAIL_FROM", "briefing@updates.updatebeam.com")
    sender = email.utils.formataddr((sender_name, sender_email))

    if args.dry_run:
        body = build_email_body(target_date, items, source_name=source_name)
        print_report(target_date, items, body, subject)
        if connection:
            connection.close()
        return 0

    if not os.getenv("RESEND_API_KEY"):
        print(
            "Resend is not configured. Set RESEND_API_KEY, MAIL_FROM, and MAIL_FROM_NAME "
            "in .env or the shell environment.",
            file=sys.stderr,
        )
        if connection:
            connection.close()
        return 2

    if not recipients:
        print("No active recipients were found for this source and target date.")
        if connection:
            connection.close()
        return 0

    try:
        sent_email_ids: list[str] = []
        failed_recipients: list[str] = []
        recipient_entries = source_recipients or [
            {
                "email": recipient,
                "subscriber_id": None,
                "subscription_id": None,
                "unsubscribe_token": None,
            }
            for recipient in recipients
        ]

        for entry in recipient_entries:
            recipient_email = str(entry["email"])
            unsubscribe_url = (
                build_unsubscribe_url(str(entry["unsubscribe_token"]))
                if entry.get("unsubscribe_token")
                else None
            )
            body = build_email_body(
                target_date,
                items,
                source_name=source_name,
                unsubscribe_url=unsubscribe_url,
            )
            message = build_email_message([recipient_email], sender, subject, body)
            try:
                result = send_via_resend(
                    message,
                    idempotency_key=f"{args.source_slug}-{target_date.isoformat()}-{recipient_email.lower()}",
                )
                email_id = str(result.get("id", "unknown"))
                sent_email_ids.append(email_id)
                if connection and source_row and entry.get("subscriber_id"):
                    record_delivery(
                        connection,
                        source_id=str(source_row["id"]),
                        subscriber_id=str(entry["subscriber_id"]),
                        target_date=target_date,
                        subject=subject,
                        item_count=len(items),
                        summary=body[:1000],
                        status="sent",
                        email_id=email_id,
                    )
            except RuntimeError as exc:
                failed_recipients.append(recipient_email)
                if connection and source_row and entry.get("subscriber_id"):
                    record_delivery(
                        connection,
                        source_id=str(source_row["id"]),
                        subscriber_id=str(entry["subscriber_id"]),
                        target_date=target_date,
                        subject=subject,
                        item_count=len(items),
                        summary="",
                        status="failed",
                        failure_reason=str(exc),
                        retry_increment=True,
                    )

        if connection and source_row and sent_email_ids:
            mark_source_run(connection, str(source_row["id"]))
            connection.commit()
        elif connection:
            connection.commit()

        if sent_email_ids:
            record_send(state, target_date, recipients, subject, sent_email_ids[-1])
            print(
                f"Sent via Resend to {', '.join(recipients)} "
                f"(count={len(sent_email_ids)}, last_id={sent_email_ids[-1]})"
            )
        if failed_recipients:
            print(
                "Some recipients failed: " + ", ".join(failed_recipients),
                file=sys.stderr,
            )
            return 1
        if connection:
            connection.close()
        return 0
    except RuntimeError as exc:
        if connection:
            connection.close()
        print(f"Resend send failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
