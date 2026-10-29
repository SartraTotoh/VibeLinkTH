# Live alpha activation and recovery

The code ships with cloud transport disabled. Local rehearsal needs no external service. This runbook describes the remaining runtime setup, not completed production acceptance.

## Existing application integration

Keep the latest `fix/pitch-support-analytics` changes when integrating this branch. Do not replace the existing production application with the older main snapshot. The new code depends on livekit-client 2.23.0 and livekit-server-sdk 2.19.2 (locked in package-lock.json).

1. Back up the target database and apply `prisma/live-schema.sql` through the existing database deployment workflow. This adds three tables and a partial unique index permitting one open show per user. Prisma schema/client generation alone is not sufficient to create that partial index. Do not mark schema-ready before the complete SQL is applied.
2. Configure `LIVEKIT_URL` as a WSS project URL and set `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` as server runtime secrets. Never add these to NEXT_PUBLIC variables or Git.
3. Set `LIVE_RTMP_HOSTS` to exact ingest hostnames for the test destination. URLs with userinfo, query strings, arbitrary ports, IPs, or unapproved hosts are rejected. This is transport-only access; it does not connect comments, orders or shopping baskets.
4. Configure the provider's signed webhook to POST `/api/live/webhook`. The raw body, signature and body checksum are verified. Test invalid and tampered signatures before acceptance.
5. Configure a once-per-minute authenticated POST to `/api/cron/live` using `CRON_SECRET`. Verify a missing/wrong token is rejected and that stale/expired test rooms are stopped. A secret's presence alone does not prove that the scheduler is running.
6. Only after those checks set `LIVE_SCHEMA_READY=true`, `LIVE_WATCHDOG_READY=true` and `LIVE_TRANSPORT_ENABLED=true`. Access remains restricted to the existing ADMIN_EMAILS allowlist. Stop and reconciliation must remain available while disabling new starts; leave media credentials/schema in place until every open room is confirmed closed.

## Acceptance

Open `/live` with an authorized test account. Connect one browser-visible video source and a separately selected audio input. Record locally and play the file. Check both aspect ratios, product overlays, external-program mode and independent audio mute. Repeat with a supported USB capture/switcher and a second optional video source. Do not advertise hardware models or mobile browser compatibility before testing them.

Create a server show with the same aspect ratio. Open the cloud room, verify the published Program tracks, then enter an approved RTMP server URL and its Stream Key to request output once. Check the real destination viewer page for picture and sound, scene changes and overlays. The app's sending status proves provider transport evidence only; a destination may require its own publish action.

Stop and close the show. Verify the provider job and room actually ended, then download the server summary. Compare its provider timestamps with the provider dashboard and the test recording. Verify duplicate start/stop requests, tab close, network loss, failed destination, invalid key, delayed provider replies and repeated/out-of-order webhooks. Confirm the watchdog closes an abandoned room and enforces the 15-minute room limit (plus up to one scheduling interval and provider shutdown time).

The watchdog processes up to 20 stale rooms per run. The alpha permits one open show per user, but many admins can still create load; increase watchdog capacity or concurrency only after measuring the provider/runtime limits. Closed records are required before account deletion so cloud resources cannot be orphaned.

## Uncertain outcomes

Never retry a timed-out start with a new request ID or clear its reservation. Reconcile the provider's job list for that room and the reserved track IDs. UNKNOWN is intentionally unresolved until provider evidence is available. If no job can be associated, inspect the provider dashboard and room before any manual repair. Do not assert zero cost or resource shutdown from missing client playback.

A stop records intent before calling the provider. The UI stops local publication, then polls for server confirmation. Signed callbacks and the watchdog also honor pending stops. Terminal provider evidence and successful room deletion are required before closedAt is set. Do not delete or bypass the reservation to make the UI look successful.

## Timing and charges

The client rehearsal duration is separate from server/provider evidence. Server summaries report only sanitized fields; the output table has one row per show and accepted event IDs are unique. Provider processing time, RTMP transport time, actual viewer publication and customer billing are separate concepts. This release implements no rates, credits, invoices, payment collection, cloud recordings or storage charges. Validate those separately before offering a paid service.

## API surface

| Route | Purpose |
| --- | --- |
| GET /api/live/config | Authenticated capability readiness without credentials |
| GET or POST /api/live/shows | Owner-scoped recent shows or idempotent creation |
| GET /api/live/shows/id | Read and reconcile output status |
| POST /api/live/shows/id/connect | Single-room, short-lived Program publisher token |
| POST /api/live/shows/id/heartbeat | Renew the owner-scoped room lease |
| POST /api/live/shows/id/output | Verify program tracks, reserve and request one output |
| POST /api/live/shows/id/stop | Durable stop, provider reconciliation and room closure |
| POST /api/live/webhook | Verify provider signature/checksum and accept sanitized events |
| POST /api/cron/live | Secret-authenticated expiry and pending-close cleanup |

Browser mutations require same-origin JSON; API reads/mutations require authentication, ownership and database-backed quotas. The owner can stop an existing show even after new-start access is disabled. Cloud endpoints return unavailable until configured rather than reporting simulated success.
