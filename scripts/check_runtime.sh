#!/bin/sh
set -eu

BASE_URL="${1:-${NEXT_PUBLIC_APP_URL:-${APP_URL:-http://127.0.0.1:3000}}}"
BASE_URL="${BASE_URL%/}"

check() {
  NAME="$1"
  PATHNAME="$2"

  STATUS="$(curl -s -o /tmp/updatebeam_runtime_check_body.txt -w '%{http_code}' "${BASE_URL}${PATHNAME}")"
  if [ "$STATUS" -ge 200 ] && [ "$STATUS" -lt 400 ]; then
    printf 'OK   %-22s %s%s\n' "$NAME" "$BASE_URL" "$PATHNAME"
  else
    printf 'FAIL %-22s %s%s (HTTP %s)\n' "$NAME" "$BASE_URL" "$PATHNAME" "$STATUS"
    return 1
  fi
}

echo "Running UpdateBeam runtime checks against ${BASE_URL}"

check "homepage" "/"
check "sources" "/sources"
check "health" "/api/public/health"
check "manifest" "/manifest.webmanifest"
check "opengraph image" "/opengraph-image"
check "twitter image" "/twitter-image"
check "robots" "/robots.txt"
check "sitemap" "/sitemap.xml"

echo "Runtime checks completed."
