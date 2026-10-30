import type Stripe from "stripe";
import type { Plan } from "@prisma/client";
import type { BillingSnapshot } from "@/lib/billing-store";
import { plans } from "@/lib/plans";

export function stripeRef(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

function priceMapping(): [Plan, string][] {
  const entries: [Plan, string][] = [
    ["CREATOR", process.env.STRIPE_PRICE_CREATOR?.trim() ?? ""],
    ["CREATOR_PLUS", process.env.STRIPE_PRICE_CREATOR_PLUS?.trim() ?? ""],
  ];
  const configured = entries.filter(([, id]) => id !== "");
  if (configured.some(([, id]) => !/^price_[A-Za-z0-9]+$/.test(id)) ||
      new Set(configured.map(([, id]) => id)).size !== configured.length) {
    throw new Error("BILLING_PRICE_MAPPING_INVALID");
  }
  return configured;
}

export function planForPrice(priceId: string): Plan | null {
  return priceMapping().find(([, id]) => id === priceId)?.[0] ?? null;
}

export function priceIdOf(plan: string): string | null {
  // Creator Plus remains coming soon; mapping old subscriptions doesn't open sales.
  if (plan !== "CREATOR") return null;
  return priceMapping().find(([code]) => code === plan)?.[1] ?? null;
}

export function validPlanPrice(price: Stripe.Price, plan: Plan) {
  return price.type === "recurring" && price.currency === "thb" &&
    price.recurring?.interval === "month" && price.recurring.interval_count === 1 &&
    price.recurring.usage_type === "licensed" && price.billing_scheme === "per_unit" &&
    !price.transform_quantity && price.unit_amount != null &&
    (plan === "CREATOR" ? price.unit_amount === plans.CREATOR.monthlyPriceThb * 100 : price.unit_amount > 0);
}

// Current API uses parent.subscription_details. Legacy webhook payloads can use
// invoice.subscription; this helper is for routing, never payment authorization.
export function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const legacy = invoice as Stripe.Invoice & { subscription?: string | { id: string } | null };
  return stripeRef(invoice.parent?.subscription_details?.subscription) ?? stripeRef(legacy.subscription);
}

export function subscriptionSnapshot(sub: Stripe.Subscription, invoice: Stripe.Invoice | null,
  now = new Date()): BillingSnapshot {
  const item = sub.items.data[0];
  const price = item?.price;
  let plan: Plan | null = null;
  let reason: string | null = null;
  try { plan = price ? planForPrice(price.id) : null; }
  catch { reason = "invalid_price_mapping"; }
  const snapshot: BillingSnapshot = {
    providerRef: sub.id,
    customerRef: stripeRef(sub.customer) ?? "",
    plan: "FREE", status: sub.status === "canceled" ? "CANCELED" : "EXPIRED",
    startedAt: new Date(sub.start_date * 1000), expiresAt: now,
    stripeStatus: sub.status, priceRef: price?.id ?? null,
    latestInvoiceRef: stripeRef(sub.latest_invoice),
    cancelAtPeriodEnd: sub.cancel_at_period_end, pendingReason: null,
  };
  const deny = (why: string) => ({ ...snapshot, pendingReason: why });
  if (sub.status !== "active") return deny(`subscription_${sub.status}`);
  if (sub.pause_collection) return deny("collection_paused");
  if (reason) return deny(reason);
  if (!plan || !price) return deny("unmapped_price");
  if (sub.items.has_more || sub.items.data.length !== 1 || item.quantity !== 1 ||
      price.livemode !== sub.livemode || !validPlanPrice(price, plan)) {
    return deny("unsupported_price_or_items");
  }
  if (!invoice || invoice.id !== stripeRef(sub.latest_invoice) ||
      invoiceSubscriptionId(invoice) !== sub.id || stripeRef(invoice.customer) !== snapshot.customerRef ||
      invoice.livemode !== sub.livemode || invoice.currency !== price.currency) {
    return deny("invoice_binding_unverified");
  }
  if (invoice.status !== "paid" || invoice.amount_remaining !== 0) return deny("invoice_unpaid");
  if (invoice.lines.has_more) return deny("invoice_lines_incomplete");
  const paidLine = invoice.lines.data.find(line =>
    line.pricing?.price_details?.price === price.id && line.amount >= 0 && line.quantity === 1 &&
    line.parent?.subscription_item_details?.subscription === sub.id &&
    line.parent.subscription_item_details.subscription_item === item.id &&
    line.period.start <= now.getTime() / 1000 && line.period.end > now.getTime() / 1000);
  if (!paidLine) return deny("price_payment_unverified");
  const expires = Math.min(item.current_period_end, paidLine.period.end, sub.cancel_at ?? Infinity);
  if (!Number.isFinite(expires) || item.current_period_start > now.getTime() / 1000 ||
      expires <= now.getTime() / 1000) return deny("paid_period_ended");
  return { ...snapshot, plan, status: "ACTIVE", expiresAt: new Date(expires * 1000), pendingReason: null };
}
