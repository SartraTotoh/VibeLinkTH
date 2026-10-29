import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const db=vi.hoisted(()=>({find:vi.fn(),events:vi.fn()}));
vi.mock("@/auth",()=>({auth:async()=>({user:{id:"u"}})}));
vi.mock("@/lib/prisma",()=>({prisma:{link:{findFirst:db.find},linkEvent:{findMany:db.events}}}));
vi.mock("@/lib/subscription",()=>({getActivePlan:async()=>"CREATOR"}));
import { GET } from "../app/api/links/[id]/stats/route";
const event={createdAt:new Date("2026-10-28T17:01:00Z"),device:"mobile",browser:"Safari",os:"iOS",country:"TH",referrer:null};
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date("2026-10-28T18:00:00Z"));db.find.mockResolvedValue({id:"l",slug:"qa",title:"QA"});db.events.mockResolvedValue([event]);});
afterEach(()=>{vi.useRealTimers();vi.clearAllMocks();});
async function get(format="json"){return GET(new Request(`https://app.vibelinkth.com/api/links/l/stats?range=7d&format=${format}`),{params:Promise.resolve({id:"l"})});}
describe("link reports",()=>{
  it("scopes to owner and uses Bangkok midnight and date buckets",async()=>{
    const body=await(await get()).json();
    expect(db.find.mock.calls[0]![0].where).toEqual({id:"l",userId:"u"});
    expect(db.events.mock.calls[0]![0].where.createdAt.gte.toISOString()).toBe("2026-10-22T17:00:00.000Z");
    expect(body.perDay.at(-1)).toEqual({date:"2026-10-29",clicks:1});
    expect(body.timeZone).toBe("Asia/Bangkok");
    expect(body.partialToday).toBe(true);
  });
  it("exports matching Bangkok buckets",async()=>{
    const res=await get("csv");
    expect(res.headers.get("X-Report-Timezone")).toBe("Asia/Bangkok");
    expect(await res.text()).toContain("2026-10-29,1");
  });
  it("marks partial JSON and refuses silent partial CSV exports",async()=>{
    db.events.mockResolvedValue(Array.from({length:20001},()=>event));
    const body=await(await get()).json();
    expect(body.total).toBe(20000);expect(body.truncated).toBe(true);
    expect((await get("csv")).status).toBe(422);
  });
  it("does not mark exactly 20,000 results as truncated",async()=>{
    db.events.mockResolvedValue(Array.from({length:20000},()=>event));
    expect((await(await get()).json()).truncated).toBe(false);
  });
});
