import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const db=vi.hoisted(()=>({subs:vi.fn(),groups:vi.fn(),users:vi.fn(),events:vi.fn()}));
vi.mock("@/auth",()=>({auth:async()=>({user:{id:"qa",email:"admin@example.com"}})}));
vi.mock("@/lib/admin",()=>({isAdmin:()=>true}));
vi.mock("@/lib/security",()=>({recordSecurityAttempt:vi.fn()}));
vi.mock("@/lib/prisma",()=>({prisma:{subscription:{findMany:db.subs},user:{groupBy:db.groups,findMany:db.users},linkEvent:{findMany:db.events}}}));
import { GET } from "../app/api/dev/metrics/route";
beforeEach(()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date("2026-10-28T18:00:00Z"));
  db.subs.mockResolvedValue([{plan:"CREATOR",startedAt:new Date("2026-09-01T00:00:00Z")}]);
  db.groups.mockResolvedValue([{plan:"CREATOR",_count:{_all:1}}]);
  db.users.mockResolvedValue([{createdAt:new Date("2026-09-01T00:00:00Z")}]);
  db.events.mockResolvedValue([{createdAt:new Date("2026-09-15T00:00:00Z")},{createdAt:new Date("2026-10-28T17:01:00Z")}]);
});
afterEach(()=>{vi.useRealTimers();vi.clearAllMocks();});
describe("CEO measurement integrity",()=>{
  it("uses current-window clicks consistently and does not invent retention or revenue attribution",async()=>{
    const body=await(await GET(new Request("https://app.vibelinkth.com/api/dev/metrics"))).json();
    expect(body.kpis.clicks).toBe(1);
    expect(body.funnel.clicks).toBe(1);
    expect(body.series.at(-1)).toMatchObject({date:"2026-10-29",clicks:1,mrr:null});
    expect(body.funnel.convClickPurchase).toBeNull();
    expect(body.retention.d7.pct).toBeNull();expect(body.retention.d30.pct).toBeNull();
    expect(body.kpis.mrr).toBe(199);
    expect(body.kpis.mrrDeltaPct).toBeNull();expect(body.kpis.arpuDeltaPct).toBeNull();
  });
});
