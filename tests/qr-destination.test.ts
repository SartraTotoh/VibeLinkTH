import { describe, expect, it } from "vitest";
import {
  isLocalhostHost,
  isQrUtmKey,
  utmIsEmpty,
  validateDestination,
} from "../lib/qr/destination";

const BASE = "https://example.com/page?x=1";

describe("validateDestination — scheme allowlist", () => {
  it("accepts http and https", () => {
    const https = validateDestination(BASE);
    expect(https.ok).toBe(true);
    if (https.ok) {
      expect(https.url).toBe("https://example.com/page?x=1");
      expect(https.host).toBe("example.com");
      expect(https.isHttps).toBe(true);
    }

    const http = validateDestination("http://example.com/");
    expect(http.ok).toBe(true);
    if (http.ok) {
      expect(http.isHttps).toBe(false);
      expect(http.warnings).toContain("HTTP_NOT_SECURE");
    }
  });

  it("rejects dangerous schemes", () => {
    for (const raw of [
      "javascript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "file:///etc/passwd",
      "vbscript:msgbox(1)",
      "ftp://example.com/file",
    ]) {
      const result = validateDestination(raw);
      expect(result.ok, raw).toBe(false);
      if (!result.ok) expect(result.code).toBe("BAD_SCHEME");
    }
  });

  it("rejects URLs with embedded credentials", () => {
    const result = validateDestination("https://user:secret@example.com/path");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("CREDENTIALS");
  });

  it("rejects empty, whitespace, control chars and over-long input", () => {
    const empty = validateDestination("   ");
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.code).toBe("EMPTY");

    const control = validateDestination("https://example.com/\u0000evil");
    expect(control.ok).toBe(false);
    if (!control.ok) expect(control.code).toBe("INVALID_URL");

    const long = validateDestination(`https://example.com/${"a".repeat(2100)}`);
    expect(long.ok).toBe(false);
    if (!long.ok) expect(long.code).toBe("TOO_LONG");
  });

  it("rejects relative input without a scheme", () => {
    const result = validateDestination("example.com/page");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_URL");
  });

  it("warns for a host without a dot but does not fetch it", () => {
    const result = validateDestination("http://intranet/");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings).toContain("HOST_NO_DOT");
  });
});

describe("validateDestination — UTM", () => {
  it("applies the same five UTM keys plus ref=vibelink", () => {
    const result = validateDestination("https://example.com/promo", {
      utm_source: "tiktok",
      utm_medium: "bio",
      utm_campaign: "sale-99",
      utm_term: "creator",
      utm_content: "clip-a",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const url = new URL(result.url);
    expect(url.searchParams.get("utm_source")).toBe("tiktok");
    expect(url.searchParams.get("utm_medium")).toBe("bio");
    expect(url.searchParams.get("utm_campaign")).toBe("sale-99");
    expect(url.searchParams.get("utm_term")).toBe("creator");
    expect(url.searchParams.get("utm_content")).toBe("clip-a");
    expect(url.searchParams.get("ref")).toBe("vibelink");
    expect(result.hadUtm).toBe(true);
  });

  it("keeps existing params and overwrites duplicate UTM values", () => {
    const result = validateDestination("https://example.com/p?utm_source=old&keep=1", {
      utm_source: "new",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const url = new URL(result.url);
    expect(url.searchParams.get("utm_source")).toBe("new");
    expect(url.searchParams.get("keep")).toBe("1");
    expect(url.searchParams.getAll("utm_source")).toHaveLength(1);
  });

  it("ignores empty UTM values and does not add ref", () => {
    const result = validateDestination("https://example.com/", { utm_source: "  " });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.hadUtm).toBe(false);
    expect(result.url).not.toContain("ref=vibelink");
  });

  it("rejects unknown UTM keys", () => {
    const result = validateDestination("https://example.com/", {
      utm_evil: "x",
    } as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("UTM_KEY");
  });

  it("rejects UTM values over 80 characters and control chars", () => {
    const long = validateDestination("https://example.com/", { utm_source: "a".repeat(81) });
    expect(long.ok).toBe(false);
    if (!long.ok) expect(long.code).toBe("UTM_VALUE");

    const control = validateDestination("https://example.com/", { utm_source: "bad\nvalue" });
    expect(control.ok).toBe(false);
    if (!control.ok) expect(control.code).toBe("UTM_VALUE");
  });
});

describe("destination helpers", () => {
  it("recognises allowed UTM keys only", () => {
    expect(isQrUtmKey("utm_source")).toBe(true);
    expect(isQrUtmKey("utm_campaign")).toBe(true);
    expect(isQrUtmKey("ref")).toBe(false);
    expect(isQrUtmKey("utm_hack")).toBe(false);
  });

  it("detects localhost variants", () => {
    expect(isLocalhostHost("localhost")).toBe(true);
    expect(isLocalhostHost("127.0.0.1")).toBe(true);
    expect(isLocalhostHost("app.localhost")).toBe(true);
    expect(isLocalhostHost("example.com")).toBe(false);
  });

  it("detects an empty UTM config", () => {
    expect(utmIsEmpty(null)).toBe(true);
    expect(utmIsEmpty({})).toBe(true);
    expect(utmIsEmpty({ utm_source: "  " })).toBe(true);
    expect(utmIsEmpty({ utm_source: "tiktok" })).toBe(false);
  });
});
