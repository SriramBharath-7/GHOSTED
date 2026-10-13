import type { BottomTabBarProps } from 'expo-router/tabs';
import { BottomNav } from '../hud/BottomNav';

/** Adapts the Expo Router tab state to the HUD bottom nav. */
export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  return (
    <BottomNav
      activeIndex={state.index}
      bottomInset={insets.bottom}
      onSelect={(index) => {
        const route = state.routes[index];
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!event.defaultPrevented) navigation.navigate(route.name, route.params);
      }}
    />
  );
}
