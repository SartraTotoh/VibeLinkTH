import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { Plan, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type BillingSnapshot = {
  providerRef: string;
  customerRef: string;
  plan: Plan;
  status: SubscriptionStatus;
  startedAt: Date;
  expiresAt: Date;
  stripeStatus: string;
  priceRef: string | null;
  latestInvoiceRef: string | null;
  cancelAtPeriodEnd: boolean;
  pendingReason: string | null;
};

export async function receiveBillingEvent(event: {
  id: string; type: string; created: number; livemode: boolean;
}, providerRef: string) {
  await prisma.$executeRaw`
    INSERT INTO "BillingWebhookEvent" ("id", "type", "providerRef", "livemode", "providerCreatedAt", "receivedAt")
    VALUES (${event.id}, ${event.type}, ${providerRef}, ${event.livemode}, ${new Date(event.created * 1000)}, timezone('UTC', CURRENT_TIMESTAMP))
    ON CONFLICT ("id") DO NOTHING`;
  const rows = await prisma.$queryRaw<{ processedAt: Date | null }[]>`
    SELECT "processedAt" FROM "BillingWebhookEvent" WHERE "id" = ${event.id}
      AND "providerRef" = ${providerRef} AND "type" = ${event.type} AND "livemode" = ${event.livemode}`;
  if (!rows.length) throw new Error("BILLING_EVENT_ID_CONFLICT");
  return rows[0].processedAt !== null;
}

export async function billingEventProcessed(id: string) {
  const rows = await prisma.$queryRaw<{ processedAt: Date | null }[]>`
    SELECT "processedAt" FROM "BillingWebhookEvent" WHERE "id" = ${id}`;
  return rows[0]?.processedAt != null;
}

export async function acquireBillingLease(userId: string) {
  const token = randomUUID();
  const rows = await prisma.$queryRaw<{ token: string }[]>`
    INSERT INTO "BillingSyncLease" ("userId", "token", "expiresAt")
    SELECT "id", ${token}, timezone('UTC', CURRENT_TIMESTAMP) + INTERVAL '60 seconds'
    FROM "User" WHERE "id" = ${userId}
    ON CONFLICT ("userId") DO UPDATE
      SET "token" = EXCLUDED."token", "expiresAt" = EXCLUDED."expiresAt"
      WHERE "BillingSyncLease"."expiresAt" <= timezone('UTC', CURRENT_TIMESTAMP)
    RETURNING "token"`;
  if (!rows.length) throw new Error("BILLING_SYNC_BUSY_OR_USER_MISSING");
  return token;
}

export async function releaseBillingLease(userId: string, token: string) {
  await prisma.$executeRaw`
    DELETE FROM "BillingSyncLease" WHERE "userId" = ${userId} AND "token" = ${token}`;
}

// One PostgreSQL statement is atomic, including CTE side effects. Neon HTTP
// cannot start interactive transactions. All writes depend on the fenced lease
// and unprocessed receipt; a failure rolls back Subscription + User + ack.
export async function commitBillingSnapshot(
  userId: string, token: string, eventId: string, snapshot: BillingSnapshot,
  outcome: string,
) {
  const s = snapshot;
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    WITH locked AS (
      UPDATE "BillingSyncLease" SET "token" = "token"
      WHERE "userId" = ${userId} AND "token" = ${token} AND "expiresAt" > timezone('UTC', CURRENT_TIMESTAMP)
        AND EXISTS (SELECT 1 FROM "BillingWebhookEvent" WHERE "id" = ${eventId} AND "processedAt" IS NULL)
      RETURNING "userId"
    ), saved_subscription AS (
      INSERT INTO "Subscription" (
        "id", "userId", "plan", "status", "startedAt", "expiresAt", "providerRef", "customerRef",
        "stripeStatus", "priceRef", "latestInvoiceRef", "cancelAtPeriodEnd", "syncedAt", "lastEventId", "pendingReason"
      ) SELECT ${randomUUID()}, "userId", ${s.plan}::"Plan", ${s.status}::"SubscriptionStatus",
        ${s.startedAt}, ${s.expiresAt}, ${s.providerRef}, ${s.customerRef}, ${s.stripeStatus},
        ${s.priceRef}, ${s.latestInvoiceRef}, ${s.cancelAtPeriodEnd}, timezone('UTC', CURRENT_TIMESTAMP), ${eventId}, ${s.pendingReason}
      FROM locked
      ON CONFLICT ("userId") DO UPDATE SET
        "plan" = EXCLUDED."plan", "status" = EXCLUDED."status", "startedAt" = EXCLUDED."startedAt",
        "expiresAt" = EXCLUDED."expiresAt", "providerRef" = EXCLUDED."providerRef",
        "customerRef" = EXCLUDED."customerRef", "stripeStatus" = EXCLUDED."stripeStatus",
        "priceRef" = EXCLUDED."priceRef", "latestInvoiceRef" = EXCLUDED."latestInvoiceRef",
        "cancelAtPeriodEnd" = EXCLUDED."cancelAtPeriodEnd", "syncedAt" = EXCLUDED."syncedAt",
        "lastEventId" = EXCLUDED."lastEventId", "pendingReason" = EXCLUDED."pendingReason"
      RETURNING "userId"
    ), saved_user AS (
      UPDATE "User" SET "plan" = ${s.plan}::"Plan", "updatedAt" = timezone('UTC', CURRENT_TIMESTAMP)
      WHERE "id" IN (SELECT "userId" FROM saved_subscription) RETURNING "id"
    ), acknowledged AS (
      UPDATE "BillingWebhookEvent" SET "processedAt" = timezone('UTC', CURRENT_TIMESTAMP), "outcome" = ${outcome}
      WHERE "id" = ${eventId} AND EXISTS (SELECT 1 FROM saved_user) RETURNING "id"
    ) SELECT "id" FROM acknowledged`);
  if (rows.length !== 1) throw new Error("BILLING_SYNC_LEASE_LOST");
}
