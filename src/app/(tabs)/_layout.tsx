import { Tabs } from 'expo-router/tabs';
import { TabBar } from '@/components/nav/TabBar';
import { colors } from '@/config/theme';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        animation: 'fade',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Player' }} />
      <Tabs.Screen name="daily" options={{ title: 'Daily' }} />
      <Tabs.Screen name="missions" options={{ title: 'Missions' }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop' }} />
      <Tabs.Screen name="inventory" options={{ title: 'Inventory' }} />
    </Tabs>
  );
}
