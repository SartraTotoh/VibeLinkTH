import { describe, expect, it } from "vitest";
import { matchesSuspiciousPath, isPublicStaticPath } from "../lib/security-paths";

describe("matchesSuspiciousPath", () => {
  it("blocks secret paths at the edge", () => {
    for (const p of ["/.env", "/.env.production", "/.env.local", "/.git/config", "/.ssh/id_rsa", "/wp-admin/", "/wp-login.php", "/.wrangler/config", "/.open-next/worker.js", "/.netrc", "/composer.json"]) {
      expect(matchesSuspiciousPath(p), p).toBe(true);
    }
  });

  it("lets normal app routes through", () => {
    for (const p of ["/", "/login", "/dashboard", "/ceo", "/go/abc123", "/api/campaigns", "/vibe/hello", "/settings"]) {
      expect(matchesSuspiciousPath(p), p).toBe(false);
    }
  });
});

describe("isPublicStaticPath", () => {
  it("passes real assets through fast", () => {
    expect(isPublicStaticPath("/_next/static/chunks/x.js")).toBe(true);
    expect(isPublicStaticPath("/logo.png")).toBe(true);
    expect(isPublicStaticPath("/robots.txt")).toBe(true);
    expect(isPublicStaticPath("/favicon.ico")).toBe(true);
  });

  it("does not mark app routes as static", () => {
    expect(isPublicStaticPath("/dashboard")).toBe(false);
    expect(isPublicStaticPath("/.env")).toBe(false);
  });
});