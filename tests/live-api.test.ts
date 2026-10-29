import { createHash } from "node:crypto";
import { AccessToken } from "livekit-server-sdk";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn(), unique: vi.fn(), raw: vi.fn(), limit: vi.fn(), verify: vi.fn(), start: vi.fn(), reserve: vi.fn(), accept: vi.fn(), reconcile: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { liveShow: { findFirst: mocks.find, findUnique: mocks.unique }, liveOutput: { findUnique: vi.fn() }, $executeRaw: mocks.raw } }));
vi.mock("@/lib/rate-limit-db", () => ({ rateLimitDb: mocks.limit }));
vi.mock("@/lib/live/service.server", () => ({ acceptProviderInfo: mocks.accept, reconcileOutput: mocks.reconcile }));
vi.mock("@/lib/live/store.server", () => ({ reserveOutput: mocks.reserve, publicShow: (v: unknown) => v }));
vi.mock("@/lib/live/provider.server", () => ({ verifyProgramTracks: mocks.verify, startProviderOutput: mocks.start }));
import { POST as start } from "../app/api/live/shows/[id]/output/route";
import { GET as status } from "../app/api/live/shows/[id]/route";
import { POST as webhook } from "../app/api/live/webhook/route";
import { boundedBody } from "../lib/live/http.server";
const context = { params: Promise.resolve({ id: "show" }) };
const body = { requestId: "41b1284b-46d0-427a-bcff-0b15b59776fe", endpoint: "rtmps://ingest.example.com/live", streamKey: "test-key", videoTrackId: "TR_video", audioTrackId: "TR_audio" };
function request(data: unknown = body, headers: Record<string, string> = {}) { return new Request("https://app.example.com/api/live/shows/show/output", { method: "POST", headers: { origin: "https://app.example.com", "content-type": "application/json", ...headers }, body: JSON.stringify(data) }); }
beforeEach(() => {
  vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: { id: "owner", email: "owner@example.com" } });
  mocks.limit.mockResolvedValue({ ok: true }); mocks.find.mockResolvedValue({ id: "show", output: null, closedAt: null }); mocks.unique.mockResolvedValue({ id: "show", output: null });
  mocks.reserve.mockResolvedValue(true); mocks.start.mockResolvedValue({ egressId: "EG_one" });
  for (const [key, value] of Object.entries({ ADMIN_EMAILS: "owner@example.com", LIVEKIT_URL: "wss://media.example.com", LIVEKIT_API_KEY: "key", LIVEKIT_API_SECRET: "test-only-secret", LIVE_SCHEMA_READY: "true", LIVE_WATCHDOG_READY: "true", LIVE_TRANSPORT_ENABLED: "true", LIVE_RTMP_HOSTS: "ingest.example.com", CRON_SECRET: "test-only-cron" })) vi.stubEnv(key, value);
});
afterEach(() => vi.unstubAllEnvs());
describe("Live API boundaries", () => {
  it("rejects anonymous calls and cross-origin writes before touching the provider", async () => {
    mocks.auth.mockResolvedValueOnce(null); expect((await start(request(), context)).status).toBe(401);
    expect((await start(request(body, { origin: "https://other.example.com" }), context)).status).toBe(403);
    expect(mocks.start).not.toHaveBeenCalled(); expect(mocks.find).not.toHaveBeenCalled();
  });
  it("scopes lookups to the authenticated owner and rejects missing shows", async () => {
    mocks.find.mockResolvedValue(null); expect((await start(request(), context)).status).toBe(404);
    expect(mocks.find.mock.calls[0][0].where).toEqual({ id: "show", userId: "owner" });
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("fails closed when the database quota check is unavailable", async () => {
    mocks.limit.mockResolvedValue({ ok: false }); expect((await start(request(), context)).status).toBe(429);
    expect(mocks.start).not.toHaveBeenCalled();
  });
  it("requires actual published program tracks before reserving output", async () => {
    mocks.verify.mockRejectedValueOnce(new Error("missing")); expect((await start(request(), context)).status).toBe(409);
    expect(mocks.reserve).not.toHaveBeenCalled(); expect(mocks.start).not.toHaveBeenCalled();
  });
  it("does not send again after a duplicate reservation or idempotent retry", async () => {
    mocks.reserve.mockResolvedValueOnce(false); expect((await start(request(), context)).status).toBe(409);
    mocks.find.mockResolvedValueOnce({ id: "show", output: { requestId: body.requestId }, closedAt: null });
    expect((await start(request(), context)).status).toBe(200); expect(mocks.start).not.toHaveBeenCalled();
  });
  it("keeps ambiguous starts pending and does not disclose the provider error or key", async () => {
    mocks.start.mockRejectedValueOnce(new Error("secret-provider-error-test-key"));
    const response = await start(request(), context); expect(response.status).toBe(202);
    expect(await response.text()).not.toContain("test-key"); expect(mocks.raw).toHaveBeenCalledOnce();
  });
  it("returns stale status with an explicit sync-pending marker during provider outages", async () => {
    mocks.find.mockResolvedValue({ id: "show", output: {}, closedAt: null }); mocks.reconcile.mockRejectedValueOnce(new Error("down"));
    const response = await status(new Request("https://app.example.com/api/live/shows/show"), context);
    expect((await response.json()).syncPending).toBe(true);
  });
  it("requires a signed webhook and rejects a tampered signed body", async () => {
    const raw = JSON.stringify({ event: "room_started", id: "event" });
    const token = new AccessToken("key", "test-only-secret", { ttl: 60 }); token.sha256 = createHash("sha256").update(raw).digest("base64");
    const signed = await token.toJwt();
    expect((await webhook(new Request("https://app.example.com/api/live/webhook", { method: "POST", body: raw }))).status).toBe(401);
    expect((await webhook(new Request("https://app.example.com/api/live/webhook", { method: "POST", headers: { authorization: signed }, body: raw + " " }))).status).toBe(401);
    expect((await webhook(new Request("https://app.example.com/api/live/webhook", { method: "POST", headers: { authorization: signed }, body: raw }))).status).toBe(200);
  });
  it("bounds byte reads before parsing JSON or validating a webhook signature", async () => {
    await expect(boundedBody(new Request("https://app.example.com", { method: "POST", body: "ย".repeat(10) }), 20)).rejects.toThrow("body-too-large");
  });
});
