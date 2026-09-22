import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { EmailTokenPurpose } from "@prisma/client";

const TTL_MINUTES: Record<EmailTokenPurpose, number> = {
  VERIFY_EMAIL: 60 * 24,
  RESET_PASSWORD: 60,
};

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export async function issueEmailToken(userId: string, purpose: EmailTokenPurpose) {
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(raw);
  const expires = new Date(Date.now() + TTL_MINUTES[purpose] * 60_000);

  // NOTE: sequential (not $transaction) — the Neon HTTP driver has no
  // interactive transactions. Stale unused tokens are harmless if a
  // redelivery recreates them.
  await prisma.emailToken.deleteMany({ where: { userId, purpose, usedAt: null } });
  await prisma.emailToken.create({ data: { userId, tokenHash, purpose, expires } });

  return raw;
}

export async function consumeEmailToken(raw: string, purpose: EmailTokenPurpose) {
  if (!raw || raw.length < 20) return null;

  const token = await prisma.emailToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    select: { id: true, userId: true, purpose: true, expires: true, usedAt: true },
  });

  if (!token || token.purpose !== purpose || token.usedAt || token.expires < new Date()) {
    return null;
  }

  await prisma.emailToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
  return token.userId;
}
