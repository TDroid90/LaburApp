import type { ReactNode } from "react";
import { Platform, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { AppNavigationColors } from "../navigation/AppNavigation";
import { DesktopLayout } from "./DesktopLayout";
import { MobileLayout } from "./MobileLayout";
import { shellVariantForLayout } from "./app-shell-policy";
import type { ResponsiveLayout } from "./responsive";

type Props = {
  children: ReactNode;
  layout: ResponsiveLayout;
  showNavigation: boolean;
  navigationItems: readonly string[];
  activeItem: string;
  notificationCount: number;
  onNavigate: (item: string) => void;
  colors: AppNavigationColors & { snow: string };
};

export function AppShell(props: Props) {
  const insets = useSafeAreaInsets();
  const variant = shellVariantForLayout(props.layout);
  const safeEdges =
    variant === "desktop" || !props.showNavigation
      ? (["top", "left", "right", "bottom"] as const)
      : (["top", "left", "right"] as const);
  const shared = {
    children: props.children,
    showNavigation: props.showNavigation,
    navigationItems: props.navigationItems,
    activeItem: props.activeItem,
    notificationCount: props.notificationCount,
    onNavigate: props.onNavigate,
    colors: props.colors,
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: props.colors.snow }]} edges={safeEdges}>
      {variant === "desktop" ? (
        <DesktopLayout {...shared} />
      ) : (
        <MobileLayout
          {...shared}
          bottomInset={Platform.OS === "android" ? Math.max(insets.bottom, 24) : insets.bottom}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });
