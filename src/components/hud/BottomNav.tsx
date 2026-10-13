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
import { PixelArt, type PixelArtName } from '../pixel/PixelArt';

export const NAV_TABS: readonly { name: string; label: string; icon: LucideIcon; href: string }[] = [
  { name: 'index', label: 'Player', icon: User, href: '/' },
  { name: 'daily', label: 'Daily', icon: CalendarDays, href: '/daily' },
  { name: 'missions', label: 'Missions', icon: Swords, href: '/missions' },
  { name: 'shop', label: 'Shop', icon: ShoppingCart, href: '/shop' },
  { name: 'inventory', label: 'Inventory', icon: Backpack, href: '/inventory' },
];

const PAD = 6;
const HEIGHT = 70;
const TAB_ART: PixelArtName[] = ['home', 'calendar', 'swords', 'shop', 'backpack'];

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
    if (slot > 0) x.set(withTiming(PAD + activeIndex * slot, { duration: reduced ? 0 : motion.base, easing: Easing.out(Easing.cubic) }));
  }, [activeIndex, slot, x, reduced]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const landingStyle = useAnimatedStyle(() => ({ opacity: landing.get() }));
  const inventoryIcon = useAnimatedStyle(() => ({ transform: [{ scale: 1 + landing.get() * 0.14 }] }));

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(bottomInset, space.sm) }]}>
      <View style={styles.bar} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
        {width > 0 ? <HudFrame width={width} height={HEIGHT} chamfer={6} tone="cyan" fill={colors.woodDark} /> : null}
        {slot > 0 ? (
          <Animated.View style={[styles.indicator, { width: slot }, indicator]} pointerEvents="none">
            <HudFrame width={slot} height={HEIGHT - PAD * 2} chamfer={4} tone="active" fill={colors.wood} />
          </Animated.View>
        ) : null}
        {slot > 0 ? (
          <Animated.View style={[styles.indicator, { left: PAD + slot * 4, width: slot }, landingStyle]} pointerEvents="none">
            <HudFrame width={slot} height={HEIGHT - PAD * 2} chamfer={8} tone="active" />
          </Animated.View>
        ) : null}
        {NAV_TABS.map((tab, index) => {
          const active = index === activeIndex;
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
                <PixelArt name={TAB_ART[index]} size={26} style={{ opacity: active ? 1 : 0.65 }} />
              </Animated.View>
              <Text
                style={[styles.label, { color: active ? colors.cream : '#C3B19A' }]}
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
  wrap: { paddingHorizontal: space.md, paddingTop: space.sm, backgroundColor: colors.forest, width: '100%' },
  bar: { height: HEIGHT, flexDirection: 'row', paddingHorizontal: PAD, alignItems: 'center', zIndex: 0 },
  indicator: { position: 'absolute', left: 0, top: PAD, height: HEIGHT - PAD * 2, zIndex: 0 },
  item: { flex: 1, height: HEIGHT - PAD * 2, alignItems: 'center', justifyContent: 'center', gap: 4 },
  label: { fontFamily: fonts.bodySemi, fontSize: 10, letterSpacing: 0.2, textTransform: 'uppercase' },
});
