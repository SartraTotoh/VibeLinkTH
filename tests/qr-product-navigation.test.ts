import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QrStudio } from "../components/qr/qr-studio";

vi.mock("@/components/i18n/language", () => ({ useLang: () => ["th", vi.fn()], NavLangSwitcher: () => null }));
vi.mock("next/link", () => ({ default: (props: Record<string, unknown>) => React.createElement("a", props) }));
let ui: ReactTestRenderer | undefined;
const childrenText = (children: unknown): string => Array.isArray(children) ? children.map(childrenText).join("") : typeof children === "string" ? children : "";
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("window", { matchMedia: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
    // A stale or future API response must not imply that Booking is enabled.
    destinations: [{ type: "booking", label: "stale booking", url: "https://example.test/book" }], shortLinks: [],
  }), { status: 200 })));
});
afterEach(async () => { if (ui) await act(async () => ui!.unmount()); ui = undefined; vi.unstubAllGlobals(); });

describe("QR product navigation availability", () => {
  it("keeps Booking disabled for members even when destination data contains a booking entry", async () => {
    await act(async () => { ui = create(React.createElement(QrStudio)); });
    const booking = ui!.root.findAllByType("button").find(b => childrenText(b.props.children).endsWith("Booking"));
    expect(booking).toBeDefined(); expect(booking!.props.disabled).toBe(true);
    expect(JSON.stringify(ui!.toJSON())).toContain("Booking กำลังพัฒนา");
  });
  it("lets members choose Links using the original short-link mode", async () => {
    await act(async () => { ui = create(React.createElement(QrStudio)); });
    const links = ui!.root.findAllByType("button").find(b => childrenText(b.props.children).endsWith("Links"))!;
    await act(async () => links.props.onClick());
    expect(links.props["aria-pressed"]).toBe(true);
    expect(JSON.stringify(ui!.toJSON())).toContain("ยังไม่มีลิงก์ใน Links");
    expect(fetch).toHaveBeenCalledTimes(1); // read destinations only; no Booking or create-link request
  });
});
