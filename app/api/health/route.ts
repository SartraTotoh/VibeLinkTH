import { NextResponse } from "next/server";

export function GET() {
  const sk = process.env.STRIPE_SECRET_KEY ?? "";
  return NextResponse.json({
    ok: true,
    service: "vibelink",
    timestamp: new Date().toISOString(),
    integrations: {
      email: Boolean(process.env.RESEND_API_KEY),
      stripe: sk.startsWith("sk_live") ? "live" : sk.startsWith("sk_test") ? "test" : "unset",
      stripePrice: Boolean(process.env.STRIPE_PRICE_CREATOR),
      stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
    },
  });
}
