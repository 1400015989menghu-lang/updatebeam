#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from hasil_daily_brief_runner import get_db_connection, load_project_env
from ingest_updates import ensure_runtime_schema, persist_source_run_result
from source_orchestrator import SourceOrchestrator, SourceRuntimeRecord

UTC = timezone.utc


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Crawl active sources and persist SourceUpdate / SourceRun records.")
    parser.add_argument("--slug", action="append", help="Restrict the crawl to one or more source slugs.")
    parser.add_argument("--limit", type=int, help="Limit how many active sources are crawled.")
    parser.add_argument("--dry-run", action="store_true", help="Run adapters without writing SourceRun / SourceUpdate rows.")
    parser.add_argument("--target-date", help="Override target date in YYYY-MM-DD format.")
    parser.add_argument("--max-list-pages", type=int, default=4, help="Per-adapter list page cap.")
    parser.add_argument("--max-detail-pages", type=int, default=12, help="Per-adapter detail page cap.")
    parser.add_argument("--timeout-seconds", type=int, default=120, help="Per-source adapter timeout in seconds.")
    parser.add_argument("--retry-attempts", type=int, default=1, help="Retry attempts for transient source failures.")
    parser.add_argument("--include-inactive", action="store_true", help="Also include inactive sources.")
    return parser.parse_args()


def parse_target_date(raw_value: str | None) -> date:
    if raw_value:
        return date.fromisoformat(raw_value)
    return datetime.now(tz=UTC).date() - timedelta(days=1)


def project_root() -> Path:
    return Path(__file__).resolve().parent.parent


def review_queue_path() -> Path:
    return project_root() / "logs" / "review-queue.jsonl"


def append_review_items(source_slug: str, review_items: list[dict], target_date: date) -> None:
    if not review_items:
        return

    target = review_queue_path()
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("a", encoding="utf-8") as handle:
        for item in review_items:
            payload = {
                "source_slug": source_slug,
                "target_date": target_date.isoformat(),
                **item,
            }
            handle.write(json.dumps(payload, ensure_ascii=False))
            handle.write("\n")


def ensure_failure_review_item(source: SourceRuntimeRecord, result, target_date: date) -> None:
    if result.review_items or result.status not in {"failed", "timeout", "unsupported"}:
        return

    queue_reason = {
        "failed": "source-run-failed",
        "timeout": "source-run-timeout",
        "unsupported": "source-run-unsupported",
    }.get(result.status, "source-run-review")
    priority = "high" if result.status == "timeout" else "medium"
    summary = result.notes[0] if result.notes else f"{source.slug} ended with status={result.status}."
    details = {
        "adapter_name": result.adapter_name,
        "status": result.status,
        "failure_class": result.failure_class,
        "target_date": target_date.isoformat(),
    }
    if result.notes:
        details["notes"] = list(result.notes)

    result.review_items.append(
        {
            "source_slug": source.slug,
            "queue_reason": queue_reason,
            "priority": priority,
            "summary": summary,
            "seed_url": source.root_url,
            "details": details,
        }
    )
    if result.automation_level == "automatic":
        result.automation_level = "review_required"


def tracked_source_columns(connection) -> set[str]:
    rows = connection.execute('PRAGMA table_info("TrackedSource")').fetchall()
    return {str(row["name"]) for row in rows}


def fetch_sources(connection, *, slugs: list[str] | None, limit: int | None, include_inactive: bool) -> list[SourceRuntimeRecord]:
    columns = tracked_source_columns(connection)
    select_parts = [
        'id AS sourceId',
        'slug',
        'name',
        'rootUrl AS rootUrl',
        'category',
        'adapterType AS adapterType',
        'sourceType' if "sourceType" in columns else "'official-website' AS sourceType",
        'automationMode' if "automationMode" in columns else "'html' AS automationMode",
        'trustTier' if "trustTier" in columns else "'official' AS trustTier",
    ]
    clauses: list[str] = []
    params: list[object] = []

    if not include_inactive and "isActive" in columns:
        clauses.append("isActive = 1")
    if slugs:
        placeholders = ",".join("?" for _ in slugs)
        clauses.append(f"slug IN ({placeholders})")
        params.extend(slugs)

    sql = f'SELECT {", ".join(select_parts)} FROM "TrackedSource"'
    if clauses:
        sql += f' WHERE {" AND ".join(clauses)}'
    sql += " ORDER BY slug ASC"
    if limit:
        sql += f" LIMIT {int(limit)}"

    rows = connection.execute(sql, params).fetchall()
    return [
        SourceRuntimeRecord(
            slug=str(row["slug"]),
            name=str(row["name"]),
            root_url=str(row["rootUrl"]),
            category=str(row["category"]),
            adapter_type=str(row["adapterType"]),
            source_type=str(row["sourceType"]),
            automation_mode=str(row["automationMode"]),
            trust_tier=str(row["trustTier"]),
        )
        for row in rows
    ]


def source_id_by_slug(connection, slug: str) -> str:
    row = connection.execute('SELECT id FROM "TrackedSource" WHERE slug = ? LIMIT 1', (slug,)).fetchone()
    if not row:
        raise RuntimeError(f"TrackedSource not found for slug={slug}")
    return str(row["id"])


def main() -> int:
    args = parse_args()
    load_project_env()
    target_date = parse_target_date(args.target_date)
    connection = get_db_connection()
    ensure_runtime_schema(connection)
    orchestrator = SourceOrchestrator(
        timeout_seconds=max(5, int(args.timeout_seconds)),
        retry_attempts=max(0, int(args.retry_attempts)),
    )

    try:
        sources = fetch_sources(
            connection,
            slugs=args.slug,
            limit=args.limit,
            include_inactive=args.include_inactive,
        )
        if not sources:
            print("No matching sources found.")
            return 0

        processed = 0
        inserted_total = 0
        updated_total = 0
        review_total = 0
        review_inserted_total = 0

        for source in sources:
            result = orchestrator.run_source(
                source,
                target_date=target_date,
                max_list_pages=args.max_list_pages,
                max_detail_pages=args.max_detail_pages,
            )
            ensure_failure_review_item(source, result, target_date)
            review_total += len(result.review_items)
            append_review_items(source.slug, result.review_items, target_date)

            inserted_count = 0
            updated_count = 0
            review_inserted_count = 0
            if not args.dry_run:
                summary = persist_source_run_result(
                    connection,
                    source_id_by_slug(connection, source.slug),
                    target_date,
                    result,
                )
                inserted_count = int(summary["inserted_count"])
                updated_count = int(summary["updated_count"])
                review_inserted_count = int(summary["review_inserted_count"])
                inserted_total += inserted_count
                updated_total += updated_count
                review_inserted_total += review_inserted_count
                connection.commit()

            processed += 1
            print(
                f"{source.slug}: adapter={result.adapter_name} status={result.status} "
                f"normalized={result.normalized_count} inserted={inserted_count} updated={updated_count} "
                f"reviews={len(result.review_items)} review_inserted={review_inserted_count}"
            )

        print(
            f"Processed {processed} source(s). Inserted {inserted_total}, updated {updated_total}, "
            f"review items {review_total}, review rows inserted {review_inserted_total}."
        )
        return 0
    finally:
        connection.close()


if __name__ == "__main__":
    raise SystemExit(main())
