import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppNavigation, type AppNavigationColors } from "../navigation/AppNavigation";

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
            <Text style={styles.brandName}>LaburApp</Text>
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
  brand: { position: "absolute", top: 25, left: 20, right: 16, zIndex: 2 },
  brandName: { color: "white", fontSize: 26, fontWeight: "900" },
  brandCopy: { color: "#91A9B8", fontSize: 10, lineHeight: 14, marginTop: 3 },
  workspace: { flex: 1, minWidth: 0 },
});
