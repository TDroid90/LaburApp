import { describe, expect, it } from "vitest";
import { discoveryLabels, normalizeProfessionalLabel, professionalSuggestionIsValid } from "./provider-service-catalog";

describe("provider service catalog", () => {
  it("uses concise labels for presence-based work", () => {
    expect(normalizeProfessionalLabel("Electricista domiciliario")).toBe("Electricista");
    expect(normalizeProfessionalLabel("Electricidad domiciliaria")).toBe("Electricidad");
    expect(normalizeProfessionalLabel("Limpieza domiciliaria")).toBe("Limpieza general");
    expect(discoveryLabels("Mecánico")).toEqual(["Mecánicos"]);
    expect(discoveryLabels("Mecánica")).toEqual(["Mecánicos"]);
  });

  it("separates professions and services instead of producing one long filter", () => {
    expect(discoveryLabels("Gasista, Electricidad domiciliaria, Instalación de artefactos"))
      .toEqual(["Gasista", "Electricidad", "Instalación de artefactos"]);
  });

  it("does not accept arbitrary input as a profession", () => {
    expect(professionalSuggestionIsValid("Electricista domiciliario")).toBe(true);
    expect(professionalSuggestionIsValid("Kinesiólogo/a")).toBe(true);
    expect(professionalSuggestionIsValid("Osteópata")).toBe(true);
    expect(professionalSuggestionIsValid("Inventor de oficios automáticos")).toBe(false);
  });
});
