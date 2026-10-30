import Stripe from "stripe";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { acquireBillingLease, billingEventProcessed, commitBillingSnapshot,
  receiveBillingEvent, releaseBillingLease } from "@/lib/billing-store";
import { invoiceSubscriptionId, priceIdOf, stripeRef, subscriptionSnapshot,
  validPlanPrice } from "@/lib/billing-policy";

export { priceIdOf } from "@/lib/billing-policy";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_missing", {
  apiVersion: "2026-08-26.dahlia",
  httpClient: Stripe.createFetchHttpClient(), timeout: 10_000, maxNetworkRetries: 0,
});

export async function createCheckoutSession(opts: {
  userId: string; email: string; plan: string; baseUrl: string;
}) {
  const priceId = priceIdOf(opts.plan);
  if (!priceId) throw new Error("PLAN_NOT_AVAILABLE");
  const price = await stripe.prices.retrieve(priceId);
  if (!price.active || !validPlanPrice(price, "CREATOR")) throw new Error("BILLING_PRICE_INVALID");
  const existing = await prisma.subscription.findUnique({ where: { userId: opts.userId } });
  if (existing?.providerRef) {
    const current = await stripe.subscriptions.retrieve(existing.providerRef);
    if (!terminal(current)) throw new Error("BILLING_SUBSCRIPTION_EXISTS");
  }
  const session = await stripe.checkout.sessions.create({
    mode: "subscription", line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${opts.baseUrl}/dashboard?upgraded=1`, cancel_url: `${opts.baseUrl}/dashboard`,
    client_reference_id: opts.userId,
    ...(existing?.customerRef ? { customer: existing.customerRef } : { customer_email: opts.email }),
    metadata: { plan: opts.plan, userId: opts.userId },
    subscription_data: { metadata: { userId: opts.userId } },
    billing_address_collection: "auto", allow_promotion_codes: true,
  }, { idempotencyKey: `vibelink-checkout:${opts.userId}:${priceId}:${existing?.providerRef ?? "new"}:${Math.floor(Date.now() / 1_800_000)}` });
  if (!session.url) throw new Error("STRIPE_NO_URL");
  return session.url;
}

export async function createPortalSession(customer: string, returnUrl: string) {
  const portal = await stripe.billingPortal.sessions.create({ customer, return_url: returnUrl });
  if (!portal.url) throw new Error("STRIPE_NO_URL");
  return portal.url;
}

export async function getStripeCustomerId(userId: string) {
  const sub = await prisma.subscription.findUnique({ where: { userId }, select: { customerRef: true } });
  return sub?.customerRef ?? null;
}

function terminal(sub: Stripe.Subscription) {
  return sub.status === "canceled" || sub.status === "incomplete_expired";
}

function assertMode(livemode: boolean) {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!/^(sk|rk)_(test|live)_/.test(key) || livemode !== /^(sk|rk)_live_/.test(key)) {
    throw new Error("BILLING_MODE_MISMATCH");
  }
}

function consistentUserId(...ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length > 1) throw new Error("BILLING_OWNER_CONFLICT");
  return unique[0] ?? null;
}

const checkoutEvents = new Set([
  "checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed",
]);
const subscriptionEvents = new Set([
  "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted",
  "customer.subscription.paused", "customer.subscription.resumed",
  "customer.subscription.pending_update_applied", "customer.subscription.pending_update_expired",
]);
const invoiceEvents = new Set([
  "invoice.paid", "invoice.payment_succeeded", "invoice.payment_failed", "invoice.payment_action_required",
  "invoice.finalized", "invoice.finalization_failed", "invoice.marked_uncollectible", "invoice.voided",
]);

async function legacyCheckoutOwner(subscription: string) {
  const sessions = await stripe.checkout.sessions.list({ subscription, limit: 2 });
  if (sessions.has_more || sessions.data.length !== 1) throw new Error("BILLING_OWNER_UNRESOLVED");
  const session = sessions.data[0];
  if (session.mode !== "subscription" || stripeRef(session.subscription) !== subscription) {
    throw new Error("BILLING_CHECKOUT_BINDING_INVALID");
  }
  assertMode(session.livemode);
  return consistentUserId(session.client_reference_id, session.metadata?.userId);
}

export async function handleBillingEvent(event: Stripe.Event) {
  if (!checkoutEvents.has(event.type) && !subscriptionEvents.has(event.type) && !invoiceEvents.has(event.type)) return;
  assertMode(event.livemode);
  if (event.account) throw new Error("BILLING_CONNECTED_ACCOUNT_UNSUPPORTED");
  let subscriptionId: string | null;
  let hint: string | null = null;
  let sessionId: string | null = null;
  if (checkoutEvents.has(event.type)) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== "subscription") return;
    subscriptionId = stripeRef(session.subscription);
    hint = consistentUserId(session.client_reference_id, session.metadata?.userId);
    sessionId = session.id;
  } else if (subscriptionEvents.has(event.type)) {
    const sub = event.data.object as Stripe.Subscription;
    subscriptionId = sub.id;
    hint = sub.metadata?.userId ?? null;
  } else {
    subscriptionId = invoiceSubscriptionId(event.data.object as Stripe.Invoice);
    if (!subscriptionId) return; // A one-off invoice doesn't grant subscriptions.
  }
  if (!subscriptionId) throw new Error("BILLING_SUBSCRIPTION_MISSING");
  await reconcileSubscription(event, subscriptionId, hint, sessionId);
}

// Internal operator hook for restoring legacy bindings or reconciling after
// mapping repairs. No HTTP route, charges, cancellations or Stripe writes.
// Every run has a separate local receipt; replay deduplication stays intact.
export async function reconcileBillingSubscription(subscriptionId: string) {
  if (!/^sub_[A-Za-z0-9]+$/.test(subscriptionId)) throw new Error("BILLING_SUBSCRIPTION_INVALID");
  const livemode = /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY ?? "");
  assertMode(livemode);
  await reconcileSubscription({
    id: `reconcile_${randomUUID()}`, type: "billing.subscription.reconcile",
    created: Math.floor(Date.now() / 1000), livemode,
  }, subscriptionId);
}

async function reconcileSubscription(
  event: { id: string; type: string; created: number; livemode: boolean },
  subscriptionId: string, hint: string | null = null, sessionId: string | null = null,
) {
  if (await receiveBillingEvent(event, subscriptionId)) return;
  const binding = await prisma.subscription.findUnique({ where: { providerRef: subscriptionId } });
  let userId = binding?.userId ?? hint;
  if (!userId) {
    // Routing only. Never reuse a snapshot fetched before acquiring the lease.
    const routing = await stripe.subscriptions.retrieve(subscriptionId);
    assertMode(routing.livemode);
    userId = routing.metadata?.userId || await legacyCheckoutOwner(subscriptionId);
  }
  if (!userId) throw new Error("BILLING_OWNER_UNRESOLVED");
  const token = await acquireBillingLease(userId);
  try {
    if (await billingEventProcessed(event.id)) return;
    let sub = await stripe.subscriptions.retrieve(subscriptionId);
    assertMode(sub.livemode);
    const existing = await prisma.subscription.findUnique({ where: { userId } });
    consistentUserId(userId, sub.metadata?.userId, binding?.userId);
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      assertMode(session.livemode);
      consistentUserId(userId, session.client_reference_id, session.metadata?.userId);
      if (session.mode !== "subscription" || stripeRef(session.subscription) !== sub.id ||
          stripeRef(session.customer) !== stripeRef(sub.customer)) throw new Error("BILLING_CHECKOUT_BINDING_INVALID");
      // Checkout payment_status alone cannot authorize a package: only the
      // latest paid invoice for the current Stripe price can do that below.
      // An older unpaid Checkout mustn't revoke a subsequently paid invoice.
    }
    if (!binding && !sub.metadata?.userId) {
      consistentUserId(userId, await legacyCheckoutOwner(subscriptionId));
    }
    const customerId = stripeRef(sub.customer);
    if (!customerId) throw new Error("BILLING_CUSTOMER_MISSING");
    const customerBinding = await prisma.subscription.findUnique({ where: { customerRef: customerId } });
    consistentUserId(userId, customerBinding?.userId);
    if (existing?.providerRef === sub.id && existing.customerRef && existing.customerRef !== customerId) {
      throw new Error("BILLING_CUSTOMER_CONFLICT");
    }
    let outcome = "reconciled";
    if (existing?.providerRef && existing.providerRef !== sub.id) {
      // One subscription per user. Old cancellation/failed checkout events may
      // never displace another live subscription, regardless of event time.
      const tracked = await stripe.subscriptions.retrieve(existing.providerRef);
      assertMode(tracked.livemode);
      consistentUserId(userId, tracked.metadata?.userId);
      if (stripeRef(tracked.customer) !== existing.customerRef) throw new Error("BILLING_CUSTOMER_CONFLICT");
      if (!terminal(tracked) || terminal(sub)) {
        sub = tracked;
        outcome = "other_subscription_ignored";
      }
    }
    const invoiceId = stripeRef(sub.latest_invoice);
    // Revocation doesn't depend on an old invoice still being retrievable.
    const invoice = invoiceId && sub.status === "active" ? await stripe.invoices.retrieve(invoiceId) : null;
    const snapshot = subscriptionSnapshot(sub, invoice);
    await commitBillingSnapshot(userId, token, event.id, snapshot,
      outcome === "reconciled" ? snapshot.pendingReason ?? "active_paid" : outcome);
  } finally {
    // A crashed worker is recovered by lease expiry; never clear a newer token.
    await releaseBillingLease(userId, token);
  }
}
