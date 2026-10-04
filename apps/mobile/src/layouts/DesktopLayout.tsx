import type { ReactNode } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { AppNavigation, type AppNavigationColors } from "../navigation/AppNavigation";

const horizontalLogo = require("../../assets/brand/laburapp-logo-horizontal.png");

type Props = {
  children: ReactNode;
  showNavigation: boolean;
  navigationItems: readonly string[];
  activeItem: string;
  notificationCount: number;
  onNavigate: (item: string) => void;
  colors: AppNavigationColors;
};

export function DesktopLayout({ children, showNavigation, navigationItems, activeItem, notificationCount, onNavigate, colors }: Props) {
  return (
    <View style={styles.frame}>
      {showNavigation && (
        <View style={styles.sidebarFrame}>
          <View style={styles.brand}>
            <Image accessible accessibilityLabel="LaburApp" source={horizontalLogo} resizeMode="contain" style={styles.brandLogo} />
            <Text style={styles.brandCopy}>Servicios locales, acuerdos claros.</Text>
          </View>
          <AppNavigation
            items={navigationItems}
            activeItem={activeItem}
            notificationCount={notificationCount}
            onNavigate={onNavigate}
            colors={colors}
            variant="sidebar"
          />
        </View>
      )}
      <View style={styles.workspace}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, flexDirection: "row", minWidth: 0 },
  sidebarFrame: { width: 236, backgroundColor: "#081A2A" },
  brand: { position: "absolute", top: 18, left: 20, right: 16, zIndex: 2, alignItems: "flex-start" },
  brandLogo: { width: 190, height: 62 },
  brandCopy: { color: "#91A9B8", fontSize: 10, lineHeight: 14 },
  workspace: { flex: 1, minWidth: 0 },
});
