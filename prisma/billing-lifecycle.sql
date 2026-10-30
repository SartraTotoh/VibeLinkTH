-- Additive upgrade for the existing db-push-managed database. Apply only in a
-- separately approved release, after the preflight in docs/billing-lifecycle.md.
-- Duplicate bindings deliberately abort the whole upgrade; do not auto-delete.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_providerRef_key" ON "Subscription" ("providerRef");
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_customerRef_key" ON "Subscription" ("customerRef");
ALTER TABLE "Subscription"
  ADD COLUMN IF NOT EXISTS "stripeStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "priceRef" TEXT,
  ADD COLUMN IF NOT EXISTS "latestInvoiceRef" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "syncedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastEventId" TEXT,
  ADD COLUMN IF NOT EXISTS "pendingReason" TEXT;
CREATE TABLE IF NOT EXISTS "BillingSyncLease" (
  "userId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE IF NOT EXISTS "BillingWebhookEvent" (
  "id" TEXT PRIMARY KEY,
  "type" TEXT NOT NULL,
  "providerRef" TEXT NOT NULL,
  "livemode" BOOLEAN NOT NULL,
  "providerCreatedAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT timezone('UTC', CURRENT_TIMESTAMP),
  "processedAt" TIMESTAMP(3),
  "outcome" TEXT
);
CREATE INDEX IF NOT EXISTS "BillingWebhookEvent_processedAt_receivedAt_idx"
  ON "BillingWebhookEvent" ("processedAt", "receivedAt");
COMMIT;
