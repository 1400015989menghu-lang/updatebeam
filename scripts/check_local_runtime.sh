#!/bin/sh
set -eu

RUNTIME_ROOT="${HOME}/.updatebeam"
RUNTIME_DB="${RUNTIME_ROOT}/dev.db"
RUNTIME_LOG_DIR="${RUNTIME_ROOT}/logs"
RUNTIME_MANIFEST="${RUNTIME_ROOT}/data/source-manifest.json"
RUNTIME_SCRIPT="${RUNTIME_ROOT}/scripts/run_monitoring_scheduler.sh"
LAUNCH_AGENT_LABEL="com.updatebeam.monitoring-scheduler"
LAUNCH_AGENT_PLIST="${HOME}/Library/LaunchAgents/${LAUNCH_AGENT_LABEL}.plist"
BASE_URL="${1:-${NEXT_PUBLIC_APP_URL:-${APP_URL:-http://127.0.0.1:3000}}}"
BASE_URL="${BASE_URL%/}"

fail() {
  printf 'FAIL %s\n' "$1" >&2
  exit 1
}

printf 'Checking UpdateBeam local runtime in %s\n' "$RUNTIME_ROOT"

[ -f "$RUNTIME_DB" ] || fail "Runtime database is missing: $RUNTIME_DB"
[ -f "$RUNTIME_MANIFEST" ] || fail "Runtime manifest is missing: $RUNTIME_MANIFEST"
[ -f "$RUNTIME_SCRIPT" ] || fail "Runtime scheduler script is missing: $RUNTIME_SCRIPT"
[ -f "$LAUNCH_AGENT_PLIST" ] || fail "LaunchAgent plist is missing: $LAUNCH_AGENT_PLIST"

grep -q "$RUNTIME_SCRIPT" "$LAUNCH_AGENT_PLIST" || fail "LaunchAgent plist does not point at runtime scheduler"

LAUNCHCTL_OUTPUT="$(launchctl print "gui/$(id -u)/${LAUNCH_AGENT_LABEL}" 2>&1)" || fail "launchd job is not loaded"
printf '%s\n' "$LAUNCHCTL_OUTPUT" | grep -q "state = running" || fail "launchd job is loaded but not running"

[ -d "$RUNTIME_LOG_DIR" ] || fail "Runtime log directory is missing: $RUNTIME_LOG_DIR"
[ -w "$RUNTIME_LOG_DIR" ] || fail "Runtime log directory is not writable: $RUNTIME_LOG_DIR"

python3 - "$RUNTIME_LOG_DIR/runtime-source-crawl.log" "$RUNTIME_LOG_DIR/monitoring-scheduler.log" "$RUNTIME_DB" "$RUNTIME_MANIFEST" <<'PY'
from __future__ import annotations

import json
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

crawl_log = Path(sys.argv[1])
digest_log = Path(sys.argv[2])
db_path = Path(sys.argv[3])
manifest_path = Path(sys.argv[4])
now = datetime.now(timezone.utc)
cutoff = now - timedelta(minutes=15)

for target in (crawl_log, digest_log):
    if not target.exists():
        raise SystemExit(f"FAIL missing log file: {target}")
    modified_at = datetime.fromtimestamp(target.stat().st_mtime, tz=timezone.utc)
    if modified_at < cutoff:
        raise SystemExit(f"FAIL stale log file: {target} last_modified={modified_at.isoformat()}")
    print(f"OK   recent log {target.name} last_modified={modified_at.isoformat()}")

manifest = json.loads(manifest_path.read_text())
automatic_slugs = sorted(
    entry["slug"]
    for entry in manifest
    if entry.get("reviewMode") != "review-only"
)
review_only_slugs = sorted(
    entry["slug"]
    for entry in manifest
    if entry.get("reviewMode") == "review-only"
)
print(f"OK   manifest automatic={len(automatic_slugs)} review_only={len(review_only_slugs)}")

connection = sqlite3.connect(db_path)
connection.row_factory = sqlite3.Row
tracked_sources = connection.execute('SELECT COUNT(*) AS count FROM "TrackedSource"').fetchone()["count"]
if tracked_sources <= 0:
    raise SystemExit("FAIL tracked source count is zero")
print(f"OK   tracked sources={tracked_sources}")

automatic_sources_with_updates = connection.execute(
    '''
    SELECT COUNT(DISTINCT ts.id) AS count
    FROM "TrackedSource" ts
    JOIN "SourceUpdate" su ON su.sourceId = ts.id
    WHERE su.isPublic = 1
      AND ts.slug IN ({})
    '''.format(",".join("?" for _ in automatic_slugs)),
    automatic_slugs,
).fetchone()["count"] if automatic_slugs else 0
if automatic_sources_with_updates <= 0:
    raise SystemExit("FAIL no automatic source has public updates")
print(f"OK   automatic sources with public updates={automatic_sources_with_updates}")

expected_statuses = {
    "lom-agc-my": ("success", 0),
    "mida-gov-my": ("empty", 0),
    "customs-gov-my": ("review_required", 1),
    "kwsp-gov-my": ("review_required", 1),
    "perkeso-gov-my": ("review_required", 1),
}

for slug, (expected_status, min_open_reviews) in expected_statuses.items():
    row = connection.execute(
        '''
        SELECT
          (SELECT status FROM "SourceRun" sr WHERE sr.sourceId = ts.id ORDER BY datetime(sr.finishedAt) DESC LIMIT 1) AS last_status,
          (SELECT COUNT(*) FROM "SourceReviewItem" ri WHERE ri.sourceId = ts.id AND ri.status = 'open') AS open_reviews
        FROM "TrackedSource" ts
        WHERE ts.slug = ?
        ''',
        (slug,),
    ).fetchone()
    if row is None:
        raise SystemExit(f"FAIL missing tracked source: {slug}")
    if row["last_status"] != expected_status:
        raise SystemExit(f"FAIL unexpected status for {slug}: {row['last_status']} != {expected_status}")
    if row["open_reviews"] < min_open_reviews:
        raise SystemExit(f"FAIL open review count too low for {slug}: {row['open_reviews']} < {min_open_reviews}")
    if slug in {"lom-agc-my", "mida-gov-my"} and row["open_reviews"] != 0:
        raise SystemExit(f"FAIL {slug} should not have open reviews")
    print(f"OK   {slug} last_status={row['last_status']} open_reviews={row['open_reviews']}")

for slug in review_only_slugs:
    row = connection.execute(
        '''
        SELECT COUNT(*) AS open_reviews
        FROM "SourceReviewItem" ri
        JOIN "TrackedSource" ts ON ts.id = ri.sourceId
        WHERE ts.slug = ?
          AND ri.status = 'open'
        ''',
        (slug,),
    ).fetchone()
    if (row["open_reviews"] or 0) <= 0:
        raise SystemExit(f"FAIL review-only source is missing an open review item: {slug}")

print(f"OK   review-only sources with open reviews={len(review_only_slugs)}")
PY

check_page() {
  name="$1"
  pathname="$2"
  status="$(curl -s -o /tmp/updatebeam_local_runtime_body.txt -w '%{http_code}' "${BASE_URL}${pathname}")"
  if [ "$status" -lt 200 ] || [ "$status" -ge 400 ]; then
    fail "Runtime page check failed for ${pathname} (HTTP ${status})"
  fi
  printf 'OK   %-22s %s%s\n' "$name" "$BASE_URL" "$pathname"
}

check_page "sources" "/sources"
check_page "updates" "/updates"
check_page "sitemap" "/sitemap.xml"

printf 'UpdateBeam local runtime checks completed.\n'
