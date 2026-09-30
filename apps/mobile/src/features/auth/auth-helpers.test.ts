import { describe, expect, it } from "vitest";
import { isDemoAccessEnabled, isEmailNotConfirmedError, passwordSecurityError, readableAuthError, shouldClearSessionOnAuthEvent } from "./auth-helpers";

describe("auth helpers", () => {
  it("requires a strong password", () => {
    expect(passwordSecurityError("short")).toContain("12 caracteres");
    expect(passwordSecurityError("Password123!")).toBeNull();
  });

  it("does not expose raw authentication errors", () => {
    expect(readableAuthError("database token secret failure")).toBe("No pudimos completar el acceso. Volvé a intentarlo.");
  });

  it("recognizes an account that still needs email confirmation", () => {
    expect(isEmailNotConfirmedError("Email not confirmed")).toBe(true);
    expect(isEmailNotConfirmedError("Invalid login credentials")).toBe(false);
  });

  it("enables demo access only in the explicit development environment", () => {
    expect(isDemoAccessEnabled("true", "development")).toBe(true);
    expect(isDemoAccessEnabled("true", "preview")).toBe(false);
    expect(isDemoAccessEnabled("true", "production")).toBe(false);
    expect(isDemoAccessEnabled("false", "development")).toBe(false);
  });

  it("clears a real local session when Supabase reports expiration or sign-out", () => {
    expect(shouldClearSessionOnAuthEvent("SIGNED_OUT", "persona@example.com")).toBe(true);
    expect(shouldClearSessionOnAuthEvent("TOKEN_REFRESHED", "persona@example.com")).toBe(false);
    expect(shouldClearSessionOnAuthEvent("SIGNED_OUT", "client@laburapp.demo")).toBe(false);
    expect(shouldClearSessionOnAuthEvent("SIGNED_OUT", null)).toBe(false);
  });
});
