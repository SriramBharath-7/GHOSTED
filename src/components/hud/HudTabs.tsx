import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, fonts, motion } from '@/config/theme';
import { haptics } from '@/services/haptics';
import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';
import { HudFrame } from './HudFrame';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface Props<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  height?: number;
  /** Smaller type for many tabs in one row. */
  dense?: boolean;
}

/** Segmented HUD control; the lit frame slides between options. */
export function HudTabs<T extends string>({ options, value, onChange, height = 52, dense }: Props<T>) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const slot = width > 0 ? (width - 8) / options.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    if (slot > 0) x.set(withTiming(4 + index * slot, { duration: motion.base, easing: Easing.out(Easing.cubic) }));
  }, [index, slot, x]);
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View style={[styles.row, { height }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
      {width > 0 ? <HudFrame width={width} height={height} chamfer={8} tone="dim" /> : null}
      {slot > 0 ? (
        <Animated.View style={[styles.indicator, { width: slot, height: height - 8 }, indicator]} pointerEvents="none">
          <HudFrame width={slot} height={height - 8} chamfer={6} tone="active" />
        </Animated.View>
      ) : null}
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <PressableScale
            key={option.value}
            scaleTo={0.95}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            onPress={() => {
              if (active) return;
              haptics.tap();
              onChange(option.value);
            }}
            style={[styles.item, dense && styles.itemDense]}
          >
            {Icon ? <Icon size={dense ? 15 : 18} color={active ? colors.cyanBright : colors.textMuted} strokeWidth={1.8} /> : null}
            <Text
              style={[styles.label, dense && styles.labelDense, { color: active ? colors.cyanBright : colors.textMuted }]}
              glow={active}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {option.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  indicator: { position: 'absolute', left: 0, top: 4 },
  item: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch' },
  itemDense: { flexDirection: 'column', gap: 3 },
  label: { fontFamily: fonts.displaySemi, fontSize: 12.5, letterSpacing: 2.5, textTransform: 'uppercase' },
  labelDense: { fontSize: 8.5, letterSpacing: 0.4 },
});
