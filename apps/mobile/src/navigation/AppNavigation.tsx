import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";

export type AppNavigationColors = {
  surface: string;
  line: string;
  navy: string;
  stone: string;
  orange: string;
  blue: string;
};

type Props = {
  items: readonly string[];
  activeItem: string;
  notificationCount: number;
  onNavigate: (item: string) => void;
  colors: AppNavigationColors;
  variant: "bottom" | "sidebar";
  bottomInset?: number;
};

export function AppNavigation({
  items,
  activeItem,
  notificationCount,
  onNavigate,
  colors,
  variant,
  bottomInset = 0,
}: Props) {
  const bottom = variant === "bottom";
  const { fontScale } = useWindowDimensions();
  const scaledNavigationHeight = 64 + Math.min(28, Math.max(0, fontScale - 1) * 28);
  return (
    <View
      role="navigation"
      accessibilityLabel="Navegación principal"
      style={[
        bottom ? styles.bottom : styles.sidebar,
        {
          backgroundColor: bottom ? colors.surface : "#081A2A",
          borderColor: colors.line,
          paddingBottom: bottom ? bottomInset : 0,
          height: bottom ? scaledNavigationHeight + bottomInset : undefined,
        },
      ]}
    >
      {items.map((item) => {
        const active = item === activeItem;
        const isQr = item === "QR";
        return (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={item}
            accessibilityState={{ selected: active }}
            key={item}
            onPress={() => onNavigate(item)}
            style={[
              bottom ? styles.bottomItem : styles.sidebarItem,
              !bottom && active && { backgroundColor: "rgba(73,178,245,0.14)", borderColor: colors.blue },
              bottom && isQr && styles.qrBottomItem,
            ]}
          >
            {isQr && bottom ? (
              <>
                <Text style={[styles.qrIcon, { backgroundColor: colors.orange }]}>▣</Text>
                <Text style={[styles.bottomLabel, { color: active ? colors.orange : colors.stone }]}>QR</Text>
              </>
            ) : (
              <View style={styles.labelRow}>
                <Text
                  numberOfLines={1}
                  style={[
                    bottom ? styles.bottomText : styles.sidebarText,
                    { color: active ? colors.orange : bottom ? colors.stone : "#D6E6EE" },
                  ]}
                >
                  {item}
                </Text>
                {item === "Solicitudes" && notificationCount > 0 && (
                  <Text accessibilityLabel={`${notificationCount} novedades`} style={styles.alert}>!</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    flexDirection: "row",
    zIndex: 100,
  },
  bottomItem: { flex: 1, minWidth: 44, alignItems: "center", justifyContent: "center" },
  bottomText: { fontSize: 10, lineHeight: 14, fontWeight: "700", textAlign: "center" },
  bottomLabel: { fontSize: 9, lineHeight: 13, fontWeight: "900", marginTop: 2 },
  qrBottomItem: { marginTop: -8 },
  qrIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    color: "white",
    textAlign: "center",
    lineHeight: 46,
    fontSize: 22,
    fontWeight: "900",
    overflow: "hidden",
  },
  sidebar: { width: 236, borderRightWidth: 1, paddingHorizontal: 14, paddingTop: 112, gap: 8 },
  sidebarItem: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 12,
    paddingHorizontal: 15,
    justifyContent: "center",
  },
  sidebarText: { fontSize: 14, fontWeight: "800" },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  alert: { color: "#FF4D4D", fontSize: 18, lineHeight: 18, fontWeight: "900" },
});
