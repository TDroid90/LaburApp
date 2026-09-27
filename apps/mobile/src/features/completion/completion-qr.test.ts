import { describe, expect, it } from "vitest";
import { parseCompletionToken } from "./completion-qr";

describe("completion QR parser", () => {
  it("accepts the current QR scheme and a manual short code", () => {
    expect(parseCompletionToken("laburapp://complete?token=A1B2C3D4E5F6")).toBe("A1B2C3D4E5F6");
    expect(parseCompletionToken(" A1B2C3D4E5F6 ")).toBe("A1B2C3D4E5F6");
  });

  it.each([
    "https://evil.example/?token=A1B2C3D4E5F6",
    "laburapp://recover-password?token=A1B2C3D4E5F6",
    "laburapp://complete?token=bad value",
    "laburapp://complete?token=A1B2C3D4E5F6#extra",
    "laburapp://complete?token=%E0%A4%A",
    "x",
  ])("rejects malformed or unrelated payload %s", (value) => {
    expect(() => parseCompletionToken(value)).toThrow("INVALID_COMPLETION_TOKEN");
  });
});

