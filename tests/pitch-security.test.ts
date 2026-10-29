import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), isAdmin: vi.fn(), configured: vi.fn(), send: vi.fn(), rate: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/admin", () => ({ isAdmin: mocks.isAdmin }));
vi.mock("@/lib/email", () => ({ emailConfigured: mocks.configured, sendEmail: mocks.send }));
vi.mock("@/lib/rate-limit-db", () => ({ rateLimitDb: mocks.rate }));
import { POST } from "../app/api/pitch/broadcast/route";
const payload = { recipients:["qa@example.com"], subject:"Personal draft",html:"<p>Draft</p>",text:"Draft",requestId:"2d80cef4-8280-41f2-b4c6-e1d757b614a4",consentConfirmed:true };
function request(body: unknown = payload, origin = "https://app.vibelinkth.com", type = "application/json") {
  return new Request("https://app.vibelinkth.com/api/pitch/broadcast", {method:"POST",headers:{origin,"content-type":type},body:JSON.stringify(body)});
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_URL","https://app.vibelinkth.com");
  vi.stubEnv("PITCH_EMAIL_ENABLED","true");
  mocks.auth.mockResolvedValue({user:{id:"admin-test",email:"admin@example.com"}});
  mocks.isAdmin.mockReturnValue(true);
  mocks.configured.mockReturnValue(true);
  mocks.rate.mockResolvedValue({ok:true,retryAfter:0});
  mocks.send.mockResolvedValue(true);
});
afterEach(() => { vi.unstubAllEnvs(); });
describe("pitch delivery boundary (provider fully mocked)", () => {
  it("requires an authenticated account", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("rejects regular users", async () => {
    mocks.isAdmin.mockReturnValue(false);
    expect((await POST(request())).status).toBe(403);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("rejects cross-origin requests and invalid configuration", async () => {
    expect((await POST(request(payload,"https://evil.example"))).status).toBe(403);
    vi.stubEnv("APP_URL","not-a-url");
    expect((await POST(request())).status).toBe(403);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("defaults to disabled", async () => {
    vi.stubEnv("PITCH_EMAIL_ENABLED","");
    expect((await POST(request())).status).toBe(503);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it.each([
    {...payload,recipients:["a@example.com","b@example.com"]},
    {...payload,recipients:["bad-address"]},
    {...payload,consentConfirmed:false},
    {...payload,subject:"Injected\r\nBcc: bad@example.com"},
    {...payload,requestId:"not-a-uuid"},
  ])("rejects unsafe or unconfirmed payloads", async (body) => {
    expect((await POST(request(body))).status).toBe(400);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("fails closed when delivery quota is unavailable", async () => {
    mocks.rate.mockResolvedValue({ok:false,retryAfter:10});
    const res = await POST(request());
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("10");
    expect(mocks.rate.mock.calls[0]?.slice(-2)).toEqual(["admin-test","closed"]);
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("distinguishes provider rejection from acceptance", async () => {
    mocks.send.mockResolvedValue(false);
    expect((await POST(request())).status).toBe(502);
  });
  it("sends only one confirmed recipient with a stable provider idempotency key", async () => {
    const a = await POST(request());
    const b = await POST(request());
    expect(await a.json()).toEqual({ok:true,acceptedCount:1});
    expect(b.status).toBe(200);
    const call = mocks.send.mock.calls[0]![0];
    expect(call.to).toBe("qa@example.com");
    expect(call.idempotencyKey).toMatch(/^[a-f0-9]{64}$/);
    expect(mocks.send.mock.calls[1]![0].idempotencyKey).toBe(call.idempotencyKey);
  });
});
