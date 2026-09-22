import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, handleBillingEvent } from "@/lib/billing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json(
      { error: "missing stripe-signature หรือ STRIPE_WEBHOOK_SECRET" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `webhook signature invalid: ${String(err)}` },
      { status: 400 },
    );
  }

  try {
    await handleBillingEvent(event);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}