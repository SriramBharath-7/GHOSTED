import { type ReactNode, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, motion, space } from '@/config/theme';
import { HudBackground } from '../hud/HudBackground';

interface Props {
  children: ReactNode;
  /** Fixed content above the scroll area (e.g. AppHeader). */
  header?: ReactNode;
  /** Fixed content below the scroll area (e.g. a BottomNav on stack screens). */
  footer?: ReactNode;
  scroll?: boolean;
  /** Backdrop tint; the Vault passes red. */
  tint?: string;
}

/** Page shell: System backdrop, safe areas, consistent gutters. */
export function Screen({ children, header, footer, scroll = true, tint }: Props) {
  const insets = useSafeAreaInsets();
  const bottom = { paddingBottom: (footer ? space.lg : insets.bottom + space.xxl) };
  return (
    <View style={styles.root}>
      <HudBackground tint={tint} />
      <View style={{ paddingTop: insets.top, backgroundColor: tint === colors.vault ? colors.vaultBg : colors.forest }}>{header}</View>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, bottom]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill, bottom]}>{children}</View>
      )}
      {footer}
    </View>
  );
}

/**
 * Panels rise a few pixels and fade in, staggered by `index`, on first mount.
 * Plain transform/opacity (not a layout animation) so it always keeps its
 * layout slot and never blocks taps.
 */
export function Reveal({ index = 0, children }: { index?: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    t.set(withDelay(index * motion.stagger, withTiming(1, { duration: motion.base, easing: Easing.out(Easing.cubic) })));
  }, [index, reduced, t]);
  const style = useAnimatedStyle(() => ({ opacity: t.get(), transform: [{ translateY: (1 - t.get()) * 10 }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.md, width: '100%', maxWidth: 680, alignSelf: 'center' },
  fill: { flex: 1 },
});
