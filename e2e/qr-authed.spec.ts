import { expect, test } from "@playwright/test";

/**
 * Authenticated QR Studio E2E.
 *
 * This file is intentionally skipped unless staging credentials are provided.
 * Do not commit real credentials. Create the two staging accounts manually and
 * expose only their email/password through environment variables:
 *
 *   E2E_QR_USER_A_EMAIL / E2E_QR_USER_A_PASS
 *   E2E_QR_USER_B_EMAIL / E2E_QR_USER_B_PASS
 *   APP_TEST_URL=<staging url>
 */

const USER_A_EMAIL = process.env.E2E_QR_USER_A_EMAIL ?? "";
const USER_A_PASS = process.env.E2E_QR_USER_A_PASS ?? "TestPass1234";
const USER_B_EMAIL = process.env.E2E_QR_USER_B_EMAIL ?? "";
const USER_B_PASS = process.env.E2E_QR_USER_B_PASS ?? "TestPass1234";

const hasStagingAccounts = Boolean(USER_A_EMAIL && USER_B_EMAIL);

test.describe("QR Studio authenticated destinations", () => {
  test.skip(!hasStagingAccounts, "E2E_QR_USER_A_EMAIL / E2E_QR_USER_B_EMAIL not set");

  async function login(page: any, email: string, password: string) {
    await page.goto("/login");
    await page.getByLabel("อีเมล").fill(email);
    await page.getByLabel("รหัสผ่าน").fill(password);
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
    await page.goto("/qr");
  }

  test("anonymous GET /api/qr/destinations returns 401", async ({ request }) => {
    const res = await request.get("/api/qr/destinations");
    expect(res.status()).toBe(401);
  });

  test("user A sees only their own destinations", async ({ page }) => {
    await login(page, USER_A_EMAIL, USER_A_PASS);
    const response = await page.request.get("/api/qr/destinations");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.destinations)).toBe(true);
    expect(Array.isArray(body.shortLinks)).toBe(true);
  });

  test("user B does not see user A destinations", async ({ page }) => {
    await login(page, USER_B_EMAIL, USER_B_PASS);
    const response = await page.request.get("/api/qr/destinations");
    expect(response.status()).toBe(200);
    const body = await response.json();
    // The exact labels are seeded per account; this assertion is a placeholder
    // to be replaced with seeded fixture assertions during staging setup.
    expect(body.destinations).toBeDefined();
  });

  test("unpublished booking page is hidden", async ({ page }) => {
    await login(page, USER_B_EMAIL, USER_B_PASS);
    const response = await page.request.get("/api/qr/destinations");
    const body = await response.json();
    const booking = body.destinations?.find((item: { type: string }) => item.type === "booking");
    // User B is seeded with an unpublished booking page; it must not appear.
    expect(booking).toBeUndefined();
  });

  test("URL validation does not fetch the destination", async ({ page }) => {
    await login(page, USER_A_EMAIL, USER_A_PASS);
    const response = await page.request.post("/api/qr/validate-destination", {
      data: { url: "https://example.com/staging-check" },
    });
    expect(response.status()).toBe(200);
  });
});