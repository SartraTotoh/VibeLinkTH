import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

// Neon HTTP cannot start Prisma transactions. Each CTE is one atomic PostgreSQL
// statement, so a message and its ticket/rule state commit or roll back together.
export async function writeAdminReply(ticketId: string, body: string) {
  const id = randomUUID();
  await prisma.$executeRaw`
    WITH message AS (
      INSERT INTO "SupportMessage" ("id", "ticketId", "sender", "body", "createdAt")
      VALUES (${id}, ${ticketId}, 'ADMIN', ${body}, CURRENT_TIMESTAMP)
      RETURNING "ticketId"
    )
    UPDATE "SupportTicket"
    SET "status" = 'OPEN', "needsAdmin" = false, "lastSender" = 'ADMIN',
        "lastMessageAt" = CURRENT_TIMESTAMP, "adminSeenAt" = CURRENT_TIMESTAMP,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" IN (SELECT "ticketId" FROM message)
  `;
}

export async function writeMemberTurn(input: {
  ticketId: string; body: string; reply: string; ruleId: string | null; preview: string;
}) {
  const { ticketId, body, reply, ruleId, preview } = input;
  const memberId = randomUUID();
  const replyId = randomUUID();
  const memberAt = new Date();
  const replyAt = new Date(memberAt.getTime() + 1);
  await prisma.$executeRaw`
    WITH messages AS (
      INSERT INTO "SupportMessage" ("id", "ticketId", "sender", "body", "ruleId", "createdAt")
      VALUES (${memberId}, ${ticketId}, 'MEMBER', ${body}, NULL, ${memberAt}),
             (${replyId}, ${ticketId}, 'AUTO', ${reply}, ${ruleId}, ${replyAt})
      RETURNING "ticketId"
    ), rule_hit AS (
      UPDATE "AutoReplyRule" SET "hitCount" = "hitCount" + 1, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${ruleId} AND EXISTS (SELECT 1 FROM messages)
      RETURNING "id"
    )
    UPDATE "SupportTicket"
    SET "status" = 'OPEN', "needsAdmin" = ${ruleId === null}, "lastSender" = 'AUTO',
        "subjectPreview" = ${preview}, "lastMessageAt" = ${replyAt}, "updatedAt" = ${replyAt}
    WHERE "id" IN (SELECT "ticketId" FROM messages)
  `;
}
