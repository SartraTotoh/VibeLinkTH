# Stripe billing lifecycle — 30 October 2026

## Outcome and scope

แก้ไขบน branch แยกจาก main `0355149a3bfb6cb372e1dde949cace07867948ed` โดยไม่ทำธุรกรรมจริง ไม่เปลี่ยน Stripe Production Configuration ไม่ Merge และไม่ Deploy

Paid access now requires a freshly retrieved active Stripe subscription, a known current Price ID, and a paid latest invoice covering that exact subscription item and the current period. Checkout metadata and the order of webhook delivery do not grant plans. The change also repairs the previously reversed price-to-plan lookup.

## Access policy

| Verified Stripe state | Application access |
| --- | --- |
| `active`, latest invoice `paid`, amount remaining zero, matching customer/subscription/price/item and current coverage | Mapped plan until the earliest of the subscription item's period end, paid invoice line period end, and `cancel_at` |
| Checkout completed but invoice unpaid or subscription incomplete | FREE; await reconciliation triggered by a later invoice/subscription/async Checkout event |
| `trialing`, `incomplete`, `incomplete_expired`, `past_due`, `unpaid`, `paused` | FREE; this integration does not currently sell a trial or promise a payment grace period |
| `canceled` | FREE, local status CANCELED; revocation does not require retrieving the historical invoice |
| Scheduled cancellation while active and paid | Retain access only within verified paid coverage; expire on reads even if the ending webhook is missing |
| Active subscription with `pause_collection` | FREE |
| Unknown, missing, duplicate or unsupported Price mapping; multi-item or quantity other than one | FREE with a recorded reason; never reuse a previous plan as a fallback |
| Paid invoice of zero after a discount or customer credit | Allowed if all ownership, price and period checks still pass |
| Invoice marked paid out of band in Stripe | Treated as paid by Stripe; the application does not independently attest to bank settlement |

`CREATOR` must match the configured price, THB 199/month as defined in `lib/plans.ts`, licensed/per-unit billing and quantity one. An explicitly configured `CREATOR_PLUS` price may reconcile existing subscriptions if recurring monthly THB with a positive amount; no published Plus amount exists to cross-check. Creator Plus checkout remains disabled. Archived prices can still cover existing paid subscriptions; new checkout requires an active price.

`Subscription.plan` stores the effective entitlement, including FREE when denied; `priceRef`, `stripeStatus`, `latestInvoiceRef` and `pendingReason` preserve the reason. `User.plan` is updated atomically as a reporting cache. Authorization and refreshed JWT plan claims read `getActivePlan`, which requires a verified subscription and finite unexpired coverage and never falls back to `User.plan`.

## Event processing and failure recovery

1. Verify the raw request signature with Stripe's asynchronous crypto API, compatible with the Workers runtime. Missing endpoint configuration returns 503; invalid signatures return 400. Match test/live mode and reject connected-account events for this single-account integration.
2. Record a durable receipt keyed by Event ID. Successful repeats return without calling Stripe or applying writes. Different IDs describing the same state are harmless reconciliations. Unhandled events and one-off invoices do not grant subscriptions.
3. Resolve ownership through the exact persisted subscription binding, server-set subscription metadata, or one exact legacy Checkout session. Conflicting or unresolved identity remains unacknowledged and returns 500 for retry. Email is never an identity join.
4. Acquire a database lease per user before fetching any entitlement state from Stripe. A pre-lease API read, if required, is used only for routing. Fetch the subscription again after acquiring the lease, then retrieve its current latest invoice. Incoming payload snapshots and second-resolution Event timestamps never determine the resulting entitlement. Provider timestamps remain in the receipt for audit.
5. If another subscription is already tracked, keep that subscription while it is nonterminal. An old cancellation or a second live subscription cannot replace it. Permit replacement only after the tracked subscription is terminal and the incoming one is not. This deliberately requires operator resolution of multiple live subscriptions; it does not cancel or refund them.
6. Persist Subscription, User.plan and receipt acknowledgement in one parameterized PostgreSQL CTE statement. Each write depends on the preceding result and the current unexpired lease token. Constraint errors, failed User updates or failed acknowledgement roll back the entire statement. No interactive transaction is required by the Neon HTTP adapter.
7. Release only the same lease token. A busy user returns a retryable 500. A crashed worker's 60-second lease expires; an expired token cannot commit or clear a replacement token. Stripe reads have a 10-second per-request timeout and no SDK retries. Processing errors expose neither payloads nor Stripe/database connection details.

No webhook timestamp cutoff is used: an older event may be the useful retry for a partial failure, and Stripe timestamps are not a complete ordering of state. The lease plus fresh retrieval prevents workers from applying previously fetched state over a later committed reconciliation. A Stripe change occurring after retrieval remains eventually consistent and requires its next webhook or an operator reconciliation.

Checkout adds `subscription_data.metadata.userId`, reuses a previously linked customer, validates the price before creating a session, and rejects a new checkout when the known Stripe subscription is nonterminal. A 30-minute-bucket idempotency key reduces retries creating duplicate sessions; simultaneous/unbound sessions across buckets can still create multiple subscriptions in Stripe. They never independently overwrite the tracked application's package. No automated duplicate-subscription cancellation, refund or money-moving repair is included.

## Regression evidence

`tests/fixtures/billing/stripe-test.json` is synthetic test-mode data shaped for the pinned Stripe SDK API `2026-08-26.dahlia`. It contains no customer or payment data from a real account. Tests block unexpected fetch calls. No Stripe sandbox or live account was contacted, and no Stripe CLI payment was generated.

`tests/billing.test.ts` replaces Prisma's transport with PGlite, a local PostgreSQL WASM engine. It executes the production parameterized persistence statements and the additive SQL upgrade, including actual constraints, CTE effects and rollback. Its timestamp parser matches Prisma's UTC interpretation rather than the host timezone. The tests do not mock transaction success or roll back a JavaScript object to simulate a database.

| Area | Scenarios covered |
| --- | --- |
| Initial payment and price authority | Unpaid invoice despite active subscription/paid Checkout; hostile or stale plan metadata; reverse mapping; zero paid invoice with promotion |
| Ownership and arrival order | Subscription update before Checkout; legacy no-metadata resolution; missing owner remains retryable; conflicting users/customers rejected |
| Replay and reordering | Same Event ID; separate IDs for one fact; stale active payload after cancellation; equal-second failed invoice after paid state |
| Delayed payment and renewal | Incomplete → async success; late async failure after success; renewal failure → recovery |
| Cancellation and expiry | All seven non-active statuses; scheduled cancellation; expiry without a webhook; cancellation despite unavailable old invoice |
| Price and invoice validation | Unknown/missing/duplicate mapping; wrong currency/amount/interval; multi-item/quantity; paused collection; expired paid period; truncated invoice lines; wrong invoice ID/customer/subscription/price/mode; credit line; partially unpaid invoice |
| Plan changes and multiple subscriptions | Unpaid price change cannot upgrade; paid new-price coverage upgrades; old cancellation cannot replace new active subscription; second live subscription cannot replace tracked one; terminal subscription can be replaced |
| Database recovery | Actual PostgreSQL failures during User update and receipt acknowledgement; atomic rollback and retry; unique bindings; busy lease; overlapping deliveries; expired worker fencing |
| Legacy and operations | Stale User.plan never grants access; unverified legacy row denied; internal reconciliation repairs legacy/mapping changes without weakening replay deduplication |
| Signature/HTTP contract | Genuine generated Stripe signature; missing/invalid/stale/tampered signatures; unavailable configuration; sanitized retryable processing failures |
| Schema upgrade | Repeated additive upgrade is safe; duplicate legacy provider bindings abort the whole upgrade |

Reproduce locally:

Local results: **69 Billing/signature regression cases and 4 Prisma Worker packaging cases passed; 213 total tests passed across 21 files.** Prisma generation, TypeScript typecheck, charset scan, tracked-file security scan, Next.js production build and the complete Cloudflare build command passed. These are local results, separate from GitHub CI or production acceptance.

The Cloudflare build initially exposed a loader shape unsupported by the repository's Prisma patch script. `scripts/patch-opennext-prisma.mjs` now handles both the Node fs loader and Prisma's promised Worker WASM namespace, converts build-machine paths to a static relative WASM import, preserves repeated-run safety, and rejects unknown loader shapes. Four focused packaging tests cover these behaviors.

The build still reports six existing lint warnings in unrelated UI files (five image warnings and one ARIA option warning). OpenNext also warns about the pinned Next.js 15 version's support status and an unrelated generated QR schema expression. Framework upgrades and QR changes are outside this Billing patch.

```sh
npm ci
npm run db:generate
npm run test:unit
npm run typecheck
npm run check:charset
npm run check:security
# Build with throwaway local-only environment values, never a production DB URL.
npm run build
npm run cf:build
```

## Release preparation — not executed against production

This repository currently uses `prisma db push` and has no baseline Prisma migration history. `prisma/billing-lifecycle.sql` is an additive, transactional upgrade for that existing schema; it does not create or assume a new migration history. Do not run `prisma migrate deploy` against an unbaselined production database for this change.

Before a later authorized release:

1. Back up the database and run the following read-only preflight in a controlled environment. Resolve duplicate/missing bindings with verified Stripe evidence; never auto-delete subscriptions to make an index pass.
2. Apply the reviewed additive SQL to an isolated staging copy and generate the Prisma client from the new schema. Test through the actual Neon HTTP/Cloudflare runtime and Stripe **test mode**, including webhook delivery/retry behavior.
3. Reconcile legacy provider IDs with `reconcileBillingSubscription(providerRef)` from a trusted server/operator process containing this branch's code. It has no public HTTP endpoint. It makes Stripe GET requests and writes only the local billing state, with a fresh `reconcile_...` receipt of type `billing.subscription.reconcile`. It neither creates charges nor changes/cancels Stripe subscriptions. Reconcile only explicit verified IDs; a legacy paid row with no provider ID requires owner investigation.
4. Audit receipt outcomes and compare Subscription.plan against User.plan. Resolve ownership/mapping/duplicate-subscription exceptions. The new reader deliberately returns FREE for old rows lacking `syncedAt` or finite paid coverage, so complete verified legacy reconciliation before routing paid users to it.
5. Separately verify the production account identity, environment price IDs and endpoint signing secret; compare the actual Prices to the policy. Verify endpoint event selection includes the supported Checkout, subscription and invoice events listed in `lib/billing.ts`. No selection, key, Price, portal or other Stripe configuration was changed here.
6. A later deployment requires explicit authorization. This branch does not merge, run migrations on production or deploy any application.

```sql
SELECT "providerRef", COUNT(*) FROM "Subscription"
WHERE "providerRef" IS NOT NULL GROUP BY "providerRef" HAVING COUNT(*) > 1;
SELECT "customerRef", COUNT(*) FROM "Subscription"
WHERE "customerRef" IS NOT NULL GROUP BY "customerRef" HAVING COUNT(*) > 1;
SELECT "userId", "plan", "status", "providerRef", "customerRef"
FROM "Subscription" WHERE "providerRef" IS NULL OR "customerRef" IS NULL;
-- After the additive upgrade/reconciliation:
SELECT s."userId", s."plan" AS subscription_plan, u."plan" AS cached_plan,
       s."status", s."stripeStatus", s."expiresAt", s."pendingReason"
FROM "Subscription" s JOIN "User" u ON u."id" = s."userId"
WHERE s."plan" <> u."plan" OR s."syncedAt" IS NULL OR s."pendingReason" IS NOT NULL;
SELECT "id", "type", "providerRef", "receivedAt", "outcome"
FROM "BillingWebhookEvent"
WHERE "processedAt" IS NULL OR "outcome" = 'other_subscription_ignored'
ORDER BY "receivedAt";
```

## Remaining verification limits

Production account configuration, real account bindings and actual Stripe deliveries are unverified. Tests prove behavior against synthetic fixtures and a local PostgreSQL engine; PGlite uses one local database process, so lease/token invariants and overlapping handlers are covered but a distributed multi-host contention/load test on Neon is still required. Local Wrangler/Workers execution was attempted with dummy keys and a loopback-only database, but the environment stopped startup with `uv_interface_addresses ... Unknown system error 1`; no runtime HTTP request could be exercised. The Cloudflare bundle passed, while actual Worker/Neon execution remains a staging verification item. This work does not prove bank settlement or production acceptance.

Webhook/Stripe/database outages can leave the last verified entitlement until a retry or its finite paid expiry; no code can record an immediate revocation while the database itself is unavailable. No background queue or scheduled reconciliation service was created. Pending receipts must be monitored and repaired with replay/internal reconciliation if provider retries are exhausted. Receipt retention is intentionally not pruned in this change so delayed redelivery remains deduplicated. Admin reporting caches may remain paid past expiry until reconciliation; authorization applies the expiry immediately.

## Primary references

- [Stripe webhook ordering, signatures and duplicates](https://docs.stripe.com/webhooks)
- [Stripe subscription webhook lifecycle](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Stripe subscription object and scheduled cancellation](https://docs.stripe.com/api/subscriptions/object)
- [PostgreSQL data-modifying CTEs](https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-MODIFYING)
- The installed `@prisma/adapter-neon` HTTP adapter explicitly rejects `startTransaction`; this change uses one atomic SQL statement instead.
