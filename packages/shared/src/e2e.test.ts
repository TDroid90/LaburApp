import { expect, it } from "vitest";
import { canTransition, calculateFee, reviewIsEligible } from "./index";

it("recorre el camino feliz de contratación", () => {
  const path = ["request_created", "request_sent", "provider_reviewing", "quote_sent", "quote_accepted", "payment_pending", "payment_authorized", "funds_held", "scheduled", "in_progress", "completion_proposed", "client_confirmation_pending", "completed", "funds_released"] as const;
  for (let index = 0; index < path.length - 1; index++) expect(canTransition(path[index], path[index + 1])).toBe(true);
  expect(calculateFee(25000, false).providerNet).toBe(23250);
  expect(reviewIsEligible({ isClient: true, paidInApp: true, status: "funds_released", alreadyReviewed: false })).toBe(true);
});
