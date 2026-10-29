import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
const holder = vi.hoisted(()=>({db:null as PGlite|null}));
vi.mock("@/lib/prisma",()=>({prisma:{$executeRaw:async(strings:TemplateStringsArray,...values:unknown[])=>{
  const sql=strings.reduce((s,part,i)=>s+part+(i<values.length?`$${i+1}`:""),"");
  return (await holder.db!.query(sql,values)).affectedRows;
}}}));
import { writeAdminReply, writeMemberTurn } from "../lib/support-writes";
beforeAll(async()=>{
  holder.db=new PGlite();
  await holder.db.exec(`
    CREATE TYPE "TicketStatus" AS ENUM ('OPEN','RESOLVED');
    CREATE TYPE "SupportSender" AS ENUM ('MEMBER','ADMIN','AUTO');
    CREATE TABLE "SupportTicket" ("id" text PRIMARY KEY,"status" "TicketStatus" DEFAULT 'OPEN',"needsAdmin" boolean DEFAULT true,"lastSender" "SupportSender" DEFAULT 'MEMBER',"subjectPreview" text,"lastMessageAt" timestamp,"adminSeenAt" timestamp,"updatedAt" timestamp);
    CREATE TABLE "SupportMessage" ("id" text PRIMARY KEY,"ticketId" text REFERENCES "SupportTicket"("id"),"sender" "SupportSender", "body" text NOT NULL,"ruleId" text,"createdAt" timestamp);
    CREATE TABLE "AutoReplyRule" ("id" text PRIMARY KEY,"hitCount" int DEFAULT 0,"updatedAt" timestamp);
  `);
},30000);
beforeEach(async()=>{await holder.db!.exec(`TRUNCATE "SupportMessage","SupportTicket","AutoReplyRule"; INSERT INTO "SupportTicket" ("id") VALUES ('t'); INSERT INTO "AutoReplyRule" ("id") VALUES ('r');`);});
afterAll(async()=>holder.db?.close());
describe("support writes on PostgreSQL",()=>{
  it("commits an admin reply and queue state in one SQL statement",async()=>{
    await writeAdminReply('t',"ข้อความไทย ' ; --");
    expect((await holder.db!.query('SELECT "body", "sender" FROM "SupportMessage"')).rows).toEqual([{body:"ข้อความไทย ' ; --",sender:"ADMIN"}]);
    expect((await holder.db!.query('SELECT "needsAdmin", "lastSender" FROM "SupportTicket"')).rows).toEqual([{needsAdmin:false,lastSender:"ADMIN"}]);
  });
  it("atomically writes a matched turn, marks AUTO as last sender, and counts the rule hit",async()=>{
    await writeMemberTurn({ticketId:'t',body:'ถาม',reply:'ตอบ',ruleId:'r',preview:'ถาม'});
    const messages=await holder.db!.query('SELECT "sender" FROM "SupportMessage" ORDER BY "createdAt"');
    expect(messages.rows).toEqual([{sender:'MEMBER'},{sender:'AUTO'}]);
    expect((await holder.db!.query('SELECT "hitCount" FROM "AutoReplyRule"')).rows).toEqual([{hitCount:1}]);
    expect((await holder.db!.query('SELECT "needsAdmin" FROM "SupportTicket"')).rows).toEqual([{needsAdmin:false}]);
  });
  it("queues unmatched messages for admin",async()=>{
    await writeMemberTurn({ticketId:'t',body:'ถาม',reply:'รอทีมงาน',ruleId:null,preview:'ถาม'});
    expect((await holder.db!.query('SELECT "needsAdmin" FROM "SupportTicket"')).rows).toEqual([{needsAdmin:true}]);
    expect((await holder.db!.query('SELECT "hitCount" FROM "AutoReplyRule"')).rows).toEqual([{hitCount:0}]);
  });
  it("rolls back the reply when updating the ticket fails",async()=>{
    await holder.db!.exec(`ALTER TABLE "SupportTicket" ADD CONSTRAINT no_admin_reply CHECK ("lastSender" <> 'ADMIN');`);
    try {
      await expect(writeAdminReply('t','reply')).rejects.toThrow();
      expect((await holder.db!.query('SELECT * FROM "SupportMessage"')).rows).toHaveLength(0);
    } finally {await holder.db!.exec('ALTER TABLE "SupportTicket" DROP CONSTRAINT no_admin_reply');}
  });
});
