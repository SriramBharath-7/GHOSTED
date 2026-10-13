import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, G, Line, LinearGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '@/config/theme';
import type { MonthBar } from '@/domain/stats';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const LEFT = 26;
const TOP = 16;
const BOTTOM = 22;

function Bar({ x, w, base, h, grow }: { x: number; w: number; base: number; h: number; grow: SharedValue<number> }) {
  const props = useAnimatedProps(() => ({ y: base - h * grow.get(), height: h * grow.get() }));
  return <AnimatedRect x={x} width={w} fill="url(#barFill)" animatedProps={props} />;
}

/** Completions per month; the faint column behind each bar is what was possible. Bars grow in on mount. */
export function MonthBars({ bars, height = 170 }: { bars: MonthBar[]; height?: number }) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const grow = useSharedValue(reduced ? 1 : 0);
  const key = bars.map((b) => b.month).join('|');

  useEffect(() => {
    if (reduced) {
      grow.set(1);
      return;
    }
    if (width === 0) return;
    grow.set(0);
    grow.set(withDelay(30, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) })));
  }, [grow, key, reduced, width]);

  const innerH = height - TOP - BOTTOM;
  const max = Math.max(4, ...bars.map((b) => Math.max(b.done, b.scheduled)));
  const step = Math.ceil(max / 3);
  const ticks = [0, step, step * 2, step * 3];
  const top = ticks[3];
  const base = TOP + innerH;
  const slot = (width - LEFT) / Math.max(1, bars.length);
  const barW = Math.min(30, slot * 0.5);

  return (
    <View
      style={{ height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={`Completions by month: ${bars.map((b) => `${b.label} ${b.done}`).join(', ')}`}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.success} stopOpacity={0.75} />
              <Stop offset="1" stopColor={colors.success} />
            </LinearGradient>
          </Defs>
          {ticks.map((t) => (
            <G key={t}>
              <Line x1={LEFT} x2={width} y1={base - (t / top) * innerH} y2={base - (t / top) * innerH} stroke={colors.lineStrong} strokeDasharray={t === 0 ? undefined : '3 3'} />
              <SvgText x={LEFT - 6} y={base - (t / top) * innerH + 4} fill={colors.textMuted} fontSize={10} fontFamily={fonts.bodyMedium} textAnchor="end">
                {String(t)}
              </SvgText>
            </G>
          ))}
          {bars.map((bar, i) => {
            const cx = LEFT + slot * i + slot / 2;
            const possible = (bar.scheduled / top) * innerH;
            return (
              <G key={bar.month}>
                {possible > 0 ? (
                  <Rect x={cx - barW / 2} y={base - possible} width={barW} height={possible} fill={colors.cyan} opacity={0.08} />
                ) : null}
                <Bar x={cx - barW / 2} w={barW} base={base} h={(bar.done / top) * innerH} grow={grow} />
                <SvgText x={cx} y={height - 6} fill={colors.textMuted} fontSize={10} fontFamily={fonts.bodyMedium} textAnchor="middle">
                  {bar.label.slice(0, 3).toUpperCase()}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}
