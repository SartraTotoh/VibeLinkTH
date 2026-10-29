import { expect, test } from "@playwright/test";
// Read-only checks: never create accounts, send messages or trigger email flows.
for (const path of ["/", "/login", "/signup", "/qr", "/pitch", "/privacy", "/terms", "/cookies"]) {
  test(`public page: ${path}`, async ({ request }) => {
    const res = await request.get(path);
    expect(res.status()).toBe(200);
    expect((await res.text()).length).toBeGreaterThan(500);
  });
}
test("health and release metadata", async ({request}) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ok:true,service:"vibelink"});
});
test("support requires login", async ({request}) => {
  const res = await request.get("/support", {maxRedirects:0});
  expect([302,303,307,308]).toContain(res.status());
  expect(res.headers().location).toContain("/login");
});
test("anonymous CEO access is hidden", async ({request}) => {
  expect((await request.get("/ceo")).status()).toBe(404);
});
test("security headers", async ({request}) => {
  const res=await request.get("/login");
  expect(res.headers()["x-frame-options"]).toBe("DENY");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  expect(res.headers()["content-security-policy"]).toContain("default-src");
});
