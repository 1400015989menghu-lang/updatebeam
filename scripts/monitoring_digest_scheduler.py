#!/usr/bin/env python3
from __future__ import annotations

import argparse
import email.utils
import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Optional
from zoneinfo import ZoneInfo

from hasil_daily_brief_runner import (
    get_db_connection,
    load_project_env,
    normalize_title,
    send_via_resend,
    summarize_tagged_item,
)
from ingest_updates import persist_source_run_result
from source_orchestrator import build_default_orchestrator

UTC = timezone.utc
DEFAULT_WINDOW_MINUTES = 15
RETRY_DELAY_HOURS = 2
ALLOWED_SLOTS = {0, 15, 30, 45}


@dataclass
class SourceRecord:
    id: str
    slug: str
    name: str
    root_url: str
    category: str
    adapter_type: str
    source_type: str = "official-website"
    automation_mode: str = "html"


@dataclass
class SubscriberRecord:
    id: str
    email: str
    timezone_name: str
    preferred_send_hour: int
    preferred_send_minute: int
    sources: list[SourceRecord]


def create_token() -> str:
    import os

    return os.urandom(24).hex()


def app_base_url() -> str:
    import os

    return (
        (os.getenv("NEXT_PUBLIC_APP_URL") or os.getenv("APP_URL") or "http://localhost:3000").rstrip("/")
    )


def build_manage_url(token: str) -> str:
    return f"{app_base_url()}/manage?token={token}"


def build_unsubscribe_url(token: str) -> str:
    return f"{app_base_url()}/unsubscribe?token={token}"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the combined monitoring digest scheduler.")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be sent without sending email.")
    parser.add_argument("--force", action="store_true", help="Ignore due-window checks and send matching subscribers immediately.")
    parser.add_argument("--email", action="append", help="Restrict the run to one or more subscriber emails.")
    parser.add_argument("--now", help="Override current timestamp with an ISO8601 datetime.")
    parser.add_argument(
        "--window-minutes",
        type=int,
        default=DEFAULT_WINDOW_MINUTES,
        help="Delivery window size used when matching user-local preferred send times.",
    )
    parser.add_argument(
        "--max-list-pages",
        type=int,
        default=4,
        help="Upper bound on HASiL list pages to crawl when building digest content.",
    )
    parser.add_argument(
        "--max-detail-pages",
        type=int,
        default=12,
        help="Upper bound on HASiL detail pages to crawl when building digest content.",
    )
    return parser.parse_args()


def parse_now(raw_value: Optional[str]) -> datetime:
    if raw_value:
        parsed = datetime.fromisoformat(raw_value)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=UTC)
        return parsed.astimezone(UTC)
    return datetime.now(tz=UTC)


def fetch_active_subscribers(connection, emails: Optional[list[str]] = None) -> list[SubscriberRecord]:
    clauses = [
        's.status = "active"',
        'sub.status = "active"',
        'ts.isActive = 1',
    ]
    params: list[object] = []
    if emails:
        placeholders = ",".join("?" for _ in emails)
        clauses.append(f"LOWER(s.email) IN ({placeholders})")
        params.extend(email.strip().lower() for email in emails if email.strip())

    rows = connection.execute(
        f"""
        SELECT
          s.id AS subscriberId,
          s.email AS email,
          s.timezone AS timezoneName,
          s.preferredSendHour AS preferredSendHour,
          s.preferredSendMinute AS preferredSendMinute,
          ts.id AS sourceId,
          ts.slug AS sourceSlug,
          ts.name AS sourceName,
          ts.rootUrl AS rootUrl,
          ts.category AS category,
          ts.adapterType AS adapterType,
          ts.sourceType AS sourceType,
          ts.automationMode AS automationMode
        FROM "EmailSubscriber" s
        JOIN "SubscriberSourceSubscription" sub ON sub.subscriberId = s.id
        JOIN "TrackedSource" ts ON ts.id = sub.sourceId
        WHERE {" AND ".join(clauses)}
        ORDER BY s.email ASC, ts.name ASC
        """,
        params,
    ).fetchall()

    grouped: dict[str, SubscriberRecord] = {}
    for row in rows:
        subscriber_id = str(row["subscriberId"])
        if subscriber_id not in grouped:
            grouped[subscriber_id] = SubscriberRecord(
                id=subscriber_id,
                email=str(row["email"]),
                timezone_name=str(row["timezoneName"] or "Asia/Kuala_Lumpur"),
                preferred_send_hour=(
                    int(row["preferredSendHour"])
                    if row["preferredSendHour"] is not None
                    else 8
                ),
                preferred_send_minute=(
                    int(row["preferredSendMinute"])
                    if row["preferredSendMinute"] is not None
                    else 0
                ),
                sources=[],
            )
        grouped[subscriber_id].sources.append(
            SourceRecord(
                id=str(row["sourceId"]),
                slug=str(row["sourceSlug"]),
                name=str(row["sourceName"]),
                root_url=str(row["rootUrl"]),
                category=str(row["category"]),
                adapter_type=str(row["adapterType"]),
                source_type=str(row["sourceType"] or "official-website"),
                automation_mode=str(row["automationMode"] or "html"),
            )
        )
    return list(grouped.values())


def get_local_now(now_utc: datetime, timezone_name: str) -> datetime:
    try:
        return now_utc.astimezone(ZoneInfo(timezone_name))
    except Exception:
        return now_utc.astimezone(ZoneInfo("Asia/Kuala_Lumpur"))


def matches_due_window(subscriber: SubscriberRecord, now_utc: datetime, window_minutes: int) -> bool:
    local_now = get_local_now(now_utc, subscriber.timezone_name)
    scheduled_minutes = subscriber.preferred_send_hour * 60 + subscriber.preferred_send_minute
    current_minutes = local_now.hour * 60 + local_now.minute
    return scheduled_minutes <= current_minutes < scheduled_minutes + window_minutes


def get_target_date(subscriber: SubscriberRecord, now_utc: datetime) -> date:
    local_now = get_local_now(now_utc, subscriber.timezone_name)
    return local_now.date() - timedelta(days=1)


def get_scheduled_for(subscriber: SubscriberRecord, now_utc: datetime) -> datetime:
    local_now = get_local_now(now_utc, subscriber.timezone_name)
    scheduled_local = local_now.replace(
        hour=subscriber.preferred_send_hour,
        minute=subscriber.preferred_send_minute,
        second=0,
        microsecond=0,
    )
    return scheduled_local.astimezone(UTC)


def load_existing_delivery(connection, subscriber_id: str, target_date: date):
    return connection.execute(
        """
        SELECT *
        FROM "SubscriberDigestDelivery"
        WHERE subscriberId = ? AND targetDate = ?
        LIMIT 1
        """,
        (subscriber_id, datetime.combine(target_date, datetime.min.time(), tzinfo=UTC).isoformat()),
    ).fetchone()


def ensure_global_token(connection, subscriber_id: str, token_type: str, days_valid: int = 30) -> str:
    existing = connection.execute(
        """
        SELECT token
        FROM "SubscriptionToken"
        WHERE subscriberId = ?
          AND subscriptionId IS NULL
          AND type = ?
          AND consumedAt IS NULL
          AND expiresAt > ?
        ORDER BY createdAt DESC
        LIMIT 1
        """,
        (subscriber_id, token_type, datetime.now(tz=UTC).isoformat()),
    ).fetchone()
    if existing:
        return str(existing["token"])

    token = create_token()
    now = datetime.now(tz=UTC).isoformat()
    expires_at = (datetime.now(tz=UTC) + timedelta(days=days_valid)).isoformat()
    connection.execute(
        """
        INSERT INTO "SubscriptionToken" (id, token, subscriberId, subscriptionId, type, expiresAt, createdAt)
        VALUES (?, ?, ?, NULL, ?, ?, ?)
        """,
        (f"py_{create_token()[:20]}", token, subscriber_id, token_type, expires_at, now),
    )
    return token


def get_source_run_result(
    source: SourceRecord,
    target_date: date,
    orchestrator,
    cache,
    max_list_pages: int,
    max_detail_pages: int,
):
    cache_key = (source.slug, target_date, max_list_pages, max_detail_pages)
    if cache_key in cache:
        return cache[cache_key]
    result = orchestrator.run_source(
        source,
        target_date=target_date,
        max_list_pages=max_list_pages,
        max_detail_pages=max_detail_pages,
    )
    cache[cache_key] = result
    return result


def build_digest_subject(target_date: date) -> str:
    return f"UpdateBeam Daily Digest - {target_date.strftime('%d %b %Y')}"


def build_digest_body(
    subscriber: SubscriberRecord,
    target_date: date,
    grouped_items,
    manage_url: str,
    unsubscribe_url: str,
) -> str:
    total_items = sum(len(items) for _, items in grouped_items.values())
    source_count = sum(1 for _, items in grouped_items.values() if items)
    lines = [
        f"UpdateBeam Daily Digest for {target_date.strftime('%d %b %Y')}",
        "=" * 44,
        "",
        "Summary",
        "-------",
    ]

    if total_items == 0:
        lines.extend(
            [
                f"No verified updates were found yesterday across your {len(subscriber.sources)} subscribed source(s).",
                f"Your preferred delivery time is {subscriber.preferred_send_hour:02d}:{subscriber.preferred_send_minute:02d} ({subscriber.timezone_name}).",
            ]
        )
    else:
        lines.extend(
            [
                f"We found {total_items} verified update(s) from {source_count} subscribed source(s) yesterday.",
                f"Your preferred delivery time is {subscriber.preferred_send_hour:02d}:{subscriber.preferred_send_minute:02d} ({subscriber.timezone_name}).",
            ]
        )

        for source_name, (source, items) in grouped_items.items():
            if not items:
                continue
            lines.extend(["", source_name, "-" * len(source_name)])
            for item, tag in items:
                lines.append(f"[{tag}] {normalize_title(item.page_title)}")
                lines.append(summarize_tagged_item(item, tag))
                lines.append(f"Link: {item.source_url}")
                lines.append("")

    lines.extend(
        [
            "",
            "Manage",
            "------",
            f"Manage subscription: {manage_url}",
            f"Unsubscribe: {unsubscribe_url}",
        ]
    )
    return "\n".join(lines).strip() + "\n"


def build_email_message(to_email: str, subject: str, body: str) -> EmailMessage:
    import os

    message = EmailMessage()
    from_email = os.getenv("MAIL_FROM", "briefing@updates.updatebeam.com")
    from_name = os.getenv("MAIL_FROM_NAME", "UpdateBeam")
    message["Subject"] = subject
    message["From"] = email.utils.formataddr((from_name, from_email))
    message["To"] = to_email
    message.set_content(body)
    return message


def upsert_delivery(
    connection,
    *,
    subscriber_id: str,
    target_date: date,
    scheduled_for: datetime,
    status: str,
    subject: str,
    email_id: Optional[str],
    item_count: int,
    summary: str,
    failure_reason: Optional[str],
    retry_count: int,
    retry_after: Optional[datetime],
    sent_at: Optional[datetime],
    source_counts: dict[str, int],
) -> None:
    target_date_value = datetime.combine(target_date, datetime.min.time(), tzinfo=UTC).isoformat()
    now = datetime.now(tz=UTC).isoformat()
    existing = connection.execute(
        """
        SELECT id
        FROM "SubscriberDigestDelivery"
        WHERE subscriberId = ? AND targetDate = ?
        LIMIT 1
        """,
        (subscriber_id, target_date_value),
    ).fetchone()

    if existing:
        delivery_id = str(existing["id"])
        connection.execute(
            """
            UPDATE "SubscriberDigestDelivery"
            SET scheduledFor = ?,
                status = ?,
                subject = ?,
                emailId = ?,
                itemCount = ?,
                summary = ?,
                failureReason = ?,
                retryCount = ?,
                retryAfter = ?,
                sentAt = ?,
                updatedAt = ?
            WHERE id = ?
            """,
            (
                scheduled_for.isoformat(),
                status,
                subject,
                email_id,
                item_count,
                summary,
                failure_reason,
                retry_count,
                retry_after.isoformat() if retry_after else None,
                sent_at.isoformat() if sent_at else None,
                now,
                delivery_id,
            ),
        )
    else:
        delivery_id = f"py_{create_token()[:20]}"
        connection.execute(
            """
            INSERT INTO "SubscriberDigestDelivery"
              (id, subscriberId, targetDate, scheduledFor, status, subject, emailId, itemCount, summary, failureReason, retryCount, retryAfter, sentAt, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                delivery_id,
                subscriber_id,
                target_date_value,
                scheduled_for.isoformat(),
                status,
                subject,
                email_id,
                item_count,
                summary,
                failure_reason,
                retry_count,
                retry_after.isoformat() if retry_after else None,
                sent_at.isoformat() if sent_at else None,
                now,
                now,
            ),
        )

    connection.execute(
        'DELETE FROM "SubscriberDigestDeliverySource" WHERE deliveryId = ?',
        (delivery_id,),
    )
    for source_id, count in source_counts.items():
        connection.execute(
            """
            INSERT INTO "SubscriberDigestDeliverySource" (id, deliveryId, sourceId, itemCount, createdAt)
            VALUES (?, ?, ?, ?, ?)
            """,
            (f"py_{create_token()[:20]}", delivery_id, source_id, count, now),
        )


def run_scheduler(args: argparse.Namespace) -> int:
    if not logging.getLogger().handlers:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        )

    load_project_env()
    now_utc = parse_now(args.now)
    emails = args.email or None

    connection = get_db_connection()
    orchestrator = build_default_orchestrator()
    result_cache = {}
    persisted_sources: set[tuple[str, date]] = set()

    try:
        subscribers = fetch_active_subscribers(connection, emails)
        delivery_count = 0

        for subscriber in subscribers:
            target_date = get_target_date(subscriber, now_utc)
            scheduled_for = get_scheduled_for(subscriber, now_utc)
            existing = load_existing_delivery(connection, subscriber.id, target_date)

            should_run_regular = args.force or matches_due_window(subscriber, now_utc, args.window_minutes)
            is_retry_attempt = False

            if existing:
                existing_status = str(existing["status"])
                if existing_status == "sent":
                    continue
                if existing_status == "failed":
                    retry_after = existing["retryAfter"]
                    retry_count = int(existing["retryCount"] or 0)
                    if retry_count >= 1:
                        continue
                    if retry_after:
                        retry_after_dt = datetime.fromisoformat(str(retry_after))
                        if retry_after_dt <= now_utc:
                            is_retry_attempt = True
                        else:
                            continue
                    elif not should_run_regular:
                        continue
                elif not should_run_regular:
                    continue
            elif not should_run_regular:
                continue

            grouped_items = {}
            source_counts: dict[str, int] = {}
            total_items = 0
            for source in subscriber.sources:
                result = get_source_run_result(
                    source,
                    target_date,
                    orchestrator,
                    result_cache,
                    args.max_list_pages,
                    args.max_detail_pages,
                )
                persist_key = (source.id, target_date)
                if not args.dry_run and persist_key not in persisted_sources:
                    persist_source_run_result(connection, source.id, target_date, result)
                    persisted_sources.add(persist_key)
                adapter = orchestrator.resolve_adapter(orchestrator.build_source_config(source))
                items = adapter.build_digest_items(result)
                grouped_items[source.name] = (source, items)
                source_counts[source.id] = len(items)
                total_items += len(items)

            manage_token = ensure_global_token(connection, subscriber.id, "manage")
            unsubscribe_token = ensure_global_token(connection, subscriber.id, "unsubscribe")
            manage_url = build_manage_url(manage_token)
            unsubscribe_url = build_unsubscribe_url(unsubscribe_token)
            subject = build_digest_subject(target_date)
            body = build_digest_body(subscriber, target_date, grouped_items, manage_url, unsubscribe_url)
            summary = (
                f"{total_items} verified update(s) across {sum(1 for count in source_counts.values() if count > 0)} source(s)."
                if total_items
                else "No verified updates across subscribed sources."
            )

            if args.dry_run:
                print(f"=== {subscriber.email} ===")
                print(body)
                print()
                continue

            message = build_email_message(subscriber.email, subject, body)
            try:
                response = send_via_resend(message, idempotency_key=f"{subscriber.id}:{target_date.isoformat()}")
                email_id = str(response.get("id", "unknown"))
                upsert_delivery(
                    connection,
                    subscriber_id=subscriber.id,
                    target_date=target_date,
                    scheduled_for=scheduled_for,
                    status="sent",
                    subject=subject,
                    email_id=email_id,
                    item_count=total_items,
                    summary=summary,
                    failure_reason=None,
                    retry_count=1 if is_retry_attempt else 0,
                    retry_after=None,
                    sent_at=now_utc,
                    source_counts=source_counts,
                )
                connection.execute(
                    """
                    UPDATE "EmailSubscriber"
                    SET updatedAt = ?
                    WHERE id = ?
                    """,
                    (datetime.now(tz=UTC).isoformat(), subscriber.id),
                )
                delivery_count += 1
                print(f"Sent combined digest to {subscriber.email} (id={email_id})")
            except Exception as exc:
                existing_retry_count = int(existing["retryCount"] or 0) if existing else 0
                next_retry_count = existing_retry_count + 1 if is_retry_attempt else existing_retry_count
                retry_after = None if is_retry_attempt else now_utc + timedelta(hours=RETRY_DELAY_HOURS)
                upsert_delivery(
                    connection,
                    subscriber_id=subscriber.id,
                    target_date=target_date,
                    scheduled_for=scheduled_for,
                    status="failed",
                    subject=subject,
                    email_id=None,
                    item_count=total_items,
                    summary=summary,
                    failure_reason=str(exc),
                    retry_count=next_retry_count,
                    retry_after=retry_after,
                    sent_at=None,
                    source_counts=source_counts,
                )
                print(f"Failed combined digest for {subscriber.email}: {exc}")

        connection.commit()
        if not args.dry_run:
            print(f"Completed scheduler run. Sent {delivery_count} digest(s).")
        return 0
    finally:
        connection.close()


if __name__ == "__main__":
    raise SystemExit(run_scheduler(parse_args()))
