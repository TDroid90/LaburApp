import { describe, expect, it } from "vitest";
import { shellVariantForLayout } from "./app-shell-policy";
import { BREAKPOINTS, layoutForWidth } from "./responsive";

describe("responsive layout", () => {
  it("detects narrow phones as mobile", () => {
    expect(layoutForWidth(375)).toBe("mobile");
    expect(layoutForWidth(BREAKPOINTS.tablet - 1)).toBe("mobile");
  });

  it("detects tablets between the centralized breakpoints", () => {
    expect(layoutForWidth(BREAKPOINTS.tablet)).toBe("tablet");
    expect(layoutForWidth(768)).toBe("tablet");
  });

  it("switches to desktop at the desktop breakpoint", () => {
    expect(layoutForWidth(BREAKPOINTS.desktop - 1)).toBe("tablet");
    expect(layoutForWidth(BREAKPOINTS.desktop)).toBe("desktop");
    expect(layoutForWidth(1920)).toBe("desktop");
  });

  it("selects the correct AppShell implementation", () => {
    expect(shellVariantForLayout("mobile")).toBe("mobile");
    expect(shellVariantForLayout("tablet")).toBe("mobile");
    expect(shellVariantForLayout("desktop")).toBe("desktop");
  });
});
