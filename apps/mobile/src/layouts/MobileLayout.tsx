import type { ReactNode } from "react";
import { View } from "react-native";
import { AppNavigation, type AppNavigationColors } from "../navigation/AppNavigation";

type Props = {
  children: ReactNode;
  showNavigation: boolean;
  navigationItems: readonly string[];
  activeItem: string;
  notificationCount: number;
  onNavigate: (item: string) => void;
  colors: AppNavigationColors;
  bottomInset: number;
};

export function MobileLayout({ children, showNavigation, navigationItems, activeItem, notificationCount, onNavigate, colors, bottomInset }: Props) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      {children}
      {showNavigation && (
        <AppNavigation
          items={navigationItems}
          activeItem={activeItem}
          notificationCount={notificationCount}
          onNavigate={onNavigate}
          colors={colors}
          variant="bottom"
          bottomInset={bottomInset}
        />
      )}
    </View>
  );
}
