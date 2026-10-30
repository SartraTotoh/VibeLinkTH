import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, handleBillingEvent } from "@/lib/billing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "billing unavailable" }, { status: 503 });
  }
  if (!sig) {
    return NextResponse.json(
      { error: "missing stripe-signature" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, secret,
      undefined, Stripe.createSubtleCryptoProvider());
  } catch {
    return NextResponse.json(
      { error: "webhook signature invalid" },
      { status: 400 },
    );
  }

  try {
    await handleBillingEvent(event);
  } catch (err) {
    // Never return Stripe/DB messages, connection strings or raw payloads.
    const code = err instanceof Error && /^BILLING_[A-Z_]+$/.test(err.message)
      ? err.message : "BILLING_PROCESSING_FAILED";
    console.error("[billing-webhook]", { eventId: event.id, type: event.type, code });
    return NextResponse.json({ error: "billing processing failed; retry delivery" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
