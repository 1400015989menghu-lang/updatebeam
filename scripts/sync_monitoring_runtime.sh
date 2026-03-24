#!/bin/zsh
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname "$0")" && pwd)
PROJECT_ROOT=$(cd -- "$SCRIPT_DIR/.." && pwd)
RUNTIME_ROOT="${HOME}/.updatebeam"
RUNTIME_SCRIPTS_DIR="${RUNTIME_ROOT}/scripts"
RUNTIME_ADAPTERS_DIR="${RUNTIME_SCRIPTS_DIR}/adapters"
RUNTIME_DATA_DIR="${RUNTIME_ROOT}/data"
RUNTIME_LOG_DIR="${RUNTIME_ROOT}/logs"
RUNTIME_BROWSER_DIR="${RUNTIME_ROOT}/browser-runtime"
LAUNCH_AGENTS_DIR="${HOME}/Library/LaunchAgents"
LAUNCH_AGENT_PLIST="${LAUNCH_AGENTS_DIR}/com.updatebeam.monitoring-scheduler.plist"
SOURCE_DB_PATH="${PROJECT_ROOT}/prisma/dev.db"
TARGET_DB_PATH="${RUNTIME_ROOT}/dev.db"

mkdir -p "$RUNTIME_SCRIPTS_DIR"
mkdir -p "$RUNTIME_ADAPTERS_DIR"
mkdir -p "$RUNTIME_DATA_DIR"
mkdir -p "$RUNTIME_LOG_DIR"
mkdir -p "$RUNTIME_BROWSER_DIR"
mkdir -p "$LAUNCH_AGENTS_DIR"

cp "${PROJECT_ROOT}/scripts/monitoring_digest_scheduler.py" "${RUNTIME_SCRIPTS_DIR}/"
cp "${PROJECT_ROOT}/scripts/source_orchestrator.py" "${RUNTIME_SCRIPTS_DIR}/"
cp "${PROJECT_ROOT}/scripts/ingest_updates.py" "${RUNTIME_SCRIPTS_DIR}/"
cp "${PROJECT_ROOT}/scripts/run_source_crawl.py" "${RUNTIME_SCRIPTS_DIR}/"
cp "${PROJECT_ROOT}/scripts/review_queue.py" "${RUNTIME_SCRIPTS_DIR}/"
cp "${PROJECT_ROOT}/scripts/hasil_daily_brief_runner.py" "${RUNTIME_SCRIPTS_DIR}/"
cp "${PROJECT_ROOT}/scripts/hasil_crawler.py" "${RUNTIME_SCRIPTS_DIR}/"
cp "${PROJECT_ROOT}/scripts/extract_pdf_text.py" "${RUNTIME_SCRIPTS_DIR}/"
cp "${PROJECT_ROOT}/scripts/check_runtime.sh" "${RUNTIME_SCRIPTS_DIR}/"
cp "${PROJECT_ROOT}/scripts/check_local_runtime.sh" "${RUNTIME_SCRIPTS_DIR}/"
cp "${PROJECT_ROOT}/scripts/browser_probe.py" "${RUNTIME_SCRIPTS_DIR}/"
cp "${PROJECT_ROOT}/scripts/browser_probe.cjs" "${RUNTIME_SCRIPTS_DIR}/"
find "${PROJECT_ROOT}/scripts/adapters" -maxdepth 1 -type f -name '*.py' -exec cp {} "${RUNTIME_ADAPTERS_DIR}/" \;
cp "${PROJECT_ROOT}/data/source-manifest.json" "${RUNTIME_DATA_DIR}/"

if [[ -f "${PROJECT_ROOT}/.env" ]]; then
  cp "${PROJECT_ROOT}/.env" "${RUNTIME_ROOT}/.env"
fi

if [[ -f "${PROJECT_ROOT}/.env.local" ]]; then
  cp "${PROJECT_ROOT}/.env.local" "${RUNTIME_ROOT}/.env.local"
fi

if [[ ! -f "$TARGET_DB_PATH" && -f "$SOURCE_DB_PATH" ]]; then
  cp "$SOURCE_DB_PATH" "$TARGET_DB_PATH"
fi

cat > "${RUNTIME_BROWSER_DIR}/package.json" <<'EOF'
{
  "name": "updatebeam-browser-runtime",
  "private": true,
  "dependencies": {
    "playwright": "1.58.2"
  }
}
EOF

if [[ ! -d "${RUNTIME_BROWSER_DIR}/node_modules/playwright" ]]; then
  (cd "${RUNTIME_BROWSER_DIR}" && npm install --silent)
fi

cat > "${RUNTIME_SCRIPTS_DIR}/run_monitoring_scheduler.sh" <<'EOF'
#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
CRAWL_LOG_FILE="$LOG_DIR/runtime-source-crawl.log"
SCHEDULER_LOG_FILE="$LOG_DIR/monitoring-scheduler.log"

mkdir -p "$LOG_DIR"
cd "$SCRIPT_DIR"

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
    python3 run_source_crawl.py
}

run_digest_scheduler() {
  env \
    PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/tmp/openclaw-node/bin:${PATH:-}" \
    DATABASE_URL="${DATABASE_URL:-file:${HOME}/.updatebeam/dev.db}" \
    HASIL_MAX_LIST_PAGES="${HASIL_MAX_LIST_PAGES:-4}" \
    HASIL_MAX_DETAIL_PAGES="${HASIL_MAX_DETAIL_PAGES:-12}" \
    HASIL_FETCH_TIMEOUT="${HASIL_FETCH_TIMEOUT:-8}" \
    python3 monitoring_digest_scheduler.py
}

crawl_rc=0
digest_rc=0

run_stage "source crawl" "$CRAWL_LOG_FILE" run_source_crawl || crawl_rc=$?
run_stage "digest scheduler" "$SCHEDULER_LOG_FILE" run_digest_scheduler || digest_rc=$?

if [ "$crawl_rc" -ne 0 ]; then
  exit "$crawl_rc"
fi

exit "$digest_rc"
EOF

chmod +x "${RUNTIME_SCRIPTS_DIR}/run_monitoring_scheduler.sh"
chmod +x "${RUNTIME_SCRIPTS_DIR}/check_runtime.sh"
chmod +x "${RUNTIME_SCRIPTS_DIR}/check_local_runtime.sh"

cat > "${RUNTIME_SCRIPTS_DIR}/run_source_crawl.sh" <<'EOF'
#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
LOG_FILE="$LOG_DIR/runtime-source-crawl.log"

mkdir -p "$LOG_DIR"
cd "$SCRIPT_DIR"

TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S %z')"
echo "[$TIMESTAMP] Starting source crawl run" >> "$LOG_FILE"

if env \
  PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/tmp/openclaw-node/bin:${PATH:-}" \
  DATABASE_URL="${DATABASE_URL:-file:${HOME}/.updatebeam/dev.db}" \
  HASIL_MAX_LIST_PAGES="${HASIL_MAX_LIST_PAGES:-4}" \
  HASIL_MAX_DETAIL_PAGES="${HASIL_MAX_DETAIL_PAGES:-12}" \
  HASIL_FETCH_TIMEOUT="${HASIL_FETCH_TIMEOUT:-8}" \
  python3 run_source_crawl.py >> "$LOG_FILE" 2>&1; then
  TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "[$TIMESTAMP] Finished source crawl run status=0" >> "$LOG_FILE"
  exit 0
else
  CRAWL_RC=$?
  TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S %z')"
  echo "[$TIMESTAMP] Finished source crawl run status=${CRAWL_RC}" >> "$LOG_FILE"
  exit "$CRAWL_RC"
fi
EOF

chmod +x "${RUNTIME_SCRIPTS_DIR}/run_source_crawl.sh"

cat > "$LAUNCH_AGENT_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.updatebeam.monitoring-scheduler</string>
  <key>ProgramArguments</key>
  <array>
    <string>${RUNTIME_SCRIPTS_DIR}/run_monitoring_scheduler.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${RUNTIME_ROOT}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>DATABASE_URL</key>
    <string>file:${TARGET_DB_PATH}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>StartInterval</key>
  <integer>900</integer>
  <key>StandardOutPath</key>
  <string>${RUNTIME_ROOT}/logs/launchd-monitoring-scheduler.log</string>
  <key>StandardErrorPath</key>
  <string>${RUNTIME_ROOT}/logs/launchd-monitoring-scheduler-error.log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/com.updatebeam.monitoring-scheduler" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$LAUNCH_AGENT_PLIST"
launchctl kickstart -k "gui/$(id -u)/com.updatebeam.monitoring-scheduler" >/dev/null 2>&1 || true

printf 'Synced monitoring runtime to %s\n' "$RUNTIME_ROOT"
printf 'Installed launchd job: %s\n' "$LAUNCH_AGENT_PLIST"
printf 'Launchd status:\n'
launchctl print "gui/$(id -u)/com.updatebeam.monitoring-scheduler" | sed -n '1,20p'
