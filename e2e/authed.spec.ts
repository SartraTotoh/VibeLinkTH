import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL ?? "";
const PASS = process.env.E2E_PASS ?? "TestPass1234";

test.describe("authenticated dashboard flow", () => {
  test.skip(!EMAIL, "E2E_EMAIL not set");

  test("full creator flow in browser", async ({ page }) => {
    const tag = Date.now().toString(36);
    const title = `PW Flow ${tag}`;
    const titleEdited = `PW Flow ${tag} Edited`;

    await page.goto("/login");
    await page.getByLabel("อีเมล").fill(EMAIL);
    await page.getByLabel("รหัสผ่าน").fill(PASS);
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
    await expect(page.getByRole("heading", { name: "หน้าควบคุมลิงก์" })).toBeVisible();
    await expect(page.locator(".onboard")).toBeVisible();

    await page.getByPlaceholder("https://shopee.co.th/your-shop").fill("https://example.com/pw-flow");
    await page.getByPlaceholder("รองเท้าคู่โปรด").fill(title);
    await page.getByRole("button", { name: "สร้างลิงก์" }).click();
    const row = page.locator(".lrow", { hasText: title });
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "สถิติ" }).click();
    await expect(page.locator(".stats-panel")).toBeVisible();
    await expect(page.locator(".stats-panel")).toContainText("คลิกรวม");

    await row.getByRole("button", { name: "QR" }).click();
    await expect(page.getByAltText(/QR /)).toBeVisible();
    await page.locator(".modal-card").getByRole("button", { name: "ปิด" }).click();

    await row.getByRole("button", { name: "แก้ไข" }).click();
    await page.locator(".modal-card").getByLabel("ชื่อลิงก์").fill(titleEdited);
    await page.getByRole("button", { name: "บันทึก", exact: true }).click();
    await expect(page.locator(".lrow", { hasText: titleEdited })).toBeVisible();

    const edited = page.locator(".lrow", { hasText: titleEdited });
    await edited.getByRole("button", { name: "UTM" }).click();
    await page.getByLabel(/Campaign/).fill("pw-camp");
    await page.getByRole("button", { name: "บันทึกเป็นปลายทางใหม่" }).click();
    await expect(page.locator(".modal-card")).toContainText("บันทึกปลายทางใหม่แล้ว");
    await page.locator(".modal-card").getByRole("button", { name: "ปิด" }).click();

    await page.getByRole("button", { name: "นำเข้าหลายลิงก์" }).click();
    await page.locator("textarea").fill("https://example.com/pw-b1\nPW B2 | https://example.com/pw-b2");
    await page.getByRole("button", { name: "นำเข้า", exact: true }).click();
    await expect(page.locator(".bulk-results")).toContainText("2/2");
    await page.locator(".modal-card").getByRole("button", { name: "ปิด" }).click();

    await page.getByRole("button", { name: "ซ่อนคำแนะนำนี้" }).click();
    await expect(page.locator(".onboard")).toBeHidden();

    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Link dashboard" })).toBeVisible();

    const a11y = await new AxeBuilder({ page }).analyze();
    expect(a11y.violations, JSON.stringify(a11y.violations, null, 2)).toEqual([]);
  });
});
