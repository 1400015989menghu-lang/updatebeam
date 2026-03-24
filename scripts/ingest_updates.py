from __future__ import annotations

import json
import secrets
from dataclasses import asdict, is_dataclass
from datetime import date, datetime, time, timezone
from typing import Any

from adapters.base import AdapterRunResult, NormalizedUpdate

UTC = timezone.utc


def _create_id(prefix: str = "py") -> str:
    return f"{prefix}_{secrets.token_hex(10)}"


def _json_default(value: Any) -> Any:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if is_dataclass(value):
        return asdict(value)
    return str(value)


def _target_date_value(target_date: date) -> str:
    return datetime.combine(target_date, time.min, tzinfo=UTC).isoformat()


def _date_value(value: date | None) -> str | None:
    if value is None:
        return None
    return datetime.combine(value, time.min, tzinfo=UTC).isoformat()


def ensure_runtime_schema(connection) -> None:
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS "SourceRun" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "sourceId" TEXT NOT NULL,
            "targetDate" DATETIME NOT NULL,
            "adapterName" TEXT NOT NULL,
            "status" TEXT NOT NULL,
            "errorClass" TEXT,
            "automationLevel" TEXT,
            "attemptCount" INTEGER NOT NULL DEFAULT 1,
            "durationMs" INTEGER NOT NULL DEFAULT 0,
            "candidateCount" INTEGER NOT NULL DEFAULT 0,
            "fetchedCount" INTEGER NOT NULL DEFAULT 0,
            "normalizedCount" INTEGER NOT NULL DEFAULT 0,
            "insertedCount" INTEGER NOT NULL DEFAULT 0,
            "updatedCount" INTEGER NOT NULL DEFAULT 0,
            "reviewItemCount" INTEGER NOT NULL DEFAULT 0,
            "notesJson" TEXT,
            "metadataJson" TEXT,
            "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "finishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "SourceRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "TrackedSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """
    )
    connection.execute('CREATE INDEX IF NOT EXISTS "SourceRun_sourceId_targetDate_idx" ON "SourceRun"("sourceId", "targetDate")')
    connection.execute('CREATE INDEX IF NOT EXISTS "SourceRun_status_targetDate_idx" ON "SourceRun"("status", "targetDate")')
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS "SourceReviewItem" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "sourceId" TEXT NOT NULL,
            "targetDate" DATETIME NOT NULL,
            "dedupeKey" TEXT NOT NULL,
            "queueReason" TEXT NOT NULL,
            "priority" TEXT NOT NULL,
            "summary" TEXT NOT NULL,
            "seedUrl" TEXT,
            "detailsJson" TEXT,
            "status" TEXT NOT NULL DEFAULT 'open',
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "resolvedAt" DATETIME,
            CONSTRAINT "SourceReviewItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "TrackedSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
        """
    )
    connection.execute('CREATE UNIQUE INDEX IF NOT EXISTS "SourceReviewItem_dedupeKey_key" ON "SourceReviewItem"("dedupeKey")')
    connection.execute('CREATE INDEX IF NOT EXISTS "SourceReviewItem_sourceId_targetDate_idx" ON "SourceReviewItem"("sourceId", "targetDate")')
    connection.execute('CREATE INDEX IF NOT EXISTS "SourceReviewItem_status_createdAt_idx" ON "SourceReviewItem"("status", "createdAt")')


def _notes_json(result: AdapterRunResult) -> str | None:
    payload = {"notes": result.notes, "review_items": result.review_items}
    if not payload["notes"] and not payload["review_items"]:
        return None
    return json.dumps(payload, ensure_ascii=False, default=_json_default)


def _metadata_json(result: AdapterRunResult) -> str | None:
    if not result.metadata:
        return None
    return json.dumps(result.metadata, ensure_ascii=False, default=_json_default)


def _review_details_json(review_item: dict[str, Any]) -> str | None:
    details = review_item.get("details")
    if not details:
        return None
    return json.dumps(details, ensure_ascii=False, default=_json_default)


def _review_dedupe_key(source_id: str, target_date: date, review_item: dict[str, Any]) -> str:
    queue_reason = str(review_item.get("queue_reason") or "review")
    seed_url = str(review_item.get("seed_url") or "")
    return stable_token(f"{source_id}:{target_date.isoformat()}:{queue_reason}:{seed_url}")


def stable_token(value: str) -> str:
    import hashlib

    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:24]


def _slug_for_update(update: NormalizedUpdate) -> str:
    base = update.url_hash or update.url
    return base[:80]


def _update_exists(connection, source_id: str, url_hash: str, target_date_value: str):
    return connection.execute(
        """
        SELECT id
        FROM "SourceUpdate"
        WHERE sourceId = ?
          AND sourceUrlHash = ?
          AND targetDate = ?
        LIMIT 1
        """,
        (source_id, url_hash, target_date_value),
    ).fetchone()


def upsert_source_updates(connection, source_id: str, target_date: date, updates: list[NormalizedUpdate]) -> tuple[int, int]:
    target_date_value = _target_date_value(target_date)
    now = datetime.now(tz=UTC).isoformat()
    inserted = 0
    updated = 0

    for update in updates:
        matched_keywords_json = json.dumps(list(update.matched_keywords), ensure_ascii=False) if update.matched_keywords else None
        existing = _update_exists(connection, source_id, update.url_hash, target_date_value)
        update_id = str(existing["id"]) if existing else _create_id()
        if existing:
            updated += 1
        else:
            inserted += 1

        connection.execute(
            """
            INSERT INTO "SourceUpdate"
              (id, sourceId, slug, title, sourceUrl, sourceUrlHash, targetDate, publishedDate, updatedDate, summary, bodyText, label, matchedKeywordsJson, isPublic, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            ON CONFLICT(sourceId, sourceUrlHash, targetDate) DO UPDATE SET
              slug = excluded.slug,
              title = excluded.title,
              sourceUrl = excluded.sourceUrl,
              publishedDate = excluded.publishedDate,
              updatedDate = excluded.updatedDate,
              summary = excluded.summary,
              bodyText = excluded.bodyText,
              label = excluded.label,
              matchedKeywordsJson = excluded.matchedKeywordsJson,
              updatedAt = excluded.updatedAt
            """,
            (
                update_id,
                source_id,
                _slug_for_update(update),
                update.title,
                update.url,
                update.url_hash,
                target_date_value,
                _date_value(update.published_date),
                _date_value(update.updated_date),
                update.summary,
                update.body_text,
                update.label,
                matched_keywords_json,
                now,
                now,
            ),
        )

    return inserted, updated


def upsert_source_review_items(connection, source_id: str, target_date: date, review_items: list[dict[str, Any]]) -> int:
    target_date_value = _target_date_value(target_date)
    now = datetime.now(tz=UTC).isoformat()
    inserted = 0
    for review_item in review_items:
        queue_reason = str(review_item.get("queue_reason") or "review")
        dedupe_key = _review_dedupe_key(source_id, target_date, review_item)
        connection.execute(
            """
            UPDATE "SourceReviewItem"
            SET status = 'resolved', resolvedAt = ?
            WHERE sourceId = ?
              AND targetDate = ?
              AND queueReason = ?
              AND status = 'open'
              AND dedupeKey <> ?
            """,
            (now, source_id, target_date_value, queue_reason, dedupe_key),
        )
        existing = connection.execute(
            """
            SELECT id
            FROM "SourceReviewItem"
            WHERE dedupeKey = ?
            LIMIT 1
            """,
            (dedupe_key,),
        ).fetchone()
        if existing:
            connection.execute(
                """
                UPDATE "SourceReviewItem"
                SET priority = ?, summary = ?, seedUrl = ?, detailsJson = ?, status = 'open'
                WHERE id = ?
                """,
                (
                    str(review_item.get("priority") or "medium"),
                    str(review_item.get("summary") or "Review required"),
                    review_item.get("seed_url"),
                    _review_details_json(review_item),
                    str(existing["id"]),
                ),
            )
            continue

        inserted += 1
        connection.execute(
            """
            INSERT INTO "SourceReviewItem"
              (id, sourceId, targetDate, dedupeKey, queueReason, priority, summary, seedUrl, detailsJson, status, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
            """,
            (
                _create_id(),
                source_id,
                target_date_value,
                dedupe_key,
                queue_reason,
                str(review_item.get("priority") or "medium"),
                str(review_item.get("summary") or "Review required"),
                review_item.get("seed_url"),
                _review_details_json(review_item),
                now,
            ),
        )
    return inserted


def resolve_source_review_items(connection, source_id: str, target_date: date) -> int:
    target_date_value = _target_date_value(target_date)
    now = datetime.now(tz=UTC).isoformat()
    cursor = connection.execute(
        """
        UPDATE "SourceReviewItem"
        SET status = 'resolved', resolvedAt = ?
        WHERE sourceId = ?
          AND targetDate = ?
          AND status = 'open'
        """,
        (now, source_id, target_date_value),
    )
    return int(getattr(cursor, "rowcount", 0) or 0)


def persist_source_run_result(connection, source_id: str, target_date: date, result: AdapterRunResult) -> dict[str, int]:
    ensure_runtime_schema(connection)
    inserted_count, updated_count = upsert_source_updates(connection, source_id, target_date, result.normalized_updates)
    review_inserted_count = upsert_source_review_items(connection, source_id, target_date, result.review_items)
    review_resolved_count = 0
    if result.status in {"success", "empty"} and not result.review_items:
        review_resolved_count = resolve_source_review_items(connection, source_id, target_date)
    now = datetime.now(tz=UTC).isoformat()
    status = result.status
    if status == "success" and inserted_count == 0 and updated_count == 0:
        status = "empty"

    connection.execute(
        """
        INSERT INTO "SourceRun"
          (id, sourceId, targetDate, adapterName, status, errorClass, automationLevel, attemptCount, durationMs, candidateCount, fetchedCount, normalizedCount, insertedCount, updatedCount, reviewItemCount, notesJson, metadataJson, startedAt, finishedAt, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            _create_id(),
            source_id,
            _target_date_value(target_date),
            result.adapter_name,
            status,
            result.failure_class,
            result.automation_level,
            result.attempts,
            result.duration_ms,
            result.candidate_count,
            result.fetched_count,
            result.normalized_count,
            inserted_count,
            updated_count,
            len(result.review_items),
            _notes_json(result),
            _metadata_json(result),
            now,
            now,
            now,
        ),
    )

    if status in {"success", "empty"}:
        connection.execute(
            """
            UPDATE "TrackedSource"
            SET lastSuccessfulRunAt = ?, updatedAt = ?
            WHERE id = ?
            """,
            (now, now, source_id),
        )

    return {
        "inserted_count": inserted_count,
        "updated_count": updated_count,
        "review_inserted_count": review_inserted_count,
        "review_resolved_count": review_resolved_count,
    }
