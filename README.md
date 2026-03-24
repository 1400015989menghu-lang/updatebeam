# Open Claw Monitoring SaaS

This workspace is now focused on a single product:

- a public-facing monitoring SaaS for email subscriptions, source requests, feedback collection, and daily digest delivery

The public site is English-first and lives on the main routes:

- `/`
- `/how-it-works`
- `/manage`
- `/sources`
- `/request-a-source`
- `/feedback`
- `/privacy`
- `/terms`

## What Was Added

The SaaS implementation includes:

- email-only subscription flow with double opt-in
- self-serve manage links for changing sources, timezone, and delivery time
- per-subscriber delivery preferences in 15-minute increments
- public APIs for subscribe / confirm / unsubscribe
- public forms for source requests and product feedback
- tracked source registry backed by Prisma
- combined per-subscriber digest delivery logging
- SEO support via metadata helpers, sitemap, robots, and structured public routes
- HASiL as the first tracked source adapter

## Environment

Copy `.env.example` to `.env` and fill in the values you want to use locally:

```env
DATABASE_URL=file:/Users/yourname/.updatebeam/dev.db
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://localhost:3000
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAIL_FROM=briefing@updates.updatebeam.com
MAIL_FROM_NAME=UpdateBeam
MAIL_TO=1400015989menghu@gmail.com,kit.everfine@gmail.com,melissayee@yahoo.com
HASIL_MAX_LIST_PAGES=4
HASIL_MAX_DETAIL_PAGES=12
HASIL_FETCH_TIMEOUT=8
```

Notes:

- `DATABASE_URL` should point at `~/.updatebeam/dev.db` for both the web app and the local scheduler.
- `NEXT_PUBLIC_APP_URL` is used to build confirmation, management, and unsubscribe links.
- `APP_URL` can be set alongside `NEXT_PUBLIC_APP_URL` for server-side URL generation in production.
- `MAIL_FROM` must use a verified Resend sender/domain.
- subscriber delivery time is captured during signup and stored in the database.

## Local Setup

Install dependencies:

```bash
npm install
```

Run Prisma migration and seed:

```bash
mkdir -p "$HOME/.updatebeam"
rm -f "$HOME/.updatebeam/dev.db"
DATABASE_URL="file:${HOME}/.updatebeam/dev.db" npx prisma migrate deploy
DATABASE_URL="file:${HOME}/.updatebeam/dev.db" node prisma/seed.mjs
```

Install the formal local runtime and reload `launchd`:

```bash
./scripts/sync_monitoring_runtime.sh
```

This command is the single local deployment entry point. It:

- syncs scripts, adapters, manifest, and env files into `~/.updatebeam`
- keeps the runtime database at `~/.updatebeam/dev.db`
- rewrites `~/Library/LaunchAgents/com.updatebeam.monitoring-scheduler.plist`
- reloads and kickstarts `launchd`

Start the app:

```bash
npm run dev
```

Open:

- Public site: [http://localhost:3000](http://localhost:3000)

## Build Validation

Production build:

```bash
npm run build
```

Deployment / runtime check:

```bash
npm run check:deploy
npm run check:runtime -- http://localhost:3000
npm run check:local-runtime -- http://localhost:3000
```

The current implementation has been validated with a successful Next.js production build and Python syntax checks for the HASiL ingestion scripts.

## Public APIs

Implemented public endpoints:

- `GET /api/public/health`
- `POST /api/public/subscribe`
- `GET /api/public/subscribe/confirm`
- `GET /api/public/manage`
- `PATCH /api/public/manage`
- `POST /api/public/unsubscribe`
- `POST /api/public/source-submissions`
- `POST /api/public/feedback`
- `GET /api/public/sources`

## Scheduling and Digests

This repo now supports two layers:

- legacy source-level HASiL runner commands
- the new per-subscriber combined monitoring scheduler

The new scheduler polls every 15 minutes and sends one combined daily digest per active subscriber at the local time they chose during signup or later management.

Useful commands:

```bash
npm run hasil:brief -- --dry-run
npm run hasil:brief
npm run hasil:brief:auto
npm run monitoring:scheduler -- --dry-run --force --email you@example.com
```

Current behavior:

- groups all subscribed sources into one daily email per subscriber
- uses subscriber timezone + preferred delivery time
- retries one failed digest two hours later
- records delivery state in `SubscriberDigestDelivery`
- supports HASiL as the first production source adapter

## Production Readiness Checklist

Before pointing a real domain at the app, verify:

- `NEXT_PUBLIC_APP_URL` and `APP_URL` both use your production origin
- `MAIL_FROM` uses a verified Resend sender/domain
- `npm run check:deploy` passes
- `GET /api/public/health` returns `status: "ok"`
- the scheduler runtime can access the same `DATABASE_URL` used by the app
- the scheduler logs are writable in the deployed environment

For a full step-by-step deployment SOP, see:

- [DEPLOYMENT.md](/Users/menghu/Documents/01codex/02%20马来西亚/openclaw-M/DEPLOYMENT.md)

For local macOS scheduling, the repo script is only a development template. The formal runtime always runs from `~/.updatebeam`.

To sync and install the formal local runtime, use:

```bash
./scripts/sync_monitoring_runtime.sh
```

This creates:

- `~/.updatebeam/dev.db`
- `~/.updatebeam/.env`
- `~/.updatebeam/scripts/*.py`
- `~/.updatebeam/scripts/run_monitoring_scheduler.sh`
- `~/.updatebeam/scripts/check_local_runtime.sh`

The installed local scheduler should point at `~/.updatebeam/scripts/run_monitoring_scheduler.sh`, not the repo copy inside `Documents`.

Useful local runtime checks:

```bash
launchctl print gui/$(id -u)/com.updatebeam.monitoring-scheduler | sed -n '1,20p'
tail -n 40 ~/.updatebeam/logs/runtime-source-crawl.log
tail -n 40 ~/.updatebeam/logs/monitoring-scheduler.log
npm run check:local-runtime -- http://localhost:3000
```

If you need to understand why a source is locked in the UI:

- automatic sources can become live and subscribable after public updates are captured
- `review-only` sources stay visible in the catalog, but they currently require manual review and do not enter the automatic digest
- review queue evidence lives in `~/.updatebeam/dev.db` under `SourceReviewItem`

If the Python Resend package is missing:

```bash
python3 -m pip install --user resend
```
