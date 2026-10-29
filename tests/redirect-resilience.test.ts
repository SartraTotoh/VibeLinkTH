import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ find:vi.fn(), campaigns:vi.fn(), create:vi.fn() }));
vi.mock("@/lib/prisma",()=>({prisma:{link:{findUnique:db.find},campaign:{findMany:db.campaigns},linkEvent:{create:db.create}}}));
vi.mock("@/lib/rate-limit",()=>({rateLimit:()=>({ok:true}),clientIp:()=>"test"}));
import { GET } from "../app/go/[slug]/route";
beforeEach(()=>{
  vi.resetAllMocks();
  db.find.mockResolvedValue({id:"l",userId:"u",destinationUrl:"https://example.com/?utm_campaign=unknown&utm_source=line",status:"ACTIVE",expiresAt:null});
  db.campaigns.mockResolvedValue([{id:"c",name:"A campaign"}]);
  db.create.mockResolvedValue({});
});
afterEach(()=>vi.restoreAllMocks());
async function redirect(){return GET(new Request("https://app.vibelinkth.com/go/qa"),{params:Promise.resolve({slug:"qa"})});}
describe("redirect and attribution integrity",()=>{
  it("preserves the stored destination and leaves unmatched clicks unattributed",async()=>{
    const r=await redirect();
    expect(r.status).toBe(302);
    expect(r.headers.get("Location")).toBe("https://example.com/?utm_campaign=unknown&utm_source=line");
    expect(db.create.mock.calls[0]![0].data.campaignId).toBeNull();
  });
  it.each(["lookup","write"])("does not break destination during analytics %s outages",async(stage)=>{
    vi.spyOn(console,"error").mockImplementation(()=>{});
    if(stage==="lookup")db.campaigns.mockRejectedValue(new Error("fixture outage"));
    else db.create.mockRejectedValue(new Error("fixture outage"));
    expect((await redirect()).status).toBe(302);
  });
});
