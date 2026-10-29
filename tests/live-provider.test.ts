import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EgressInfo, EgressStatus } from "livekit-server-sdk";
import { destinationUrl, liveReadiness, mediaConfigured } from "../lib/live/config.server";
import { outputEncoding, providerObservation } from "../lib/live/provider.server";
beforeEach(() => {
  vi.stubEnv("ADMIN_EMAILS", "owner@example.com"); vi.stubEnv("LIVEKIT_URL", "wss://media.example.com");
  vi.stubEnv("LIVEKIT_API_KEY", "test-key"); vi.stubEnv("LIVEKIT_API_SECRET", "test-only-server-secret");
  vi.stubEnv("LIVE_SCHEMA_READY", "true"); vi.stubEnv("LIVE_TRANSPORT_ENABLED", "true"); vi.stubEnv("LIVE_WATCHDOG_READY", "true");
  vi.stubEnv("LIVE_RTMP_HOSTS", "ingest.example.com"); vi.stubEnv("CRON_SECRET", "test-only-watchdog");
});
afterEach(() => vi.unstubAllEnvs());
describe("live configuration and evidence", () => {
  it("opens the cloud pilot only after all prerequisites and for an allowed admin", () => {
    expect(liveReadiness("owner@example.com").enabled).toBe(true);
    expect(liveReadiness("other@example.com").enabled).toBe(false);
    vi.stubEnv("LIVE_WATCHDOG_READY", "false"); expect(liveReadiness("owner@example.com").enabled).toBe(false);
    expect(JSON.stringify(liveReadiness("owner@example.com"))).not.toContain("test-only-server-secret");
  });
  it("rejects unsafe or secret-bearing media URLs", () => {
    vi.stubEnv("LIVEKIT_URL", "wss://user:password@media.example.com"); expect(mediaConfigured()).toBe(false);
    vi.stubEnv("LIVEKIT_URL", "http://media.example.com"); expect(mediaConfigured()).toBe(false);
  });
  it("restricts RTMP destinations to exact approved public hostnames", () => {
    expect(destinationUrl("rtmps://ingest.example.com/live", "stream-key", ["ingest.example.com"])).toBe("rtmps://ingest.example.com/live/stream-key");
    for (const endpoint of ["https://ingest.example.com", "rtmp://127.0.0.1/live", "rtmp://ingest.example.com.evil.com/live", "rtmp://user:password@ingest.example.com/live", "rtmp://ingest.example.com:8888/live", "rtmp://ingest.example.com/live?key=oops"]) expect(() => destinationUrl(endpoint, "key", ["ingest.example.com", "127.0.0.1"])).toThrow();
    expect(() => destinationUrl("rtmp://ingest.example.com/live", "../secret", ["ingest.example.com"])).toThrow();
  });
  it("keeps sending separate from viewer publication and never stores raw URLs/errors", () => {
    expect(outputEncoding("portrait")).toMatchObject({ width: 720, height: 1280 });
    const info = new EgressInfo({ egressId: "EG_one", roomName: "vl-show", status: EgressStatus.EGRESS_ACTIVE, startedAt: BigInt(1_000_000_000), updatedAt: BigInt(2_000_000_000), streamResults: [{ url: "rtmp://host/secret", status: 0, startedAt: BigInt(1_500_000_000) }], error: "contains-secret" });
    const view = providerObservation(info);
    expect(view.transport).toBe("sending"); expect(view.streamStartedAt?.getTime()).toBe(1500);
    expect(Object.keys(view)).not.toContain("url"); expect(Object.keys(view)).not.toContain("error");
    expect(providerObservation(new EgressInfo({ status: EgressStatus.EGRESS_ACTIVE })).transport).toBe("starting");
  });
});
