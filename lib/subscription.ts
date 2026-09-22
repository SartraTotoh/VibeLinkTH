import { prisma } from "@/lib/prisma";

export type ActivePlan = "FREE" | "CREATOR" | "CREATOR_PLUS";

export async function getActivePlan(userId: string): Promise<ActivePlan> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { startedAt: "desc" },
    select: { plan: true },
  });
  if (sub) return sub.plan as ActivePlan;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });
  return (user?.plan ?? "FREE") as ActivePlan;
}