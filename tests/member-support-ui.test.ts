import React from "react";
import {act,create,type ReactTestRenderer} from "react-test-renderer";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {SupportChat} from "../components/support/support-chat";
let ui:ReactTestRenderer;
beforeEach(()=>{vi.useFakeTimers();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('fetch',vi.fn(async()=>Response.json({settings:{faqOn:false,autoReplyOn:true},faq:[],tickets:[]})));});
afterEach(async()=>{if(ui)await act(async()=>ui.unmount());vi.useRealTimers();vi.unstubAllGlobals();});
async function mount(){await act(async()=>{ui=create(React.createElement(SupportChat,{lang:'th'}));});}
describe('member support behavior',()=>{
  it('shows failed loading with retry instead of a permanent spinner alone',async()=>{
    vi.mocked(fetch).mockResolvedValue(Response.json({error:'down'},{status:500}));await mount();
    expect(ui.root.findAllByProps({role:'alert'}).length).toBe(1);
    expect(ui.root.findByType('textarea').props.disabled).toBe(true);
  });
  it('does not send during IME composition',async()=>{
    await mount();const field=ui.root.findByType('textarea');
    await act(async()=>field.props.onChange({target:{value:'ทดสอบ'}}));
    await act(async()=>field.props.onKeyDown({key:'Enter',shiftKey:false,nativeEvent:{isComposing:true},preventDefault:vi.fn()}));
    expect(vi.mocked(fetch).mock.calls.filter(([,options])=>options?.method==='POST')).toHaveLength(0);
  });
  it('does not let an older polling response overwrite a newly sent conversation',async()=>{
    await mount();
    let finish!:(response:Response)=>void;
    vi.mocked(fetch).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    await act(async()=>{await vi.advanceTimersByTimeAsync(6000);});
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ticket:{id:'new',status:'OPEN',needsAdmin:true,lastMessageAt:'2026-10-29T00:00:00Z',lastSender:'AUTO',messages:[{id:'new-message',sender:'AUTO',body:'new response',ruleId:null,createdAt:'2026-10-29T00:00:00Z'}]}}));
    await act(async()=>ui.root.findByType('textarea').props.onChange({target:{value:'question'}}));
    await act(async()=>ui.root.findByType('textarea').props.onKeyDown({key:'Enter',shiftKey:false,nativeEvent:{isComposing:false},preventDefault:vi.fn()}));
    await act(async()=>finish(Response.json({settings:{faqOn:false},faq:[],tickets:[]})));
    expect(JSON.stringify(ui.toJSON())).toContain('new response');
  });

});
