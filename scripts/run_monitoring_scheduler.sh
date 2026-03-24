#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT_DIR/logs"
CRAWL_LOG_FILE="$LOG_DIR/runtime-source-crawl.log"
SCHEDULER_LOG_FILE="$LOG_DIR/monitoring-scheduler.log"

mkdir -p "$LOG_DIR"
cd "$ROOT_DIR"

TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S %z')"
echo "[$TIMESTAMP] Starting monitoring runtime run" >> "$SCHEDULER_LOG_FILE"

run_stage() {
  stage_name="$1"
  log_file="$2"
  shift 2

  stage_started_at="$(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "[$stage_started_at] Starting ${stage_name}" >> "$log_file"
  if "$@" >> "$log_file" 2>&1; then
    stage_finished_at="$(date '+%Y-%m-%d %H:%M:%S %z')"
    echo "[$stage_finished_at] Finished ${stage_name} status=0" >> "$log_file"
    return 0
  fi

  stage_rc=$?
  stage_finished_at="$(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "[$stage_finished_at] Finished ${stage_name} status=${stage_rc}" >> "$log_file"
  return "$stage_rc"
}

run_source_crawl() {
  env \
    PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/tmp/openclaw-node/bin:${PATH:-}" \
    DATABASE_URL="${DATABASE_URL:-file:${HOME}/.updatebeam/dev.db}" \
    HASIL_MAX_LIST_PAGES="${HASIL_MAX_LIST_PAGES:-4}" \
    HASIL_MAX_DETAIL_PAGES="${HASIL_MAX_DETAIL_PAGES:-12}" \
    HASIL_FETCH_TIMEOUT="${HASIL_FETCH_TIMEOUT:-8}" \
    python3 scripts/run_source_crawl.py
}

run_digest_scheduler() {
  env \
    PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/tmp/openclaw-node/bin:${PATH:-}" \
    DATABASE_URL="${DATABASE_URL:-file:${HOME}/.updatebeam/dev.db}" \
    HASIL_MAX_LIST_PAGES="${HASIL_MAX_LIST_PAGES:-4}" \
    HASIL_MAX_DETAIL_PAGES="${HASIL_MAX_DETAIL_PAGES:-12}" \
    HASIL_FETCH_TIMEOUT="${HASIL_FETCH_TIMEOUT:-8}" \
    python3 scripts/monitoring_digest_scheduler.py
}

crawl_rc=0
digest_rc=0

run_stage "source crawl" "$CRAWL_LOG_FILE" run_source_crawl || crawl_rc=$?
run_stage "digest scheduler" "$SCHEDULER_LOG_FILE" run_digest_scheduler || digest_rc=$?

if [ "$crawl_rc" -ne 0 ]; then
  exit "$crawl_rc"
fi

exit "$digest_rc"
