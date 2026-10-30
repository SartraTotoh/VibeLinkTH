import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

const { handler } = vi.hoisted(() => ({ handler: vi.fn() }));
vi.mock("@/lib/billing", async () => {
  const { default: Stripe } = await import("stripe");
  return { stripe: new Stripe("sk_test_fixture"), handleBillingEvent: handler };
});
import { POST } from "@/app/api/billing/webhook/route";

const signer = new Stripe("sk_test_fixture");
const secret = "whsec_fixture";
function request(options: { signature?: string; payload?: string; timestamp?: number; tamper?: boolean } = {}) {
  const payload = options.payload ?? JSON.stringify({
    id: "evt_signed", object: "event", type: "customer.subscription.updated",
    livemode: false, created: Math.floor(Date.now() / 1000), data: { object: { id: "sub_fixture" } },
  });
  const signature = options.signature ?? signer.webhooks.generateTestHeaderString({
    payload, secret, ...(options.timestamp ? { timestamp: options.timestamp } : {}),
  });
  return new Request("https://example.test/api/billing/webhook", {
    method: "POST", headers: { "stripe-signature": signature }, body: payload + (options.tamper ? " " : ""),
  });
}
beforeEach(() => {
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret);
  handler.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("billing webhook HTTP contract with real offline Stripe signature verification", () => {
  it("accepts an authentic raw-body signature", async () => {
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ id: "evt_signed" }));
  });
  it("rejects missing signatures before billing", async () => {
    const res = await POST(new Request("https://example.test", { method: "POST", body: "{}" }));
    expect(res.status).toBe(400); expect(handler).not.toHaveBeenCalled();
  });
  it("rejects an invalid signature", async () => {
    expect((await POST(request({ signature: "bad" }))).status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });
  it("rejects a body modified after signing", async () => {
    expect((await POST(request({ tamper: true }))).status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });
  it("rejects old signature timestamps", async () => {
    expect((await POST(request({ timestamp: Math.floor(Date.now() / 1000) - 3600 }))).status).toBe(400);
    expect(handler).not.toHaveBeenCalled();
  });
  it("returns a retryable error when the endpoint isn't configured", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    expect((await POST(request())).status).toBe(503);
    expect(handler).not.toHaveBeenCalled();
  });
  it("returns 500 on database or Stripe failure without disclosing internal errors", async () => {
    handler.mockRejectedValue(new Error("private database connection details"));
    const res = await POST(request());
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("private");
    expect(console.error).toHaveBeenCalledWith("[billing-webhook]", {
      eventId: "evt_signed", type: "customer.subscription.updated", code: "BILLING_PROCESSING_FAILED",
    });
  });
});
