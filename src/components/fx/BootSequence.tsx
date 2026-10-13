import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, space } from '@/config/theme';
import { PixelArt } from '../pixel/PixelArt';
import { Text } from '../ui/Text';
import { ParticleBurst } from './ParticleBurst';

/** Total time on screen. Kept short on purpose: this plays on every cold start. */
export const BOOT_MS = 1250;

/** A companion welcomes you back before the world opens. */
export function BootSequence({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const fade = useSharedValue(1);
  const arrive = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    const total = reduced ? 350 : BOOT_MS;
    arrive.set(withTiming(1, { duration: reduced ? 0 : 400, easing: Easing.out(Easing.cubic) }));
    fade.set(withDelay(total - 260, withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) })));
    const timer = setTimeout(onDone, total);
    return () => clearTimeout(timer);
  }, [arrive, fade, onDone, reduced]);

  const root = useAnimatedStyle(() => ({ opacity: fade.get() }));
  const companion = useAnimatedStyle(() => ({
    opacity: arrive.get(),
    transform: [{ translateY: (1 - arrive.get()) * 12 }],
  }));

  return (
    <Animated.View style={[styles.root, root]} pointerEvents="none">
      <Animated.View style={[styles.companion, companion]}>
        <PixelArt name="ghost" size={124} />
        <View style={styles.shadow} />
      </Animated.View>
      <Text style={styles.word}>GHOSTED</Text>
      <Text variant="caption" color={colors.textDim}>A better you. Every day.</Text>
      <View style={styles.loading}>
        {[0, 1, 2].map((i) => <View key={i} style={[styles.pixel, { opacity: 1 - i * 0.25 }]} />)}
      </View>
      <ParticleBurst burstKey={reduced ? 0 : 1} color={colors.success} count={12} radius={125} duration={900} gravity={-16} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', gap: space.md,
    zIndex: 100,
  },
  companion: { alignItems: 'center', gap: space.sm },
  shadow: { height: 6, width: 64, backgroundColor: colors.lineStrong },
  word: { fontFamily: fonts.wordmark, fontSize: 34, color: colors.wood, letterSpacing: 0 },
  loading: { flexDirection: 'row', gap: 6, marginTop: space.md },
  pixel: { width: 6, height: 6, backgroundColor: colors.success },
});
