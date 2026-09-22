import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/", "/login", "/signup", "/forgot-password", "/verify-email", "/terms", "/privacy", "/cookies"];

for (const path of PAGES) {
  test(`a11y clean: ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}
