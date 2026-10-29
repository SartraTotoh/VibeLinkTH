import {beforeEach,describe,expect,it,vi} from "vitest";
const db=vi.hoisted(()=>({tickets:vi.fn(),count:vi.fn(),settings:vi.fn(),update:vi.fn()}));
vi.mock("@/auth",()=>({auth:async()=>({user:{email:"admin@example.com"}})}));
vi.mock("@/lib/admin",()=>({isAdmin:()=>true}));
vi.mock("@/lib/prisma",()=>({prisma:{supportTicket:{findMany:db.tickets,count:db.count},supportSettings:{findUnique:db.settings,update:db.update}}}));
vi.mock("@/lib/security",()=>({recordSecurityAttempt:vi.fn()}));
vi.mock("@/lib/audit",()=>({writeAudit:vi.fn()}));
import {GET,PUT} from "../app/api/dev/support/route";
beforeEach(()=>{vi.clearAllMocks();db.tickets.mockResolvedValue([]);db.count.mockImplementation(async({where})=>where.needsAdmin?12:15);db.settings.mockResolvedValue({id:"singleton"});db.update.mockResolvedValue({autoReplyOn:false,faqOn:true});});
describe("Admin Desk API consistency",()=>{
  it("keeps the waiting count independent of selected filter",async()=>{
    const r=await GET(new Request("https://example.com/api/dev/support?view=resolved"));
    expect((await r.json()).inboxCount).toBe(12);
    expect(db.tickets.mock.calls[0]![0].where).toEqual({status:"RESOLVED"});
  });
  it("includes older resolved threads in All",async()=>{
    await GET(new Request("https://example.com/api/dev/support?view=all"));
    expect(db.tickets.mock.calls[0]![0].where).toEqual({});
  });
  it("does not erase office hours when toggling auto-reply",async()=>{
    await PUT(new Request("https://example.com/api/dev/support",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({autoReplyOn:false})}));
    expect(db.update.mock.calls[0]![0].data).toMatchObject({autoReplyOn:false,hoursTh:undefined,hoursEn:undefined});
  });
});
