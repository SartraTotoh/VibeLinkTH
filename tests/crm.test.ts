import { describe, expect, it } from "vitest";
import { filterUsers, mergeUserLists, MOCK_USERS, type CrmUser } from "../lib/mock-users";

const real: CrmUser[] = [
  {
    id: "u1",
    email: "owner@example.com",
    displayName: "Owner",
    plan: "CREATOR",
    emailVerified: "2026-09-01T00:00:00.000Z",
    createdAt: "2026-09-01T00:00:00.000Z",
    linkCount: 5,
    clickCount: 100,
    subscription: { plan: "CREATOR", status: "ACTIVE" },
  },
];

describe("filterUsers", () => {
  it("matches by email or display name", () => {
    expect(filterUsers(MOCK_USERS, { query: "mint", plan: "ALL" }).map((u) => u.id)).toEqual([
      "mock-01",
    ]);
    expect(filterUsers(MOCK_USERS, { query: "ครูออม", plan: "ALL" }).map((u) => u.id)).toEqual([
      "mock-09",
    ]);
  });

  it("filters by plan", () => {
    const free = filterUsers(MOCK_USERS, { query: "", plan: "FREE" });
    expect(free.length).toBeGreaterThan(0);
    expect(free.every((u) => u.plan === "FREE")).toBe(true);
  });

  it("sorts newest first", () => {
    const rows = filterUsers(MOCK_USERS, { query: "", plan: "ALL" });
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]!.createdAt >= rows[i]!.createdAt).toBe(true);
    }
  });
});

describe("mergeUserLists", () => {
  it("returns real-only rows while mock flag is off", () => {
    const { rows, realCount, mockCount } = mergeUserLists(real, { query: "", plan: "ALL" });
    expect(realCount).toBe(1);
    expect(mockCount).toBe(0);
    expect(rows.length).toBe(1);
    expect(rows.every((r) => !r.mock)).toBe(true);
    expect(rows.some((r) => r.id === "u1")).toBe(true);
  });

  it("query narrows to real rows", () => {
    const { rows, realCount } = mergeUserLists(real, { query: "owner", plan: "ALL" });
    expect(realCount).toBe(1);
    expect(rows.every((r) => r.id === "u1")).toBe(true);
  });
});
