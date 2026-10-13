import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import { colors, fonts } from '@/config/theme';
import { Text } from '../ui/Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const p = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  };
  return `M${p(from)} A${r},${r} 0 ${to - from > 180 ? 1 : 0} 1 ${p(to)}`;
}

/**
 * The private counter dial: segmented track, a heavy cyan arc toward the next
 * marker, crosshair ticks and two restrained red arcs at the flanks.
 */
export function VaultGauge({ days, progress, size = 264 }: { days: number; progress: number; size?: number }) {
  const reduced = useReducedMotion();
  const c = size / 2;
  const r = size * 0.36;
  const circumference = 2 * Math.PI * r;
  const value = useSharedValue(reduced ? progress : 0);

  useEffect(() => {
    value.set(withTiming(Math.min(1, Math.max(0, progress)), { duration: reduced ? 0 : 900, easing: Easing.out(Easing.cubic) }));
  }, [progress, reduced, value]);
  const fill = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - value.get()) }));

  const ticks = [0, 90, 180, 270];
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={`${days} days`}>
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={size * 0.47} stroke={colors.cyan} strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 5" fill="none" />
        <Circle cx={c} cy={c} r={size * 0.29} stroke={colors.cyan} strokeOpacity={0.3} strokeWidth={1} fill="none" />
        <Path d={arc(c, c, size * 0.44, 228, 262)} stroke={colors.danger} strokeWidth={2.5} fill="none" opacity={0.85} />
        <Path d={arc(c, c, size * 0.44, 98, 132)} stroke={colors.danger} strokeWidth={2.5} fill="none" opacity={0.85} />
        <Circle cx={c} cy={c} r={r} stroke={colors.cyan} strokeOpacity={0.16} strokeWidth={size * 0.085} strokeDasharray="2 4" fill="none" />
        <G transform={`rotate(-90 ${c} ${c})`}>
          <Circle cx={c} cy={c} r={r} stroke={colors.cyan} strokeOpacity={0.22} strokeWidth={size * 0.11} fill="none" strokeDasharray={`${circumference} ${circumference}`} />
          <AnimatedCircle
            cx={c}
            cy={c}
            r={r}
            stroke={colors.cyanBright}
            strokeWidth={size * 0.085}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={fill}
          />
        </G>
        {ticks.map((t) => {
          const a = ((t - 90) * Math.PI) / 180;
          const r1 = size * 0.25;
          const r2 = size * 0.5;
          return (
            <G key={t}>
              <Line
                x1={c + r1 * Math.cos(a)}
                y1={c + r1 * Math.sin(a)}
                x2={c + (r1 + 10) * Math.cos(a)}
                y2={c + (r1 + 10) * Math.sin(a)}
                stroke={colors.cyanBright}
                strokeWidth={1.4}
              />
              <Line
                x1={c + (r2 - 12) * Math.cos(a)}
                y1={c + (r2 - 12) * Math.sin(a)}
                x2={c + (r2 - 2) * Math.cos(a)}
                y2={c + (r2 - 2) * Math.sin(a)}
                stroke={colors.cyanBright}
                strokeWidth={1.4}
              />
            </G>
          );
        })}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.days} glow="strong" numberOfLines={1} adjustsFontSizeToFit>
          {days}
        </Text>
        <Text style={styles.unit}>{days === 1 ? 'Day' : 'Days'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  days: { fontFamily: fonts.numberHeavy, fontSize: 70, lineHeight: 78, color: colors.text, maxWidth: '50%' },
  unit: { fontFamily: fonts.display, fontSize: 16, letterSpacing: 6, color: colors.text, textTransform: 'uppercase' },
});
