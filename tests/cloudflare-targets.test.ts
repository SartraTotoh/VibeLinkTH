import {describe,it,expect,vi} from "vitest";
import {selectLandingProject,discoverLandingProject} from "../scripts/cloudflare-targets.mjs";
const project={name:'existing-site',production_branch:'production',domains:['vibelinkth.com']};
describe('deployment target discovery',()=>{
 it('uses the existing custom domain and real production branch',()=>{
  expect(selectLandingProject([{name:'other',production_branch:'main',domains:['other.example']},project])).toEqual({name:'existing-site',branch:'production'});
 });
 it('refuses missing or ambiguous targets',()=>{
  expect(()=>selectLandingProject([])).toThrow('exactly one');
  expect(()=>selectLandingProject([project,project])).toThrow('exactly one');
 });
 it('rejects incomplete or unsafe metadata',()=>{
  expect(()=>selectLandingProject([{...project,production_branch:'main\ninjected'}])).toThrow('incomplete');
 });
 it('does not call Cloudflare without configured credentials',async()=>{
  const fetcher=vi.fn();await expect(discoverLandingProject(undefined,undefined,fetcher)).rejects.toThrow('Secrets');expect(fetcher).not.toHaveBeenCalled();
 });
 it('checks API success and handles pagination',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json({success:true,result:Array.from({length:100},(_,i)=>({name:'site-'+i,domains:[]})),result_info:{total_pages:2}})).mockResolvedValueOnce(Response.json({success:true,result:[project]}));
  expect(await discoverLandingProject('a'.repeat(32),'test-only-token',fetcher)).toEqual({name:'existing-site',branch:'production'});
  expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it('rejects permission errors without including credentials',async()=>{
  const fetcher=vi.fn().mockResolvedValue(Response.json({success:false},{status:403}));
  await expect(discoverLandingProject('a'.repeat(32),'test-only-token',fetcher)).rejects.toThrow('HTTP 403');
 });
});
