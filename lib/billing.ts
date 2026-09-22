import Stripe from "stripe";
import type { Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_missing");

const PRICE_MAP: Record<string, string> = {
  CREATOR: process.env.STRIPE_PRICE_CREATOR ?? "",
  CREATOR_PLUS: process.env.STRIPE_PRICE_CREATOR_PLUS ?? "",
};

export function priceIdOf(plan: string): string | null {
  if (plan !== "CREATOR") return null;
  return PRICE_MAP[plan] || null;
}

const STRIPE_API = "https://api.stripe.com/v1";

function stripeAuthHeader() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  return "Basic " + btoa(`${key}:`);
}

async function stripePost(path: string, params: Record<string, string>) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: stripeAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  const data = (await res.json().catch(() => null)) as {
    error?: { message?: string };
    url?: string;
  } | null;
  if (!res.ok || !data) {
    throw new Error(`STRIPE_${res.status}: ${data?.error?.message ?? "request failed"}`);
  }
  return data;
}

export async function createCheckoutSession(opts: {
  userId: string;
  email: string;
  plan: string;
  baseUrl: string;
}) {
  const price = priceIdOf(opts.plan);
  if (!price) throw new Error("PLAN_NOT_AVAILABLE");

  const session = await stripePost("/checkout/sessions", {
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: `${opts.baseUrl}/dashboard?upgraded=1`,
    cancel_url: `${opts.baseUrl}/dashboard`,
    client_reference_id: opts.userId,
    customer_email: opts.email,
    "metadata[plan]": opts.plan,
    "metadata[userId]": opts.userId,
    billing_address_collection: "auto",
    allow_promotion_codes: "true",
  });

  if (!session.url) throw new Error("STRIPE_NO_URL");
  return session.url;
}

export async function createPortalSession(customer: string, returnUrl: string) {
  const portal = await stripePost("/billing_portal/sessions", {
    customer,
    return_url: returnUrl,
  });
  if (!portal.url) throw new Error("STRIPE_NO_URL");
  return portal.url;
}

const PLAN_BY_PRICE = Object.fromEntries(
  Object.entries(PRICE_MAP).filter(([, price]) => Boolean(price)),
);

async function applySubscription(
  userId: string,
  plan: string,
  status: "ACTIVE" | "EXPIRED",
  providerRef?: string | null,
  customerRef?: string | null,
) {
  const now = new Date();
  const planField = plan as Plan;
  const customerData = customerRef ? { customerRef } : {};
  // NOTE: sequential (not $transaction) — the Neon HTTP driver has no
  // interactive transactions. Both ops are idempotent; Stripe retries
  // webhooks on 5xx so a partial apply self-heals on redelivery.
  await prisma.subscription.upsert({
    where: { userId },
    update: {
      plan: planField,
      status,
      providerRef,
      ...customerData,
      startedAt: status === "ACTIVE" ? now : undefined,
      expiresAt: status === "ACTIVE" ? null : now,
    },
    create: {
      userId,
      plan: planField,
      status,
      providerRef,
      customerRef: customerRef ?? null,
      startedAt: now,
      expiresAt: status === "ACTIVE" ? null : now,
    },
  });
  await prisma.user.update({ where: { id: userId }, data: { plan: planField } });
}

export async function getStripeCustomerId(userId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { startedAt: "desc" },
    select: { customerRef: true },
  });
  return sub?.customerRef ?? null;
}

async function syncSubscription(sub: Stripe.Subscription) {
  const existing = await prisma.subscription.findFirst({
    where: { providerRef: sub.id },
    select: { userId: true, plan: true },
  });
  if (!existing) return;

  const priceId = sub.items.data[0]?.price?.id;
  const plan = (priceId && PLAN_BY_PRICE[priceId]) || existing.plan;
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;

  const active = sub.status === "active" || sub.status === "trialing";
  const status = active ? "ACTIVE" : "EXPIRED";

  if (active) {
    await applySubscription(existing.userId, plan as string, "ACTIVE", sub.id, customerId);
  } else {
    await applySubscription(existing.userId, "FREE", "EXPIRED", sub.id, customerId);
  }
}

export async function handleBillingEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id ?? session.metadata?.userId;
      if (!userId) return;
      const plan = session.metadata?.plan ?? "CREATOR";
      const subId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
      await applySubscription(userId, plan, "ACTIVE", subId ?? null, customerId);
      break;
    }
    case "customer.subscription.updated": {
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    }
    case "customer.subscription.deleted": {
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    }
  }
}