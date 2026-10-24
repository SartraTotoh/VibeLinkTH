import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, rateLimitMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  rateLimitMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/rate-limit-db", () => ({ rateLimitDb: rateLimitMock }));

import { POST } from "@/app/api/qr/validate-destination/route";

function req(body: unknown) {
  return new Request("http://localhost/api/qr/validate-destination", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(null);
  rateLimitMock.mockResolvedValue({ ok: true, remaining: 59, retryAfter: 0 });
});

describe("POST /api/qr/validate-destination", () => {
  it("returns the server-normalised URL with UTM and ref=vibelink", async () => {
    const res = await POST(
      req({
        url: "https://example.com/promo",
        utm: { utm_source: "tiktok", utm_medium: "bio" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.host).toBe("example.com");
    expect(body.https).toBe(true);
    expect(body.hadUtm).toBe(true);
    const url = new URL(body.url);
    expect(url.searchParams.get("utm_source")).toBe("tiktok");
    expect(url.searchParams.get("utm_medium")).toBe("bio");
    expect(url.searchParams.get("ref")).toBe("vibelink");
  });

  it("rejects javascript:, data: and file: schemes", async () => {
    for (const url of ["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd"]) {
      const res = await POST(req({ url }));
      expect(res.status, url).toBe(400);
      const body = await res.json();
      expect(body.code).toBe("BAD_SCHEME");
    }
  });

  it("rejects credentials embedded in the URL", async () => {
    const res = await POST(req({ url: "https://user:pass@example.com/" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("CREDENTIALS");
  });

  it("rejects unknown UTM keys and over-long values", async () => {
    const unknown = await POST(
      req({ url: "https://example.com/", utm: { utm_evil: "x" } }),
    );
    expect(unknown.status).toBe(400);
    expect((await unknown.json()).code).toBe("UTM_KEY");

    const long = await POST(
      req({ url: "https://example.com/", utm: { utm_source: "a".repeat(81) } }),
    );
    expect(long.status).toBe(400);
    expect((await long.json()).code).toBe("UTM_VALUE");
  });

  it("rejects a malformed body", async () => {
    const res = await POST(req("not-json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBeTruthy();
  });

  it("returns 429 with Retry-After when rate limited", async () => {
    rateLimitMock.mockResolvedValue({ ok: false, remaining: 0, retryAfter: 12 });
    const res = await POST(req({ url: "https://example.com/" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("12");
    expect((await res.json()).error).toContain("12");
  });

  it("uses the signed-in user id for the rate-limit key but validates anonymously too", async () => {
    authMock.mockResolvedValue({ user: { id: "u1" } });
    await POST(req({ url: "https://example.com/" }));
    expect(rateLimitMock).toHaveBeenCalledWith(
      expect.any(Request),
      "qr:validate",
      60,
      60_000,
      "u1",
    );

    authMock.mockResolvedValue(null);
    await POST(req({ url: "https://example.com/" }));
    expect(rateLimitMock).toHaveBeenLastCalledWith(
      expect.any(Request),
      "qr:validate",
      60,
      60_000,
      null,
    );
  });

  it("never fetches the destination (no SSRF)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    try {
      const res = await POST(req({ url: "https://internal.example.test/admin" }));
      expect(res.status).toBe(200);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
