export const plans = {
  FREE: {
    name: "Free",
    monthlyPriceThb: 0,
    launchPromotion: false,
    limits: { maxActiveLinks: 10, analyticsDays: 7, customSlug: false },
  },
  CREATOR: {
    name: "Creator",
    monthlyPriceThb: 199,
    launchPromotion: {
      discountPercent: 50,
      promotionalMonthlyPriceThb: 99,
      validUntil: "2026-12-31",
    },
    limits: { maxActiveLinks: 500, analyticsDays: 90, customSlug: true },
  },
  CREATOR_PLUS: {
    name: "Creator Plus",
    monthlyPriceThb: null,
    launchPromotion: false,
    comingSoon: true,
    limits: { maxActiveLinks: null, analyticsDays: 365, customSlug: true },
  },
} as const;

export type PlanCode = keyof typeof plans;
export type PlanLimits = {
  maxActiveLinks: number | null;
  analyticsDays: number;
  customSlug: boolean;
};

export function limitsOf(plan: string): PlanLimits {
  const key = (plan in plans ? plan : "FREE") as PlanCode;
  return plans[key].limits;
}
