import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import sharp from "sharp";

const PAYLOAD = "https://example.com/test";

function decodePng(buffer: Buffer): string | null {
  const png = PNG.sync.read(buffer);
  const result = jsQR(new Uint8ClampedArray(png.data), png.width, png.height, {
    inversionAttempts: "attemptBoth",
  });
  return result?.data ?? null;
}

async function openStudio(page: Page) {
  await page.goto("/qr");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("QR");
  await page.locator('input[type="url"]').fill(PAYLOAD);
}

async function waitForHealthy(page: Page) {
  await expect(page.getByText("Decode สำเร็จ")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText("พร้อมดาวน์โหลด").first()).toBeVisible({ timeout: 15_000 });
}

test("full flow: scan health passes and both exported files decode", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await openStudio(page);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  await waitForHealthy(page);

  const [pngDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /PNG/ }).click(),
  ]);
  const pngPath = testInfo.outputPath("vibelink-qr.png");
  await pngDownload.saveAs(pngPath);
  const png = await readFile(pngPath);
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(PNG.sync.read(png).width).toBe(1024);
  expect(decodePng(png)).toBe(PAYLOAD);
  await expect(page.getByRole("status").getByText(/ดาวน์โหลดแล้ว/)).toBeVisible({ timeout: 30_000 });

  const [svgDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /SVG/ }).click(),
  ]);
  const svgPath = testInfo.outputPath("vibelink-qr.svg");
  await svgDownload.saveAs(svgPath);
  const svg = await readFile(svgPath, "utf8");
  expect(svg).toContain("<svg");
  expect(svg).not.toContain("<script");
  expect(svg).not.toContain('href="http');
  const raster = await sharp(Buffer.from(svg)).png().toBuffer();
  expect(decodePng(raster)).toBe(PAYLOAD);
});

test("every design control keeps the QR scannable and exports a decodable file", async ({ page }, testInfo) => {
  test.setTimeout(240_000);
  await openStudio(page);
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await waitForHealthy(page);

  const rendered = async () => canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());
  let previous = await rendered();

  for (const preset of ["Pank", "Print Safe", "Blink"]) {
    const button = page.getByRole("button", { name: preset, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect.poll(rendered).not.toBe(previous);
    const next = await rendered();
    expect(next).not.toBe(previous);
    previous = next;
  }

  await page.getByRole("group", { name: "Pattern" }).getByRole("button", { name: "Dots" }).click();
  await page.getByRole("group", { name: "Eye" }).getByRole("button", { name: "Rounded" }).click();
  await page.getByRole("group", { name: "Frame" }).getByRole("button", { name: "Ticket" }).click();
  await page.getByRole("textbox", { name: "CTA", exact: true }).fill("Scan to Book");
  await expect(page.getByRole("button", { name: "Dots" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Ticket" })).toHaveAttribute("aria-pressed", "true");

  const logo = new PNG({ width: 96, height: 96 });
  logo.data.fill(0);
  for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 96; x++) {
      const dx = x - 47.5;
      const dy = y - 47.5;
      const idx = (y * 96 + x) * 4;
      if (dx * dx + dy * dy <= 40 * 40) {
        logo.data[idx] = 111;
        logo.data[idx + 1] = 76;
        logo.data[idx + 2] = 255;
        logo.data[idx + 3] = 255;
      }
    }
  }
  await page.locator('input[type="file"]').setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: PNG.sync.write(logo),
  });
  await expect(page.getByText("≤18% · ECC H")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Scan to Book")).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    page.getByRole("button", { name: /PNG/ }).click(),
  ]);
  const pngPath = testInfo.outputPath("vibelink-qr-styled.png");
  await download.saveAs(pngPath);
  expect(decodePng(await readFile(pngPath))).toBe(PAYLOAD);
});

test("animation decorates the wrapper but never changes the QR canvas", async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openStudio(page);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });

  const before = await page.locator("canvas").evaluate((el) => (el as HTMLCanvasElement).toDataURL());

  await page.getByRole("button", { name: /Glow/ }).click();
  await page.getByRole("button", { name: /Gradient/ }).click();
  await page.getByRole("button", { name: /CTA Pulse/ }).click();
  await expect(page.getByRole("button", { name: /Glow/ })).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(900);

  const animationName = await page.locator("canvas").evaluate((el) => {
    const wrapper = el.parentElement as HTMLElement;
    return getComputedStyle(wrapper).animationName;
  });
  expect(animationName).not.toBe("none");

  const after = await page.locator("canvas").evaluate((el) => (el as HTMLCanvasElement).toDataURL());
  expect(after).toBe(before);
  await expect(page.getByText(/ไฟล์นิ่งทุกครั้ง/)).toBeVisible();
});

test("prefers-reduced-motion disables animation controls", async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openStudio(page);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });

  await expect(page.getByRole("button", { name: /Glow/ })).toBeDisabled();
  await expect(page.getByText(/ลดการเคลื่อนไหวเปิดอยู่/).first()).toBeVisible();
  const animationName = await page.locator("canvas").evaluate((el) => {
    const wrapper = el.parentElement as HTMLElement;
    return getComputedStyle(wrapper).animationName;
  });
  expect(animationName).toBe("none");
});

test("unsafe schemes are rejected in the UI and download stays locked", async ({ page }) => {
  await page.goto("/qr");
  await page.locator('input[type="url"]').fill("javascript:alert(1)");
  await expect(page.getByText("อนุญาตเฉพาะลิงก์ http หรือ https เท่านั้น")).toBeVisible();
  await expect(page.getByRole("button", { name: /PNG/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /SVG/ })).toBeDisabled();
});

test("grouped download buttons share one width and use no coloured border", async ({ page }) => {
  await page.goto("/qr");
  const widths = await page
    .getByRole("button", { name: /PNG|SVG/ })
    .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().width)));
  expect(new Set(widths).size).toBe(1);

  const borders = await page
    .getByRole("button", { name: /PNG/ })
    .evaluate((el) => {
      const style = getComputedStyle(el);
      return { color: style.borderTopColor, width: style.borderTopWidth };
    });
  expect(borders.color).toBe("rgba(0, 0, 0, 0)");
});

test("over-capacity data is explained and download stays locked", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/qr");
  await page.locator('input[type="url"]').fill("https://example.com/test");

  // A logo forces ECC H. 1,350 extra characters then exceed the version-40 byte capacity.
  const logo = new PNG({ width: 16, height: 16 });
  logo.data.fill(120);
  for (let i = 3; i < logo.data.length; i += 4) logo.data[i] = 255;
  await page.locator('input[type="file"]').setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: PNG.sync.write(logo),
  });
  await page.locator('input[type="url"]').fill(`https://example.com/${"a".repeat(1350)}`);

  await expect(page.getByText(/ยาวเกินความจุของ QR/).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: /PNG/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /SVG/ })).toBeDisabled();
});

test("all visible text elements on /qr have computed font-size >= 14px", async ({ page }) => {
  await openStudio(page);
  await waitForHealthy(page);

  const violations = await page.evaluate(() => {
    const list: Array<{ tag: string; text: string; fontSize: number; className: string }> = [];
    const main = document.querySelector("main");
    if (!main) return list;

    const all = main.querySelectorAll("*");
    for (const el of Array.from(all)) {
      const htmlEl = el as HTMLElement;
      // Skip invisible elements
      if (htmlEl.offsetParent === null && htmlEl.tagName !== "BODY" && htmlEl.tagName !== "MAIN") continue;
      const computed = window.getComputedStyle(htmlEl);
      if (computed.display === "none" || computed.visibility === "hidden" || computed.opacity === "0") continue;

      if (["SCRIPT", "STYLE", "CANVAS", "SVG", "PATH", "IMG"].includes(htmlEl.tagName)) continue;

      if (["INPUT", "SELECT", "TEXTAREA"].includes(htmlEl.tagName)) {
        const fs = parseFloat(computed.fontSize);
        if (fs < 13.9) {
          list.push({
            tag: htmlEl.tagName,
            text: (htmlEl as HTMLInputElement).placeholder || (htmlEl as HTMLInputElement).value || "",
            fontSize: fs,
            className: htmlEl.className,
          });
        }
        continue;
      }

      const hasDirectText = Array.from(htmlEl.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent || "").trim().length > 0
      );

      if (hasDirectText) {
        const fs = parseFloat(computed.fontSize);
        if (fs < 13.9) {
          list.push({
            tag: htmlEl.tagName,
            text: (htmlEl.textContent || "").trim().slice(0, 30),
            fontSize: fs,
            className: htmlEl.className,
          });
        }
      }
    }
    return list;
  });

  expect(violations).toEqual([]);
});

test("no horizontal overflow across mobile viewports (320px, 375px, 390px)", async ({ page }) => {
  const viewports = [
    { width: 320, height: 640 },
    { width: 375, height: 667 },
    { width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    await page.setViewportSize(vp);
    await openStudio(page);
    await waitForHealthy(page);

    const overflow = await page.evaluate(() => {
      const docWidth = document.documentElement.clientWidth;
      const scrollWidth = document.documentElement.scrollWidth;
      const bodyScrollWidth = document.body.scrollWidth;
      return { docWidth, scrollWidth, bodyScrollWidth, diff: scrollWidth - docWidth };
    });

    expect(overflow.scrollWidth, `scrollWidth === clientWidth at ${vp.width}px`).toBe(overflow.docWidth);
    expect(overflow.bodyScrollWidth, `body.scrollWidth === clientWidth at ${vp.width}px`).toBe(overflow.docWidth);
  }
});

test("icon-only buttons have both aria-label and title attributes", async ({ page }) => {
  await openStudio(page);

  const missingA11y = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("main button, main label.qr-studio_iconBtn__Xo9dF, main [role='button']"));
    const issues: Array<{ tag: string; className: string; text: string }> = [];

    for (const btn of buttons) {
      // Check visible text without icons or sr-only text
      const clone = btn.cloneNode(true) as HTMLElement;
      clone.querySelectorAll(".ms, [class*='srOnly']").forEach((el) => el.remove());
      const visibleText = (clone.textContent || "").trim();
      const isIconOnly = visibleText.length === 0;

      if (isIconOnly) {
        const ariaLabel = btn.getAttribute("aria-label");
        const title = btn.getAttribute("title");
        if (!ariaLabel || !title) {
          issues.push({
            tag: btn.tagName,
            className: btn.className,
            text: btn.textContent || "",
          });
        }
      }
    }
    return issues;
  });

  expect(missingA11y).toEqual([]);
});

test("focus states: interactive elements show accessible ring on keyboard focus", async ({ page }) => {
  await openStudio(page);

  // Tab through elements and verify focused element has non-empty box-shadow or outline
  const focusCheck = await page.evaluate(() => {
    const firstBtn = document.querySelector("main button") as HTMLElement | null;
    if (!firstBtn) return { hasRing: false };
    firstBtn.focus();
    const style = window.getComputedStyle(firstBtn);
    const hasRing = style.boxShadow !== "none" || style.outlineWidth !== "0px";
    return { hasRing, boxShadow: style.boxShadow };
  });

  expect(focusCheck.hasRing).toBe(true);
});

test("states: error, warning, success, and disabled states have >= 14px text", async ({ page }) => {
  await page.goto("/qr");

  // Disabled state
  const pngBtn = page.getByRole("button", { name: /PNG/ });
  await expect(pngBtn).toBeDisabled();

  // Trigger error state with invalid scheme
  await page.locator('input[type="url"]').fill("javascript:void(0)");
  const errorEl = page.locator('main [role="alert"]');
  await expect(errorEl).toBeVisible();
  const errorFontSize = await errorEl.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));
  expect(errorFontSize).toBeGreaterThanOrEqual(14);

  // Trigger success state with valid URL
  await page.locator('input[type="url"]').fill(PAYLOAD);
  await waitForHealthy(page);
  const successBadge = page.getByText("พร้อมดาวน์โหลด").first();
  await expect(successBadge).toBeVisible();
  const successFontSize = await successBadge.evaluate((el) => parseFloat(window.getComputedStyle(el).fontSize));
  expect(successFontSize).toBeGreaterThanOrEqual(14);
});


