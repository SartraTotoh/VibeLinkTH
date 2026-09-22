import { prisma } from "@/lib/prisma";

export type AuditInput = {
  actorEmail?: string;
  action: string;
  subjectType: string;
  subjectRef?: string;
  detail?: string;
  result: string;
};

export async function writeAudit(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorEmail: input.actorEmail ?? "system",
        action: input.action,
        subjectType: input.subjectType,
        subjectRef: input.subjectRef ?? null,
        detail: input.detail ?? null,
        result: input.result,
      },
    });
  } catch {
    // audit is best-effort — never fail the primary action
  }
}