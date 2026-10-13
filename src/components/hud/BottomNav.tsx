import { Backpack, CalendarDays, type LucideIcon, ShoppingCart, Swords, User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { colors, fonts, motion, space } from '@/config/theme';
import { haptics } from '@/services/haptics';
import { useFx } from '@/state/fx';
import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';
import { HudFrame } from './HudFrame';

export const NAV_TABS: readonly { name: string; label: string; icon: LucideIcon; href: string }[] = [
  { name: 'index', label: 'Player', icon: User, href: '/' },
  { name: 'daily', label: 'Daily', icon: CalendarDays, href: '/daily' },
  { name: 'missions', label: 'Missions', icon: Swords, href: '/missions' },
  { name: 'shop', label: 'Shop', icon: ShoppingCart, href: '/shop' },
  { name: 'inventory', label: 'Inventory', icon: Backpack, href: '/inventory' },
];

const PAD = 6;
const HEIGHT = 70;

interface Props {
  activeIndex: number;
  onSelect: (index: number) => void;
  bottomInset: number;
  /** Stack screens can return to their parent tab even when it is highlighted. */
  allowActivePress?: boolean;
}

/** Framed five-slot bar. The lit frame slides to the selected tab. */
export function BottomNav({ activeIndex, onSelect, bottomInset, allowActivePress = false }: Props) {
  const [width, setWidth] = useState(0);
  const reduced = useReducedMotion();
  const acquiredId = useFx((s) => s.queue[0]?.type === 'acquired' ? s.queue[0].id : null);
  const slot = width > 0 ? (width - PAD * 2) / NAV_TABS.length : 0;
  const x = useSharedValue(0);
  const landing = useSharedValue(0);

  useEffect(() => {
    if (acquiredId === null || reduced) return;
    landing.set(withDelay(1400, withSequence(withTiming(1, { duration: 110 }), withTiming(0, { duration: 220 }))));
  }, [acquiredId, landing, reduced]);

  useEffect(() => {
    if (slot > 0) x.set(withTiming(PAD + activeIndex * slot, { duration: motion.base, easing: Easing.out(Easing.cubic) }));
  }, [activeIndex, slot, x]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const landingStyle = useAnimatedStyle(() => ({ opacity: landing.get() }));
  const inventoryIcon = useAnimatedStyle(() => ({ transform: [{ scale: 1 + landing.get() * 0.14 }] }));

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(bottomInset, space.sm) }]}>
      <View style={styles.bar} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
        {width > 0 ? <HudFrame width={width} height={HEIGHT} chamfer={12} tone="cyan" fill={colors.panelStrong} /> : null}
        {slot > 0 ? (
          <Animated.View style={[styles.indicator, { width: slot }, indicator]} pointerEvents="none">
            <HudFrame width={slot} height={HEIGHT - PAD * 2} chamfer={8} tone="active" />
          </Animated.View>
        ) : null}
        {slot > 0 ? (
          <Animated.View style={[styles.indicator, { left: PAD + slot * 4, width: slot }, landingStyle]} pointerEvents="none">
            <HudFrame width={slot} height={HEIGHT - PAD * 2} chamfer={8} tone="active" />
          </Animated.View>
        ) : null}
        {NAV_TABS.map((tab, index) => {
          const active = index === activeIndex;
          const Icon = tab.icon;
          return (
            <PressableScale
              key={tab.name}
              scaleTo={0.92}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
              onPress={() => {
                if (active && !allowActivePress) return;
                haptics.tap();
                onSelect(index);
              }}
              style={styles.item}
            >
              <Animated.View style={tab.name === 'inventory' ? inventoryIcon : undefined}>
                <Icon size={22} color={active ? colors.cyanBright : colors.textDim} strokeWidth={active ? 2 : 1.6} />
              </Animated.View>
              <Text
                style={[styles.label, { color: active ? colors.cyanBright : colors.textDim }]}
                glow={active}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {tab.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.md, paddingTop: space.sm, backgroundColor: colors.bg },
  bar: { height: HEIGHT, flexDirection: 'row', paddingHorizontal: PAD, alignItems: 'center' },
  indicator: { position: 'absolute', left: 0, top: PAD, height: HEIGHT - PAD * 2 },
  item: { flex: 1, height: HEIGHT - PAD * 2, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontFamily: fonts.displayMedium, fontSize: 8.5, letterSpacing: 0.6, textTransform: 'uppercase' },
});
