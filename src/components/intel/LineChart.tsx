import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '@/config/theme';
import type { SeriesPoint } from '@/domain/stats';
import { Text } from '../ui/Text';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);
const PAD = { left: 32, right: 12, top: 10, bottom: 24 };
const TICKS = [0, 0.25, 0.5, 0.75, 1];

/**
 * Completion over time. Gaps (no opportunities) break the line instead of
 * faking zeros. The line draws itself in on mount.
 */
export function LineChart({ points, color = colors.cyan, height = 200 }: { points: SeriesPoint[]; color?: string; height?: number }) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const draw = useSharedValue(reduced ? 1 : 0);
  const key = points.map((p) => p.key).join('|');

  useEffect(() => {
    if (reduced) {
      draw.set(1);
      return;
    }
    if (width === 0) return;
    draw.set(0);
    draw.set(withDelay(30, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) })));
  }, [draw, key, reduced, width]);

  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + (1 - v) * innerH;

  const runs: { i: number; v: number }[][] = [];
  points.forEach((p, i) => {
    if (p.value === null) return;
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1].i === i - 1) last.push({ i, v: p.value });
    else runs.push([{ i, v: p.value }]);
  });
  let length = 0;
  for (const run of runs) {
    for (let k = 1; k < run.length; k++) {
      length += Math.hypot(x(run[k].i) - x(run[k - 1].i), y(run[k].v) - y(run[k - 1].v));
    }
  }
  const line = runs
    .map((run) => run.map((pt, k) => `${k === 0 ? 'M' : 'L'}${x(pt.i).toFixed(1)},${y(pt.v).toFixed(1)}`).join(' '))
    .join(' ');
  const area = runs
    .filter((run) => run.length > 1)
    .map(
      (run) =>
        `M${x(run[0].i)},${y(0)} ` +
        run.map((pt) => `L${x(pt.i).toFixed(1)},${y(pt.v).toFixed(1)}`).join(' ') +
        ` L${x(run[run.length - 1].i)},${y(0)} Z`,
    )
    .join(' ');
  const valid = points.filter((p) => p.value !== null);
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: (1 - draw.get()) * Math.max(1, length) }));
  const fadeProps = useAnimatedProps(() => ({ opacity: draw.get() }));

  return (
    <View
      style={{ height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={`Score trend. ${valid.length ? `Latest ${Math.round((valid[valid.length - 1].value ?? 0) * 100)} percent` : 'No data yet'}`}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.3} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {TICKS.map((v) => (
            <G key={v}>
              <Line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke={colors.cyan} strokeOpacity={v === 0 ? 0.35 : 0.1} />
              <SvgText x={PAD.left - 6} y={y(v) + 4} fill={colors.textMuted} fontSize={10} fontFamily={fonts.bodyMedium} textAnchor="end">
                {String(v * 100)}
              </SvgText>
            </G>
          ))}
          {points.map((p, i) =>
            i % labelEvery === 0 || i === points.length - 1 ? (
              <G key={p.key}>
                <Line x1={x(i)} x2={x(i)} y1={PAD.top} y2={y(0)} stroke={colors.cyan} strokeOpacity={0.06} />
                <SvgText x={x(i)} y={height - 7} fill={colors.textMuted} fontSize={10} fontFamily={fonts.bodyMedium} textAnchor={i === points.length - 1 ? 'end' : i === 0 ? 'start' : 'middle'}>
                  {p.label.toUpperCase()}
                </SvgText>
              </G>
            ) : null,
          )}
          {area ? (
            <AnimatedG animatedProps={fadeProps}>
              <Path d={area} fill="url(#trendArea)" />
            </AnimatedG>
          ) : null}
          {line ? (
            <>
              <Path d={line} stroke={color} strokeOpacity={0.18} strokeWidth={6} fill="none" strokeLinejoin="round" />
              <AnimatedPath
                d={line}
                stroke={color}
                strokeWidth={2}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={`${Math.max(1, length)} ${Math.max(1, length)}`}
                animatedProps={lineProps}
              />
            </>
          ) : null}
          <AnimatedG animatedProps={fadeProps}>
            {runs.flat().map((pt) => (
              <Circle key={pt.i} cx={x(pt.i)} cy={y(pt.v)} r={2.4} fill={colors.cyanBright} />
            ))}
          </AnimatedG>
        </Svg>
      ) : null}
      {width > 0 && valid.length === 0 ? (
        <View style={styles.empty} pointerEvents="none">
          <Text variant="caption">No completions in this range yet</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    position: 'absolute',
    top: 0,
    left: PAD.left,
    right: 0,
    bottom: PAD.bottom,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
