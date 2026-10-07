import { describe, expect, it } from "vitest";
import { canonicalPublicId, displayPublicId } from "./public-id";

describe("locality public ID display", () => {
  it.each([
    ["Ushuaia", "USH"],
    ["Río Grande", "RG"],
    ["Tolhuin", "TOL"],
    ["Almanza", "ALM"],
    ["San Sebastián", "SS"],
  ])("shows %s without changing the stable ID", (city, code) => {
    expect(displayPublicId("LP000094", city)).toBe(`${code}-LP000094`);
    expect(canonicalPublicId(`${code}-LP000094`)).toBe("LP000094");
  });

  it("keeps unknown localities and legacy IDs usable", () => {
    expect(displayPublicId("LP000094", null)).toBe("LP000094");
    expect(canonicalPublicId("lp000094")).toBe("LP000094");
  });
});
