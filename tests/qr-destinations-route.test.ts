import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  prismaMock: {
    user: { findUnique: vi.fn() },
    servicePage: { findUnique: vi.fn() },
    link: { findMany: vi.fn() },
  },
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/qr/destinations/route";

const ORIGINAL_APP = process.env.APP_URL;
const ORIGINAL_SHORT = process.env.SHORT_LINK_URL;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.APP_URL = "https://app.example.test";
  process.env.SHORT_LINK_URL = "https://s.example.test";
  authMock.mockResolvedValue({ user: { id: "u1" } });
  prismaMock.user.findUnique.mockResolvedValue({
    displayName: "Meaw",
    vibeSlug: "meaw",
    vibeTitle: "Meaw's Vibe",
    vibeEmoji: "✨",
  });
  prismaMock.servicePage.findUnique.mockResolvedValue({
    slug: "meaw-book",
    category: "cat-sitting",
    isPublished: true,
    isAcceptingBookings: true,
  });
  prismaMock.link.findMany.mockResolvedValue([
    {
      id: "l1",
      title: "Promo",
      slug: "abc123",
      destinationUrl: "https://example.com/promo",
    },
  ]);
});

afterEach(() => {
  if (ORIGINAL_APP === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = ORIGINAL_APP;
  if (ORIGINAL_SHORT === undefined) delete process.env.SHORT_LINK_URL;
  else process.env.SHORT_LINK_URL = ORIGINAL_SHORT;
});

describe("GET /api/qr/destinations", () => {
  it("returns 401 and never touches the DB when signed out", async () => {
    authMock.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.link.findMany).not.toHaveBeenCalled();
  });

  it("returns only the signed-in user's own destinations", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.destinations).toEqual([
      { type: "vibe", label: "Meaw's Vibe", url: "https://app.example.test/vibe/meaw" },
    ]);
    expect(body.shortLinks[0].shortUrl).toBe("https://s.example.test/abc123");
    expect(body.vibeReady).toBe(true);
    expect(body.bookingPublished).toBe(false);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "u1" } }),
    );
    expect(prismaMock.link.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", status: "ACTIVE" } }),
    );
  });

  it("does not expose a booking destination in this release", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.destinations.map((d: { type: string }) => d.type)).toEqual(["vibe"]);
    expect(body.bookingPublished).toBe(false);
  });

  it("reports an account without a Vibe Page instead of inventing one", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      displayName: "New",
      vibeSlug: null,
      vibeTitle: null,
      vibeEmoji: null,
    });
    prismaMock.servicePage.findUnique.mockResolvedValue(null);
    const res = await GET();
    const body = await res.json();
    expect(body.vibeReady).toBe(false);
    expect(body.destinations).toHaveLength(0);
  });

  it("returns 404 when the session points at a missing user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it("falls back to APP_URL/go when SHORT_LINK_URL is unset", async () => {
    delete process.env.SHORT_LINK_URL;
    const res = await GET();
    const body = await res.json();
    expect(body.shortLinks[0].shortUrl).toBe("https://app.example.test/go/abc123");
  });
});
