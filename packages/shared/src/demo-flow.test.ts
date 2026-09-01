import { describe, expect, it } from "vitest";
import { applyDemoAction, createDemoScenarios } from "../../../apps/mobile/lib/demo-flow";
import { reviewIsEligible } from "./index";

describe("simulador del flujo de trabajo", () => {
  it("crea casos de solicitud, presupuesto y trabajo activo", () => {
    expect(createDemoScenarios().map((request) => request.status)).toEqual(["request_sent", "quote_sent", "in_progress"]);
  });

  it("recorre revisión, pago protegido, finalización y reseña", () => {
    let request = createDemoScenarios()[1];
    request = applyDemoAction(request, "request_revision");
    request = applyDemoAction(request, "revised_quote");
    expect(request.quote?.version).toBe(2);
    request = applyDemoAction(request, "accept_quote");
    request = applyDemoAction(request, "pay");
    expect(request.payment).toMatchObject({ protected: true, total: request.quote?.amount });
    request = applyDemoAction(request, "schedule");
    request = applyDemoAction(request, "start");
    request = applyDemoAction(request, "propose_completion");
    request = applyDemoAction(request, "confirm_completion");
    request = applyDemoAction(request, "release");
    expect(request.status).toBe("funds_released");
    expect(reviewIsEligible({ isClient: true, paidInApp: !!request.payment?.protected, status: request.status, alreadyReviewed: false })).toBe(true);
  });

  it("rechaza acciones fuera de orden", () => {
    expect(() => applyDemoAction(createDemoScenarios()[0], "pay")).toThrow(/no corresponde/);
  });
});
