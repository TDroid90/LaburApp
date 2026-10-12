export type PlanMonths = 0 | 1 | 3 | 6 | 12;

export type PlanLimits = {
  months: PlanMonths;
  label: string;
  services: number;
  works: number;
  weeklyRequests: number;
  reviewAspects: number;
};

export const PLAN_LIMITS: Record<PlanMonths, PlanLimits> = {
  0: { months: 0, label: "Gratis", services: 2, works: 2, weeklyRequests: 3, reviewAspects: 2 },
  1: { months: 1, label: "Mensual", services: 3, works: 3, weeklyRequests: 3, reviewAspects: 3 },
  3: { months: 3, label: "Trimestral", services: 5, works: 5, weeklyRequests: 5, reviewAspects: 3 },
  6: { months: 6, label: "Semestral", services: 8, works: 8, weeklyRequests: 10, reviewAspects: 5 },
  12: { months: 12, label: "Anual", services: 10, works: 10, weeklyRequests: 20, reviewAspects: 7 },
};

export function planLimits(months: number | null | undefined): PlanLimits {
  return PLAN_LIMITS[months as PlanMonths] ?? PLAN_LIMITS[0];
}
