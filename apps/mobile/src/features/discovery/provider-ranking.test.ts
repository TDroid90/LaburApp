import { describe, expect, it } from "vitest";
import { advanceLeaderCycle, rankProviders, topTieKeys } from "./provider-ranking";

const provider = (name: string, subscriptionPriority: number, jobs = 0, rating = "Nuevo") => ({
  providerId: name.toLowerCase(), name, subscriptionPriority, jobs, rating, registeredAt: "2026-09-01T00:00:00Z",
});

describe("provider discovery ranking", () => {
  it("always ranks longer paid subscriptions before every selected filter", () => {
    const list = [
      provider("Gratis", 0, 50, "5,0"),
      provider("Mensual", 1, 40, "5,0"),
      provider("Trimestral", 3, 30, "4,9"),
      provider("Semestral", 6, 20, "4,8"),
      provider("Anual", 12, 0, "Nuevo"),
    ];
    for (const sort of ["recent", "jobs", "rating"] as const) {
      expect(rankProviders(list, sort).map((item) => item.name))
        .toEqual(["Anual", "Semestral", "Trimestral", "Mensual", "Gratis"]);
    }
  });

  it("rotates tied leaders without repeating until everyone led", () => {
    const keys = ["juan", "carlos", "rober"];
    const first = advanceLeaderCycle(undefined, keys, () => 0);
    const second = advanceLeaderCycle(first, keys, () => 0);
    const third = advanceLeaderCycle(second, keys, () => 0);
    const fourth = advanceLeaderCycle(third, keys, () => 0);
    expect([first.leaderId, second.leaderId, third.leaderId]).toEqual(keys);
    expect(fourth.leaderId).not.toBe(third.leaderId);
  });

  it("only rotates providers tied at the highest subscription and filter metric", () => {
    const list = [provider("Juan", 12, 8), provider("Carlos", 12, 8), provider("Rober", 6, 20)];
    expect(topTieKeys(list, "jobs")).toEqual(["carlos", "juan"]);
    expect(rankProviders(list, "jobs", "juan")[0].name).toBe("Juan");
  });
});
