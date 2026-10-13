import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, withAlpha } from '@/config/theme';

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
  useEffect(() => {
    value.set(withTiming(Math.min(1, Math.max(0, progress)), { duration: 320, easing: Easing.out(Easing.cubic) }));
  }, [progress, value]);
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: value.get() }] }));
  return (
    <View
      style={[styles.track, { height: height + 4, borderColor: withAlpha(color, 0.35) }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
    >
      <Animated.View style={[styles.fill, fill]}>
        {glow ? <View style={[styles.halo, { backgroundColor: color }]} /> : null}
        <LinearGradient
          colors={[withAlpha(color, 0.55), color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {glow ? <View style={styles.edge} /> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderWidth: 1,
    padding: 1,
    backgroundColor: 'rgba(3, 10, 20, 0.7)',
  },
  fill: { height: '100%', width: '100%', transformOrigin: 'left center' },
  halo: { position: 'absolute', top: -2, bottom: -2, left: 0, right: 0, opacity: 0.18 },
  edge: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 2, backgroundColor: colors.cyanBright },
});
