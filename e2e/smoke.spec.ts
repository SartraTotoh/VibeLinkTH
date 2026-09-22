import { expect, test } from "@playwright/test";

const PUBLIC_PAGES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/verify-email",
  "/terms",
  "/privacy",
  "/cookies",
];

test("public pages return 200 with app markers", async ({ request }) => {
  for (const path of PUBLIC_PAGES) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    const body = await res.text();
    expect(body.length, `${path} body`).toBeGreaterThan(500);
  }
});

test("home mentions VibeLink", async ({ request }) => {
  const res = await request.get("/");
  expect(await res.text()).toContain("VibeLink");
});

test("seo files reference the app domain", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("app.vibelinkth.com");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("<url>");
});

test("health check is ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual(expect.objectContaining({ ok: true }));
});

test("dev console is hidden from anonymous visitors", async ({ request }) => {
  const res = await request.get("/dev");
  expect(res.status()).toBe(404);
});

test("settings redirects anonymous visitors to login", async ({ request }) => {
  const res = await request.get("/settings", { maxRedirects: 0 }).catch(() => null);
  // middleware redirect may be followed automatically; accept either the
  // redirect response or the final login page
  if (res && [301, 302, 303, 307, 308].includes(res.status())) {
    expect(res.headers()["location"] ?? "").toContain("/login");
  } else {
    const page = await request.get("/settings");
    expect(page.url()).toContain("/login");
  }
});

test("unknown short link redirects to not-found", async ({ request }) => {
  const res = await request.get("/go/p1-no-such-link-zzz", { maxRedirects: 0 }).catch(() => null);
  if (res && [301, 302, 303, 307, 308].includes(res.status())) {
    expect(res.headers()["location"] ?? "").toContain("link=not-found");
  } else {
    const followed = await request.get("/go/p1-no-such-link-zzz");
    expect(followed.url()).toContain("link=not-found");
  }
});

test("account export requires login", async ({ request }) => {
  const res = await request.get("/api/account/export");
  expect(res.status()).toBe(401);
});

test("dev apis are hidden from anonymous visitors", async ({ request }) => {
  expect((await request.get("/api/dev/users?email=a@b.c")).status()).toBe(404);
  expect((await request.get("/api/dev/links?slug=x")).status()).toBe(404);
});

test("security headers are present", async ({ request }) => {
  const res = await request.get("/login");
  const h = res.headers();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["content-security-policy"] ?? "").toContain("default-src");
  expect(h["x-powered-by"] ?? "").toBe("");
});

test("register rejects missing terms consent", async ({ request }) => {
  const res = await request.post("/api/auth/register", {
    data: { email: "smoke@example.com", password: "TestPass1234" },
  });
  expect(res.status()).toBe(400);
});

test("forgot-password is enumeration-safe", async ({ request }) => {
  const res = await request.post("/api/auth/forgot-password", {
    data: { email: "nobody-here@example.com" },
  });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual(expect.objectContaining({ ok: true }));
});
