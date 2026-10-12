import { describe, expect, it } from "vitest";
import { PLAN_LIMITS, planLimits } from "./plan-limits";

describe("beneficios por duración", () => {
  it.each([
    [0, 2, 2, 3, 2],
    [1, 3, 3, 3, 3],
    [3, 5, 5, 5, 3],
    [6, 8, 8, 10, 5],
    [12, 10, 10, 20, 7],
  ])("aplica únicamente la capa %i", (months, services, works, weeklyRequests, reviewAspects) => {
    expect(planLimits(months)).toMatchObject({ months, services, works, weeklyRequests, reviewAspects });
  });

  it("no concede beneficios Premium a una duración inválida", () => {
    expect(planLimits(null)).toBe(PLAN_LIMITS[0]);
    expect(planLimits(9)).toBe(PLAN_LIMITS[0]);
  });
});
