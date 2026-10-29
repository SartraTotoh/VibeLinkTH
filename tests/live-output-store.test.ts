import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
const holder = vi.hoisted(() => ({ db: null as PGlite | null }));
function statement(strings: TemplateStringsArray, values: unknown[]) {
  return strings.reduce((sql, part, i) => sql + part + (i < values.length ? `$${i + 1}` : ""), "");
}
vi.mock("@/lib/prisma", () => ({ prisma: {
  $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => (await holder.db!.query(statement(strings, values), values)).rows,
  $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => (await holder.db!.query(statement(strings, values), values)).affectedRows,
} }));
import { reserveOutput, observeOutput, requestOutputStop, beginCloseShow } from "../lib/live/store.server";
const observation = (overrides = {}) => ({ egressId: "EG_one", state: "ACTIVE", transport: "sending", version: BigInt(100), startedAt: new Date("2026-10-30T00:00:00Z"), endedAt: null, streamStartedAt: new Date("2026-10-30T00:00:01Z"), streamEndedAt: null, ...overrides });
beforeAll(async () => {
  holder.db = new PGlite();
  await holder.db.exec('CREATE TABLE "User" (id TEXT PRIMARY KEY);');
  await holder.db.exec(readFileSync(new URL("../prisma/live-schema.sql", import.meta.url), "utf8"));
}, 30000);
beforeEach(async () => {
  await holder.db!.exec(`TRUNCATE "LiveOutputEvent","LiveOutput","LiveShow","User"; INSERT INTO "User" VALUES ('owner'),('other'); INSERT INTO "LiveShow" (id,"userId",title,aspect) VALUES ('show','owner','Thai live','landscape');`);
});
afterAll(async () => holder.db?.close());
describe("Live PostgreSQL lifecycle", () => {
  it("reserves only one output under concurrent starts and repeated request IDs", async () => {
    const results = await Promise.all([reserveOutput("show", "owner", "request", "ingest.example.com", "TR_v", "TR_a"), reserveOutput("show", "owner", "request", "ingest.example.com", "TR_v", "TR_a")]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await reserveOutput("show", "owner", "new-request", "ingest.example.com", "TR_v", "TR_a")).toBe(false);
  });
  it("never reserves another user's or a closed show", async () => {
    expect(await reserveOutput("show", "other", "r", "host", "TR_v", "TR_a")).toBe(false);
    await holder.db!.exec(`UPDATE "LiveShow" SET "closedAt"=CURRENT_TIMESTAMP;`);
    expect(await reserveOutput("show", "owner", "r", "host", "TR_v", "TR_a")).toBe(false);
  });
  it("allows only one open show per owner at the database boundary", async () => {
    await expect(holder.db!.exec(`INSERT INTO "LiveShow" (id,"userId",title,aspect) VALUES ('second','owner','x','portrait');`)).rejects.toThrow();
  });
  it("prevents late start reservations as soon as room closure begins", async () => {
    await beginCloseShow("show");
    expect(await reserveOutput("show", "owner", "r", "host", "TR_v", "TR_a")).toBe(false);
  });
  it("honors a stop while the original start is still in flight", async () => {
    await reserveOutput("show", "owner", "r", "host", "TR_v", "TR_a");
    await requestOutputStop("show"); await observeOutput("show", observation(), "started");
    const rows = (await holder.db!.query<{state: string; stopRequestedAt: unknown}>('SELECT state,"stopRequestedAt" FROM "LiveOutput"')).rows;
    expect(rows[0]).toMatchObject({ state: "STOPPING" }); expect(rows[0].stopRequestedAt).toBeTruthy();
  });
  it("deduplicates webhook events and ignores stale active observations after end", async () => {
    await reserveOutput("show", "owner", "r", "host", "TR_v", "TR_a");
    await observeOutput("show", observation(), "event"); await observeOutput("show", observation(), "event");
    expect((await holder.db!.query('SELECT * FROM "LiveOutputEvent"')).rows).toHaveLength(1);
    await observeOutput("show", observation({ state: "ENDED", transport: "ended", version: BigInt(200), endedAt: new Date("2026-10-30T00:00:12Z"), streamEndedAt: new Date("2026-10-30T00:00:11Z") }), "ended");
    await observeOutput("show", observation({ version: BigInt(150) }), "stale");
    await observeOutput("show", observation({ version: BigInt(300) }), "out-of-order-active");
    expect((await holder.db!.query('SELECT state FROM "LiveOutput"')).rows).toEqual([{ state: "ENDED" }]);
    expect((await holder.db!.query('SELECT * FROM "LiveOutputEvent"')).rows).toHaveLength(2);
  });
  it("does not attach an unrelated provider job to an existing output", async () => {
    await reserveOutput("show", "owner", "r", "host", "TR_v", "TR_a");
    await observeOutput("show", observation(), "first");
    expect(await observeOutput("show", observation({ egressId: "EG_unrelated", version: BigInt(300) }), "bad")).toEqual([]);
  });
  it("prevents account deletion from orphaning an external room", async () => {
    await expect(holder.db!.exec(`DELETE FROM "User" WHERE id='owner'`)).rejects.toThrow();
    await holder.db!.exec(`UPDATE "LiveShow" SET "closedAt"=CURRENT_TIMESTAMP; DELETE FROM "LiveShow" WHERE "closedAt" IS NOT NULL; DELETE FROM "User" WHERE id='owner';`);
  });
});
