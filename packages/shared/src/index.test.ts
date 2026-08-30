import { describe, expect, it } from "vitest";
import { calculateFee, canTransition, containsContactAttempt, rankFor, reviewIsEligible } from "./index";

describe("dominio LaburApp", () => {
  it("calcula una comisión inmutable", () => expect(calculateFee(10000, true)).toEqual({ total: 10000, rate: 0.05, fee: 500, providerNet: 9500, currency: "ARS" }));
  it("resuelve los límites de rango", () => { expect(rankFor(0)).toBe("Recién llegado"); expect(rankFor(2500)).toBe("Leyenda"); });
  it("impide saltos de estado", () => { expect(canTransition("request_sent", "provider_reviewing")).toBe(true); expect(canTransition("request_sent", "funds_released")).toBe(false); });
  it("detecta contacto evidente", () => { expect(containsContactAttempt("Escribime al 2964 555 999")).toBe(true); expect(containsContactAttempt("Necesito reparar una canilla")).toBe(false); });
  it("limita la reseña al trabajo pagado", () => expect(reviewIsEligible({ isClient: true, paidInApp: true, status: "funds_released", alreadyReviewed: false })).toBe(true));
});
