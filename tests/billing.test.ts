import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { readFileSync } from "node:fs";
import fixture from "./fixtures/billing/stripe-test.json";

const state = vi.hoisted(() => ({ db: null as unknown as PGlite }));
vi.mock("@/lib/prisma", () => {
  // Execute the production parameterized SQL on PostgreSQL WASM, including
  // unique constraints, CTEs and rollback. Only Prisma's transport is replaced.
  const run = async (query: Prisma.Sql | TemplateStringsArray, ...values: unknown[]) => {
    const sql = Array.isArray(query) ? Prisma.sql(query as TemplateStringsArray, ...values) : query as Prisma.Sql;
    return state.db.query(sql.text, sql.values);
  };
  return { prisma: {
    $queryRaw: async (...args: Parameters<typeof run>) => (await run(...args)).rows,
    $executeRaw: async (...args: Parameters<typeof run>) => (await run(...args)).affectedRows,
    subscription: { findUnique: async ({ where }: { where: Record<string, string> }) => {
      const [field, value] = Object.entries(where)[0];
      if (!["userId", "providerRef", "customerRef"].includes(field)) throw new Error("unexpected query");
      const result = (await state.db.query<Record<string, unknown>>(`SELECT * FROM "Subscription" WHERE "${field}" = $1`, [value])).rows[0];
      if (!result) return null;
      // Prisma's model mapper returns Date objects for timestamp columns.
      for (const dateField of ["startedAt", "expiresAt", "syncedAt"]) {
        if (typeof result[dateField] === "string") result[dateField] = new Date(result[dateField]);
      }
      return result;
    } },
  } };
});

import { handleBillingEvent, stripe, createCheckoutSession, reconcileBillingSubscription } from "@/lib/billing";
import { getActivePlan } from "@/lib/subscription";
import { acquireBillingLease, commitBillingSnapshot, receiveBillingEvent, releaseBillingLease } from "@/lib/billing-store";
import { priceIdOf, subscriptionSnapshot } from "@/lib/billing-policy";

let sub: Stripe.Subscription;
let invoice: Stripe.Invoice;
let session: Stripe.Checkout.Session;
let subscriptionRead: ReturnType<typeof vi.spyOn>;
let serial = 0;
function event(type = "customer.subscription.updated", object: unknown = sub, id = `evt_test${++serial}`, created = 1793361600) {
  return { id, object: "event", type, created, livemode: false, data: { object } } as Stripe.Event;
}
async function row(table: string, field = "userId", id = "alice") {
  return (await state.db.query<Record<string, unknown>>(`SELECT * FROM "${table}" WHERE "${field}" = $1`, [id])).rows[0];
}
async function deliver(type?: string, object?: unknown, id?: string) {
  await handleBillingEvent(event(type, object, id));
}
async function plans() {
  return { cache: (await row("User", "id"))?.plan, entitlement: await getActivePlan("alice") };
}

beforeAll(async () => {
  // Prisma interprets timestamp-without-time-zone as UTC, independent of the
  // host timezone; override PGlite's local-time timestamp parser to match it.
  state.db = new PGlite({ parsers: { 1114: value => new Date(value + "Z") } });
  await state.db.exec(readFileSync(new URL("./fixtures/billing/legacy-schema.sql", import.meta.url), "utf8"));
  await state.db.exec(readFileSync(new URL("../prisma/billing-lifecycle.sql", import.meta.url), "utf8"));
}, 30_000);
afterAll(async () => { await state.db.close(); });
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-30T12:00:00Z"));
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
  vi.stubEnv("STRIPE_PRICE_CREATOR", "price_creator");
  vi.stubEnv("STRIPE_PRICE_CREATOR_PLUS", "price_plus");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("UNEXPECTED_NETWORK_IN_BILLING_TEST")));
  await state.db.exec('TRUNCATE "User", "Subscription", "BillingSyncLease", "BillingWebhookEvent" CASCADE');
  await state.db.exec(`INSERT INTO "User" ("id", "email", "passwordHash") VALUES
    ('alice', 'alice@example.test', 'unused'), ('bob', 'bob@example.test', 'unused')`);
  sub = structuredClone(fixture.subscription) as unknown as Stripe.Subscription;
  invoice = structuredClone(fixture.invoice) as unknown as Stripe.Invoice;
  session = structuredClone(fixture.session) as unknown as Stripe.Checkout.Session;
  subscriptionRead = vi.spyOn(stripe.subscriptions, "retrieve").mockImplementation(async () => structuredClone(sub) as never);
  vi.spyOn(stripe.invoices, "retrieve").mockImplementation(async () => structuredClone(invoice) as never);
  vi.spyOn(stripe.checkout.sessions, "retrieve").mockImplementation(async () => structuredClone(session) as never);
  vi.spyOn(stripe.checkout.sessions, "list").mockResolvedValue({ data: [session], has_more: false } as never);
  vi.spyOn(stripe.prices, "retrieve").mockImplementation(async () => structuredClone(sub.items.data[0].price) as never);
  vi.spyOn(stripe.checkout.sessions, "create").mockResolvedValue({ url: "https://checkout.example.test/session" } as never);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("Stripe billing lifecycle with offline fixtures and real PostgreSQL statements", () => {
  it("doesn't grant an active subscription with an unpaid latest invoice, even when Checkout says paid", async () => {
    invoice.status = "open"; invoice.amount_remaining = 19900;
    await deliver("checkout.session.completed", session);
    expect(await plans()).toEqual({ cache: "FREE", entitlement: "FREE" });
    expect((await row("Subscription")).pendingReason).toBe("invoice_unpaid");
  });

  it("maps the verified Price ID in the right direction and ignores metadata.plan", async () => {
    session.metadata = { userId: "alice", plan: "CREATOR_PLUS" };
    await deliver("checkout.session.completed", session);
    expect(await plans()).toEqual({ cache: "CREATOR", entitlement: "CREATOR" });
    expect((await row("Subscription")).plan).toBe("CREATOR");
  });

  it("handles subscription.updated before Checkout has created a local binding", async () => {
    await deliver();
    expect((await row("Subscription")).providerRef).toBe(sub.id);
    expect(await getActivePlan("alice")).toBe("CREATOR");
  });

  it("resolves legacy subscriptions without metadata through their exact Checkout session", async () => {
    sub.metadata = {};
    await deliver("invoice.paid", invoice);
    expect(subscriptionRead).toHaveBeenCalledTimes(2); // routing and post-lease state
    expect(await getActivePlan("alice")).toBe("CREATOR");
  });

  it("leaves unresolved ownership retryable instead of acknowledging lost work", async () => {
    sub.metadata = {};
    vi.mocked(stripe.checkout.sessions.list).mockResolvedValue({ data: [], has_more: false } as never);
    await expect(deliver("invoice.paid", invoice, "evt_unresolved")).rejects.toThrow("BILLING_OWNER_UNRESOLVED");
    expect((await row("BillingWebhookEvent", "id", "evt_unresolved")).processedAt).toBeNull();
    expect(await getActivePlan("alice")).toBe("FREE");
  });

  it("deduplicates Event IDs durably and doesn't call Stripe again on redelivery", async () => {
    await deliver(undefined, undefined, "evt_duplicate");
    const original = await row("Subscription");
    await deliver(undefined, undefined, "evt_duplicate");
    expect(subscriptionRead).toHaveBeenCalledTimes(1);
    expect(await row("Subscription")).toEqual(original);
    expect((await state.db.query('SELECT * FROM "BillingWebhookEvent"')).rows).toHaveLength(1);
  });

  it("handles separate Event IDs for the same fact without resetting the subscription start", async () => {
    await deliver();
    const startedAt = (await row("Subscription")).startedAt;
    await deliver("invoice.payment_succeeded", invoice);
    expect((await row("Subscription")).startedAt).toEqual(startedAt);
    expect(await getActivePlan("alice")).toBe("CREATOR");
  });

  it("never reactivates a cancellation from an old active payload arriving late", async () => {
    const oldActive = structuredClone(sub);
    await deliver();
    sub.status = "canceled";
    await deliver("customer.subscription.deleted", sub);
    await handleBillingEvent(event("customer.subscription.updated", oldActive, "evt_oldactive", 1));
    expect(await plans()).toEqual({ cache: "FREE", entitlement: "FREE" });
    expect((await row("Subscription")).status).toBe("CANCELED");
  });

  it("revokes a canceled subscription even if its old invoice can't be retrieved", async () => {
    await deliver();
    sub.status = "canceled";
    vi.mocked(stripe.invoices.retrieve).mockRejectedValue(new Error("old invoice unavailable"));
    await deliver("customer.subscription.deleted", sub);
    expect(await plans()).toEqual({ cache: "FREE", entitlement: "FREE" });
  });

  it("uses fresh Stripe state when old payment failures arrive with equal-second timestamps", async () => {
    const oldFailed = structuredClone(invoice); oldFailed.status = "open";
    await deliver("invoice.paid", invoice);
    await deliver("invoice.payment_failed", oldFailed);
    expect(await getActivePlan("alice")).toBe("CREATOR");
  });

  it("grants delayed payment only after a verified paid invoice and tolerates a late async failure", async () => {
    session.payment_status = "unpaid"; sub.status = "incomplete"; invoice.status = "open";
    await deliver("checkout.session.completed", session);
    expect(await getActivePlan("alice")).toBe("FREE");
    sub.status = "active"; invoice.status = "paid"; session.payment_status = "paid";
    await deliver("checkout.session.async_payment_succeeded", session);
    expect(await getActivePlan("alice")).toBe("CREATOR");
    await deliver("checkout.session.async_payment_failed", { ...session, payment_status: "unpaid" });
    expect(await getActivePlan("alice")).toBe("CREATOR");
  });

  it("recovers from a failed renewal without granting access during past_due", async () => {
    await deliver();
    sub.status = "past_due"; invoice.status = "open"; invoice.amount_remaining = 19900;
    await deliver("invoice.payment_failed", invoice);
    expect(await plans()).toEqual({ cache: "FREE", entitlement: "FREE" });
    sub.status = "active"; invoice.status = "paid"; invoice.amount_remaining = 0;
    await deliver("invoice.paid", invoice);
    expect(await getActivePlan("alice")).toBe("CREATOR");
  });

  it.each(["trialing", "incomplete", "incomplete_expired", "past_due", "unpaid", "paused", "canceled"])(
    "denies paid entitlement for %s even with a historically paid invoice", async status => {
      sub.status = status;
      await deliver();
      expect(await plans()).toEqual({ cache: "FREE", entitlement: "FREE" });
    });

  it("retains paid access for scheduled cancellation only until the verified coverage ends", async () => {
    sub.cancel_at_period_end = true;
    sub.cancel_at = Math.floor(Date.now() / 1000) + 3600;
    await deliver();
    expect(await getActivePlan("alice")).toBe("CREATOR");
    vi.setSystemTime(new Date((sub.cancel_at + 1) * 1000));
    expect(await getActivePlan("alice")).toBe("FREE"); // no webhook needed to expire
  });

  it("doesn't upgrade prices until the invoice covers the new price and subscription item", async () => {
    sub.items.data[0].price.id = "price_plus";
    sub.items.data[0].price.unit_amount = 39900;
    await deliver();
    expect(await getActivePlan("alice")).toBe("FREE");
    invoice.lines.data[0].pricing!.price_details!.price = "price_plus";
    invoice.lines.data[0].amount = 39900;
    invoice.amount_due = 39900; invoice.amount_paid = 39900;
    await deliver("invoice.paid", invoice);
    expect(await plans()).toEqual({ cache: "CREATOR_PLUS", entitlement: "CREATOR_PLUS" });
  });

  it.each(["unmapped", "duplicate_mapping", "missing_mapping", "wrong_currency", "wrong_amount", "yearly", "multi_item", "quantity", "paused_collection", "expired_period", "truncated_lines", "wrong_invoice_customer", "wrong_invoice_subscription", "wrong_invoice_price", "negative_credit", "partial_payment", "wrong_invoice_id", "wrong_invoice_mode"])(
    "fails closed for %s rather than preserving the previous package", async scenario => {
      await deliver();
      const price = sub.items.data[0].price;
      switch (scenario) {
        case "unmapped": price.id = "price_unknown"; break;
        case "duplicate_mapping": vi.stubEnv("STRIPE_PRICE_CREATOR_PLUS", "price_creator"); break;
        case "missing_mapping": vi.stubEnv("STRIPE_PRICE_CREATOR", ""); break;
        case "wrong_currency": price.currency = "usd"; break;
        case "wrong_amount": price.unit_amount = 1; break;
        case "yearly": price.recurring!.interval = "year"; break;
        case "multi_item": sub.items.data.push(structuredClone(sub.items.data[0])); break;
        case "quantity": sub.items.data[0].quantity = 2; break;
        case "paused_collection": sub.pause_collection = { behavior: "void", resumes_at: null }; break;
        case "expired_period": sub.items.data[0].current_period_end = 1; break;
        case "truncated_lines": invoice.lines.has_more = true; break;
        case "wrong_invoice_customer": invoice.customer = "cus_bob"; break;
        case "wrong_invoice_subscription": invoice.parent!.subscription_details!.subscription = "sub_other"; break;
        case "wrong_invoice_price": invoice.lines.data[0].pricing!.price_details!.price = "price_other"; break;
        case "negative_credit": invoice.lines.data[0].amount = -19900; break;
        case "partial_payment": invoice.amount_remaining = 1; break;
        case "wrong_invoice_id": invoice.id = "in_other"; break;
        case "wrong_invoice_mode": invoice.livemode = true; break;
      }
      await deliver();
      expect(await plans()).toEqual({ cache: "FREE", entitlement: "FREE" });
    });

  it("accepts a paid zero invoice for a valid promotional discount", async () => {
    invoice.amount_due = 0; invoice.amount_paid = 0; invoice.lines.data[0].amount = 0;
    session.payment_status = "no_payment_required";
    await deliver("checkout.session.completed", session);
    expect(await getActivePlan("alice")).toBe("CREATOR");
  });

  it("doesn't downgrade a new subscription when an older subscription's cancellation arrives", async () => {
    await deliver();
    const tracked = structuredClone(sub);
    sub = { ...sub, id: "sub_old", status: "canceled" };
    subscriptionRead.mockImplementation(async (id: string) => structuredClone(id === tracked.id ? tracked : sub));
    await deliver("customer.subscription.deleted", sub);
    expect((await row("Subscription")).providerRef).toBe(tracked.id);
    expect(await getActivePlan("alice")).toBe("CREATOR");
  });

  it("doesn't let a second live subscription replace a tracked nonterminal subscription", async () => {
    await deliver();
    const tracked = structuredClone(sub);
    sub = { ...sub, id: "sub_duplicate" };
    subscriptionRead.mockImplementation(async (id: string) => structuredClone(id === tracked.id ? tracked : sub));
    await deliver();
    expect((await row("Subscription")).providerRef).toBe(tracked.id);
  });

  it("allows a paid replacement after the previously tracked subscription ended", async () => {
    await deliver();
    const old = { ...structuredClone(sub), status: "canceled" };
    sub.id = "sub_replacement";
    invoice.parent!.subscription_details!.subscription = sub.id;
    invoice.lines.data[0].parent!.subscription_item_details!.subscription = sub.id;
    subscriptionRead.mockImplementation(async (id: string) => structuredClone(id === old.id ? old : sub));
    await deliver();
    expect((await row("Subscription")).providerRef).toBe(sub.id);
    expect(await getActivePlan("alice")).toBe("CREATOR");
  });

  it("rejects conflicting user ownership without transferring or granting a plan", async () => {
    await deliver();
    sub.metadata.userId = "bob";
    await expect(deliver()).rejects.toThrow("BILLING_OWNER_CONFLICT");
    expect(await getActivePlan("bob")).toBe("FREE");
  });

  it("rejects a Checkout bound to another customer", async () => {
    session.customer = "cus_wrong";
    await expect(deliver("checkout.session.completed", session)).rejects.toThrow("BILLING_CHECKOUT_BINDING_INVALID");
    expect(await getActivePlan("alice")).toBe("FREE");
  });

  it("enforces customer uniqueness across users", async () => {
    await deliver();
    sub.id = "sub_bob"; sub.metadata.userId = "bob";
    await expect(deliver()).rejects.toThrow("BILLING_OWNER_CONFLICT");
    expect(await getActivePlan("bob")).toBe("FREE");
  });

  it("rolls back subscription and event ack when the User cache write fails, then retries cleanly", async () => {
    await state.db.exec(`CREATE FUNCTION fail_cache() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'simulated user write failure'; END; $$;
      CREATE TRIGGER fail_cache BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION fail_cache();`);
    try {
      await expect(deliver(undefined, undefined, "evt_dbfailure")).rejects.toThrow("simulated user write failure");
      expect(await row("Subscription")).toBeUndefined();
      expect((await row("User", "id")).plan).toBe("FREE");
      expect((await row("BillingWebhookEvent", "id", "evt_dbfailure")).processedAt).toBeNull();
    } finally { await state.db.exec('DROP TRIGGER fail_cache ON "User"; DROP FUNCTION fail_cache();'); }
    await deliver(undefined, undefined, "evt_dbfailure");
    expect(await plans()).toEqual({ cache: "CREATOR", entitlement: "CREATOR" });
  });

  it("rolls back both plan writes when acknowledging the receipt fails", async () => {
    await state.db.exec(`CREATE FUNCTION fail_ack() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'simulated acknowledgement failure'; END; $$;
      CREATE TRIGGER fail_ack BEFORE UPDATE ON "BillingWebhookEvent" FOR EACH ROW EXECUTE FUNCTION fail_ack();`);
    try {
      await expect(deliver(undefined, undefined, "evt_ackfailure")).rejects.toThrow("simulated acknowledgement failure");
      expect(await row("Subscription")).toBeUndefined();
      expect((await row("User", "id")).plan).toBe("FREE");
      expect((await row("BillingWebhookEvent", "id", "evt_ackfailure")).processedAt).toBeNull();
    } finally { await state.db.exec('DROP TRIGGER fail_ack ON "BillingWebhookEvent"; DROP FUNCTION fail_ack();'); }
  });

  it("leaves Stripe read failures unacknowledged and retries successfully", async () => {
    subscriptionRead.mockRejectedValueOnce(new Error("simulated Stripe timeout"));
    await expect(deliver(undefined, undefined, "evt_timeout")).rejects.toThrow("simulated Stripe timeout");
    expect((await row("BillingWebhookEvent", "id", "evt_timeout")).processedAt).toBeNull();
    await deliver(undefined, undefined, "evt_timeout");
    expect(await getActivePlan("alice")).toBe("CREATOR");
  });

  it("serializes same-user workers and safely retries when a lease is busy", async () => {
    const token = await acquireBillingLease("alice");
    await expect(deliver(undefined, undefined, "evt_busy")).rejects.toThrow("BILLING_SYNC_BUSY_OR_USER_MISSING");
    expect(subscriptionRead).not.toHaveBeenCalled();
    await releaseBillingLease("alice", token);
    await deliver(undefined, undefined, "evt_busy");
    expect(await getActivePlan("alice")).toBe("CREATOR");
  });

  it("rejects overlapping same-user delivery while the first worker is reading Stripe", async () => {
    let entered!: () => void;
    let resume!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const resumeRead = new Promise<void>(resolve => { resume = resolve; });
    subscriptionRead.mockImplementationOnce(async () => { entered(); await resumeRead; return sub; });
    const first = deliver(undefined, undefined, "evt_concurrent1");
    await started;
    try {
      await expect(deliver(undefined, undefined, "evt_concurrent2")).rejects.toThrow("BILLING_SYNC_BUSY_OR_USER_MISSING");
    } finally { resume(); }
    await first;
    await deliver(undefined, undefined, "evt_concurrent2");
    expect(await plans()).toEqual({ cache: "CREATOR", entitlement: "CREATOR" });
  });

  it("fences an expired worker after a newer worker acquires the lease", async () => {
    const e = event(); await receiveBillingEvent(e, sub.id);
    const oldToken = await acquireBillingLease("alice");
    await state.db.exec('UPDATE "BillingSyncLease" SET "expiresAt" = CURRENT_TIMESTAMP - INTERVAL \'1 second\'');
    const newToken = await acquireBillingLease("alice");
    await releaseBillingLease("alice", oldToken);
    await expect(commitBillingSnapshot("alice", oldToken, e.id, subscriptionSnapshot(sub, invoice), "active_paid"))
      .rejects.toThrow("BILLING_SYNC_LEASE_LOST");
    expect(await row("Subscription")).toBeUndefined();
    await commitBillingSnapshot("alice", newToken, e.id, subscriptionSnapshot(sub, invoice), "active_paid");
    expect(await getActivePlan("alice")).toBe("CREATOR");
  });

  it("doesn't use a stale paid User.plan or an unverified legacy row for access", async () => {
    await state.db.exec(`UPDATE "User" SET "plan" = 'CREATOR' WHERE "id" = 'alice';
      INSERT INTO "Subscription" ("id", "userId", "plan", "status") VALUES ('legacy','alice','CREATOR','EXPIRED')`);
    expect(await getActivePlan("alice")).toBe("FREE");
    await state.db.exec(`UPDATE "Subscription" SET "status" = 'ACTIVE' WHERE "userId" = 'alice'`);
    expect(await getActivePlan("alice")).toBe("FREE");
  });

  it("repairs a legacy row with the internal reconciliation hook without Stripe writes", async () => {
    await state.db.exec(`INSERT INTO "Subscription" ("id", "userId", "plan", "status", "providerRef", "customerRef")
      VALUES ('legacy', 'alice', 'CREATOR_PLUS', 'ACTIVE', 'sub_creator', 'cus_alice')`);
    expect(await getActivePlan("alice")).toBe("FREE");
    await reconcileBillingSubscription(sub.id);
    expect(await plans()).toEqual({ cache: "CREATOR", entitlement: "CREATOR" });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    expect((await state.db.query<{ type: string }>('SELECT "type" FROM "BillingWebhookEvent"')).rows[0].type)
      .toBe("billing.subscription.reconcile");
  });

  it("reconciles after mapping repair without bypassing duplicate Event IDs", async () => {
    vi.stubEnv("STRIPE_PRICE_CREATOR_PLUS", "price_creator");
    await deliver(undefined, undefined, "evt_badmapping");
    expect(await getActivePlan("alice")).toBe("FREE");
    vi.stubEnv("STRIPE_PRICE_CREATOR_PLUS", "price_plus");
    await reconcileBillingSubscription(sub.id);
    await deliver(undefined, undefined, "evt_badmapping");
    expect(await getActivePlan("alice")).toBe("CREATOR");
  });

  it("rejects malformed reconciliation IDs before using Stripe", async () => {
    await expect(reconcileBillingSubscription("bad/ref")).rejects.toThrow("BILLING_SUBSCRIPTION_INVALID");
    expect(subscriptionRead).not.toHaveBeenCalled();
  });

  it("ignores unrelated events and one-off invoices", async () => {
    await deliver("payment_intent.succeeded", { id: "pi_test" });
    await deliver("invoice.paid", { ...invoice, parent: null });
    expect(subscriptionRead).not.toHaveBeenCalled();
    expect((await state.db.query('SELECT * FROM "BillingWebhookEvent"')).rows).toHaveLength(0);
  });

  it("rejects test/live and connected-account mismatches", async () => {
    await expect(handleBillingEvent({ ...event(), livemode: true })).rejects.toThrow("BILLING_MODE_MISMATCH");
    await expect(handleBillingEvent({ ...event(), account: "acct_other" })).rejects.toThrow("BILLING_CONNECTED_ACCOUNT_UNSUPPORTED");
  });

  it("writes per-subscription ownership metadata at Checkout and keeps Plus closed", async () => {
    const url = await createCheckoutSession({ userId: "alice", email: "alice@example.test", plan: "CREATOR", baseUrl: "https://example.test" });
    expect(url).toBe("https://checkout.example.test/session");
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      subscription_data: { metadata: { userId: "alice" } }, line_items: [{ price: "price_creator", quantity: 1 }],
    }), expect.objectContaining({ idempotencyKey: expect.any(String) }));
    expect(priceIdOf("CREATOR")).toBe("price_creator");
    expect(priceIdOf("CREATOR_PLUS")).toBeNull();
  });

  it("blocks a second checkout for a nonterminal Stripe subscription", async () => {
    await deliver();
    await expect(createCheckoutSession({ userId: "alice", email: "alice@example.test", plan: "CREATOR", baseUrl: "https://example.test" }))
      .rejects.toThrow("BILLING_SUBSCRIPTION_EXISTS");
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("applies the additive database upgrade idempotently", async () => {
    await state.db.exec(readFileSync(new URL("../prisma/billing-lifecycle.sql", import.meta.url), "utf8"));
    await deliver();
    expect(await getActivePlan("alice")).toBe("CREATOR");
  });

  it("aborts the upgrade on duplicate legacy bindings without adding half a schema", async () => {
    const legacy = new PGlite();
    try {
      await legacy.exec(readFileSync(new URL("./fixtures/billing/legacy-schema.sql", import.meta.url), "utf8"));
      await legacy.exec(`INSERT INTO "User" ("id", "email", "passwordHash") VALUES
        ('a', 'a@example.test', 'unused'), ('b', 'b@example.test', 'unused');
        INSERT INTO "Subscription" ("id", "userId", "plan", "providerRef") VALUES
        ('sa', 'a', 'CREATOR', 'sub_duplicate'), ('sb', 'b', 'CREATOR', 'sub_duplicate')`);
      await expect(legacy.exec(readFileSync(new URL("../prisma/billing-lifecycle.sql", import.meta.url), "utf8")))
        .rejects.toThrow('Subscription_providerRef_key');
      await legacy.exec('ROLLBACK');
      const added = await legacy.query(`SELECT column_name FROM information_schema.columns
        WHERE table_name = 'Subscription' AND column_name = 'syncedAt'`);
      expect(added.rows).toHaveLength(0);
    } finally { await legacy.close(); }
  });
});
