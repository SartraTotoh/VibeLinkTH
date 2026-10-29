import React from "react";
import { act, create, type ReactTestRenderer, type ReactTestInstance } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupportChatModule } from "../components/dev/support-chat";

let ui: ReactTestRenderer;
let posts: {method:string;url:string}[];
const detail = {id:"a",status:"OPEN",needsAdmin:true,subjectPreview:"QA",user:{id:"qa",email:"qa@example.com",displayName:"QA",plan:"FREE",vibeSlug:null,createdAt:"2026-10-01T00:00:00Z"},messages:[{id:"m",sender:"MEMBER",body:"Help",ruleId:null,createdAt:"2026-10-28T00:00:00Z"}]};
const feed = {inboxCount:1,openCount:1,settings:{autoReplyOn:true,faqOn:true},tickets:[{...detail,lastMessageAt:"2026-10-28T00:00:00Z",lastSender:"MEMBER",messageCount:1,user:detail.user}]};
function text(n:ReactTestInstance):string{return n.children.map(c=>typeof c==="string"?c:text(c)).join("");}
function button(label:string){return ui.root.findAllByType("button").find(b=>text(b).includes(label))!;}
async function click(label:string){await act(async()=>{button(label).props.onClick();});}
async function mount(){await act(async()=>{ui=create(React.createElement(SupportChatModule,{initialUnread:0}));});}
beforeEach(()=>{
  vi.useFakeTimers();posts=[];
  vi.stubGlobal("React",React);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
  vi.stubGlobal("fetch",vi.fn(async(url:string,options?:RequestInit)=>{
    if(options?.method){posts.push({method:options.method,url});return Response.json({ticket:detail});}
    if(url.includes("/tickets/")) return Response.json({ticket:detail});
    return Response.json(feed);
  }));
});
afterEach(async()=>{if(ui)await act(async()=>ui.unmount());vi.useRealTimers();vi.unstubAllGlobals();});
describe("Admin Desk interactions with mocked APIs",()=>{
  it("saves settings through the settings endpoint instead of the rules collection",async()=>{
    await mount();await click("ตั้งค่าบอท");await click("เปิดใช้งาน");
    expect(posts).toEqual([{method:"PUT",url:"/api/dev/support"}]);
  });
  it("refreshes the open conversation while preserving an unsent draft",async()=>{
    await mount();await click("QA");
    await act(async()=>ui.root.findByType("textarea").props.onChange({target:{value:"unsent"}}));
    const before=vi.mocked(fetch).mock.calls.filter(([url])=>String(url).includes("/tickets/")).length;
    await act(async()=>{await vi.advanceTimersByTimeAsync(8000);});
    expect(vi.mocked(fetch).mock.calls.filter(([url])=>String(url).includes("/tickets/")).length).toBeGreaterThan(before);
    expect(ui.root.findByType("textarea").props.value).toBe("unsent");
  });
  it("refreshes the inbox after a reply and prevents duplicate sends or switching during delivery",async()=>{
    await mount();await click("QA");
    await act(async()=>ui.root.findByType("textarea").props.onChange({target:{value:"reply"}}));
    let finish!:(r:Response)=>void;
    vi.mocked(fetch).mockImplementationOnce(()=>new Promise(r=>{finish=r;}));
    await act(async()=>{button("ส่ง").props.onClick();button("ส่ง").props.onClick();});
    expect(button("ทั้งหมด").props.disabled).toBe(true);
    expect(ui.root.findByType("textarea").props.disabled).toBe(true);
    const before=vi.mocked(fetch).mock.calls.length;
    await act(async()=>finish(Response.json({ticket:detail})));
    expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(before);
    expect(ui.root.findByType("textarea").props.value).toBe("");
    expect(button("ทั้งหมด").props.disabled).toBe(false);
  });
  it("does not send Enter while composing Thai text",async()=>{
    await mount();await click("QA");
    await act(async()=>ui.root.findByType("textarea").props.onChange({target:{value:"ภาษาไทย"}}));
    await act(async()=>ui.root.findByType("textarea").props.onKeyDown({key:"Enter",shiftKey:false,nativeEvent:{isComposing:true},preventDefault:vi.fn()}));
    expect(posts).toHaveLength(0);
  });
  it("shows a load error instead of a successful empty inbox",async()=>{
    vi.mocked(fetch).mockResolvedValue(Response.json({error:"down"},{status:500}));
    await mount();expect(text(ui.root)).toContain("โหลด Inbox ไม่สำเร็จ");
    expect(text(ui.root)).not.toContain("ทุกเธรดได้รับการดูแลแล้ว");
  });
});
