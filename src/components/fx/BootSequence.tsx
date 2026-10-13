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
import { colors, fonts } from '@/config/theme';
import { ParticleBurst } from './ParticleBurst';

const WORD = 'GHOSTED';
/** Total time on screen. Kept short on purpose: this plays on every cold start. */
export const BOOT_MS = 1250;

function Letter({ char, index }: { char: string; index: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(80 + index * 55, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
  }, [index, t]);
  // Odd letters arrive from the left, even from the right: a brief signal-lock jitter.
  const offset = index % 2 === 0 ? 10 : -10;
  const style = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateX: (1 - t.value) * offset }, { scaleY: 0.6 + t.value * 0.4 }],
  }));
  return <Animated.Text style={[styles.letter, style]}>{char}</Animated.Text>;
}

/** Cold-start ident: letters lock in, a scan line passes, then it fades into the app. */
export function BootSequence({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion();
  const fade = useSharedValue(1);
  const scan = useSharedValue(0);

  useEffect(() => {
    const total = reduced ? 350 : BOOT_MS;
    scan.value = withDelay(420, withTiming(1, { duration: 520, easing: Easing.inOut(Easing.quad) }));
    fade.value = withDelay(total - 260, withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) }));
    const timer = setTimeout(onDone, total);
    return () => clearTimeout(timer);
  }, [fade, onDone, reduced, scan]);

  const root = useAnimatedStyle(() => ({ opacity: fade.value }));
  const line = useAnimatedStyle(() => ({
    opacity: Math.sin(scan.value * Math.PI) * 0.8,
    transform: [{ translateY: -40 + scan.value * 80 }],
  }));

  return (
    <Animated.View style={[styles.root, root]} pointerEvents="none">
      <View style={styles.word}>
        {WORD.split('').map((char, i) => (reduced ? <Animated.Text key={i} style={styles.letter}>{char}</Animated.Text> : <Letter key={i} char={char} index={i} />))}
      </View>
      {reduced ? null : <Animated.View style={[styles.scan, line]} />}
      <ParticleBurst burstKey={reduced ? 0 : 1} color={colors.cyan} count={14} radius={140} duration={1100} gravity={-20} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  word: { flexDirection: 'row' },
  letter: {
    fontFamily: fonts.wordmark,
    fontSize: 40,
    letterSpacing: 6,
    color: colors.cyanBright,
    textShadowColor: 'rgba(79, 216, 255, 0.8)',
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 0 },
  },
  scan: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    height: 1,
    backgroundColor: colors.cyan,
  },
});
