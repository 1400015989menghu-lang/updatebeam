# UpdateBeam Local Deployment SOP

This document is the shortest path to a working local UpdateBeam installation on this Mac.

## Runtime truth

The formal local runtime lives in:

- `~/.updatebeam/dev.db`
- `~/.updatebeam/scripts/run_monitoring_scheduler.sh`
- `~/.updatebeam/logs/runtime-source-crawl.log`
- `~/.updatebeam/logs/monitoring-scheduler.log`

The repo copy inside `Documents` is the development workspace. The installed local scheduler must point at `~/.updatebeam`, not at repo-local scripts or `prisma/dev.db`.

## 1. Prepare environment

At minimum, set these variables in `.env`:

```env
DATABASE_URL=file:/Users/yourname/.updatebeam/dev.db
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
APP_URL=http://127.0.0.1:3000
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAIL_FROM=briefing@updates.updatebeam.com
MAIL_FROM_NAME=UpdateBeam
HASIL_MAX_LIST_PAGES=4
HASIL_MAX_DETAIL_PAGES=12
HASIL_FETCH_TIMEOUT=8
```

## 2. Install dependencies

```bash
npm install
```

## 3. Prepare the runtime database

```bash
mkdir -p "$HOME/.updatebeam"
rm -f "$HOME/.updatebeam/dev.db"
DATABASE_URL="file:${HOME}/.updatebeam/dev.db" npx prisma migrate deploy
DATABASE_URL="file:${HOME}/.updatebeam/dev.db" node prisma/seed.mjs
```

## 4. Build the app

```bash
npm run build
```

## 5. Install and reload the local runtime

```bash
./scripts/sync_monitoring_runtime.sh
```

This one command will:

- sync scripts, adapters, manifest, and env files into `~/.updatebeam`
- write `~/Library/LaunchAgents/com.updatebeam.monitoring-scheduler.plist`
- reload and kickstart `launchd`

## 6. Start the web app

For local viewing:

```bash
npm run dev
```

Or for a local production-style run:

```bash
npm run start -- --hostname 0.0.0.0 --port 3000
```

## 7. Check that launchd is running

```bash
launchctl print gui/$(id -u)/com.updatebeam.monitoring-scheduler | sed -n '1,20p'
```

Expected result:

- the job exists
- `state = running`
- the loaded script path points at `~/.updatebeam/scripts/run_monitoring_scheduler.sh`

## 8. Check logs

```bash
tail -n 40 ~/.updatebeam/logs/runtime-source-crawl.log
tail -n 40 ~/.updatebeam/logs/monitoring-scheduler.log
```

What to look for:

- source crawl starts and finishes
- digest scheduler starts after crawl
- no repeated fatal tracebacks

## 9. Run the one-command local self-check

```bash
npm run check:local-runtime -- http://127.0.0.1:3000
```

This verifies:

- `launchd` is loaded and running
- the loaded plist points at the runtime script
- runtime logs were updated recently
- `TrackedSource` count is non-zero
- automatic sources have public updates
- `lom-agc-my` latest status is `success`
- `mida-gov-my` latest status is `empty` and has no open review
- `customs-gov-my`, `kwsp-gov-my`, and `perkeso-gov-my` are `review_required`
- `/sources`, `/updates`, and `/sitemap.xml` respond successfully

## 10. Understand source states

- `Live for subscription`: already has public updates and can enter the automatic digest.
- `Coming soon`: already in the automated monitoring workflow, but no subscriber-ready public updates have been published yet.
- `Manual review only`: already tracked in the monitoring workflow, but current delivery still depends on manual review. These sources stay visible in the catalog and source profiles, but they do not enter the automatic digest.

## 11. If a source is locked in the UI

Look in the runtime database review queue:

```bash
sqlite3 "$HOME/.updatebeam/dev.db" 'select count(*) from "SourceReviewItem" where status = "open";'
sqlite3 "$HOME/.updatebeam/dev.db" 'select ts.slug, ri.queueReason, ri.summary from "SourceReviewItem" ri join "TrackedSource" ts on ts.id = ri.sourceId where ri.status = "open" order by ts.slug;'
```

That is the formal state source for review-only items and failed source runs.

## 12. Daily operator checklist

If you only want to know whether the local deployment is healthy today, run:

```bash
npm run build
npm run check:local-runtime -- http://127.0.0.1:3000
```

If both pass, the local UpdateBeam deployment is in a healthy state.
