export const BREAKPOINTS = {
  tablet: 600,
  desktop: 1024,
} as const;

export type ResponsiveLayout = "mobile" | "tablet" | "desktop";

export function layoutForWidth(width: number): ResponsiveLayout {
  if (width >= BREAKPOINTS.desktop) return "desktop";
  if (width >= BREAKPOINTS.tablet) return "tablet";
  return "mobile";
}

export function isCompactLayout(layout: ResponsiveLayout) {
  return layout === "mobile";
}
