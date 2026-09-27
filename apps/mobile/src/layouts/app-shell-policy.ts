import type { ResponsiveLayout } from "./responsive";

export type AppShellVariant = "mobile" | "desktop";

export function shellVariantForLayout(layout: ResponsiveLayout): AppShellVariant {
  return layout === "desktop" ? "desktop" : "mobile";
}
