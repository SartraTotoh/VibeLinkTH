import { prisma } from "@/lib/prisma";

export type ActivePlan = "FREE" | "CREATOR" | "CREATOR_PLUS";

export async function getActivePlan(userId: string): Promise<ActivePlan> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true, expiresAt: true, syncedAt: true },
  });
  // User.plan is a reporting cache, never an authorization fallback. Legacy
  // unverified rows must be reconciled before they can grant a paid plan.
  if (!sub || sub.status !== "ACTIVE" || !sub.syncedAt || !sub.expiresAt || sub.expiresAt <= new Date()) {
    return "FREE";
  }
  return sub.plan;
}
