import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors } from '@/config/theme';

interface Props {
  /** 0..1 */
  progress: number;
  color?: string;
  height?: number;
  /** Bright leading edge and soft halo on the fill. */
  glow?: boolean;
}

/** HUD bar: hairline track, cyan fill that eases to new values (never jumps). */
export function ProgressBar({ progress, color = colors.cyan, height = 8, glow = true }: Props) {
  const value = useSharedValue(0);
  const reduced = useReducedMotion();
  const fraction = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  useEffect(() => {
    value.set(withTiming(fraction, { duration: reduced ? 0 : 420, easing: Easing.out(Easing.cubic) }));
  }, [fraction, value, reduced]);
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: value.get() }] }));
  return (
    <View
      style={[styles.track, { height: height + 6 }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
    >
      <Animated.View style={[styles.fill, { backgroundColor: color }, fill]}>
        <View style={styles.highlight} />
        {glow ? <View style={styles.edge} /> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderWidth: 2,
    borderColor: colors.woodDark,
    padding: 1,
    backgroundColor: '#C6BBA2',
    overflow: 'hidden',
  },
  fill: { height: '100%', width: '100%', transformOrigin: 'left center' },
  highlight: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: '#B2F079' },
  edge: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 2, backgroundColor: '#D5FF9B' },
});
