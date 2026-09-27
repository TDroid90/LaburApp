import { useWindowDimensions } from "react-native";
import { isCompactLayout, layoutForWidth } from "./responsive";

export function useResponsiveLayout() {
  const dimensions = useWindowDimensions();
  const layout = layoutForWidth(dimensions.width);

  return {
    ...dimensions,
    layout,
    isMobile: layout === "mobile",
    isTablet: layout === "tablet",
    isDesktop: layout === "desktop",
    isCompact: isCompactLayout(layout),
  };
}
