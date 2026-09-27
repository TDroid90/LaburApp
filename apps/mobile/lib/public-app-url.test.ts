import { describe, expect, it } from "vitest";
import {
  backendApiUrl,
  isAllowedNativeRecoveryUrl,
  resolveWebAuthRedirect,
} from "./public-app-url";

describe("public URL helpers", () => {
  it("keeps browser API calls same-origin", () => {
    expect(backendApiUrl("/api/drive-sync", true)).toBe("/api/drive-sync");
  });

  it("always uses the configured HTTPS origin in production", () => {
    expect(resolveWebAuthRedirect("https://app.example.test///", "https://evil.example", false))
      .toBe("https://app.example.test");
  });

  it("allows localhost only during development", () => {
    expect(resolveWebAuthRedirect("", "http://localhost:8081", true)).toBe("http://localhost:8081");
    expect(() => resolveWebAuthRedirect("", "https://evil.example", true)).toThrow("EXPO_PUBLIC_APP_URL_REQUIRED");
    expect(() => resolveWebAuthRedirect("", "http://localhost:8081", false)).toThrow("EXPO_PUBLIC_APP_URL_REQUIRED");
  });

  it("rejects non-HTTPS production configuration", () => {
    expect(() => resolveWebAuthRedirect("http://app.example.test", undefined, false)).toThrow("HTTPS_APP_URL_REQUIRED");
  });

  it("accepts only the official native recovery route", () => {
    expect(isAllowedNativeRecoveryUrl("laburapp://recover-password?code=one-time")).toBe(true);
    expect(isAllowedNativeRecoveryUrl("laburapp://other-route?code=one-time")).toBe(false);
    expect(isAllowedNativeRecoveryUrl("https://evil.example/recover-password?code=one-time")).toBe(false);
    expect(isAllowedNativeRecoveryUrl("laburapp://recover-password.evil.test?code=one-time")).toBe(false);
    expect(isAllowedNativeRecoveryUrl("laburapp://recover-password/%E0%A4%A")).toBe(false);
    expect(isAllowedNativeRecoveryUrl("not a url")).toBe(false);
  });
});
