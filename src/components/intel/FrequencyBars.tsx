import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { type SharedValue, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, fonts, space } from '@/config/theme';
import { WEEKDAYS_SHORT } from '@/domain/dates';
import type { WeekdayFrequency } from '@/domain/stats';
import { Text } from '../ui/Text';

/** Consistency per weekday, Monday first. "—" when that weekday never came up. */
export function FrequencyBars({ data }: { data: WeekdayFrequency[] }) {
  const reduced = useReducedMotion();
  const grow = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    grow.set(reduced ? 1 : withTiming(1, { duration: 320 }));
  }, [grow, reduced]);
  const best = Math.max(...data.map((d) => d.rate ?? 0));
  return (
    <View style={styles.row}>
      {data.map((d) => {
        const top = d.rate !== null && d.rate === best && best > 0;
        return (
          <View
            key={d.weekday}
            style={styles.col}
            accessible
            accessibilityLabel={`${WEEKDAYS_SHORT[d.weekday]}: ${d.rate === null ? 'no data' : `${Math.round(d.rate * 100)} percent, ${d.done} of ${d.scheduled}`}`}
          >
            <Text style={[styles.pct, { color: top ? colors.cyanBright : colors.textDim }]} glow={top}>
              {d.rate === null ? '—' : `${Math.round(d.rate * 100)}`}
            </Text>
            <View style={styles.track}>
              <FrequencyFill rate={d.rate ?? 0} grow={grow} top={top} />
            </View>
            <Text variant="label" style={styles.day}>
              {WEEKDAYS_SHORT[d.weekday]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function FrequencyFill({ rate, grow, top }: { rate: number; grow: SharedValue<number>; top: boolean }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - grow.get()) * rate * 54 }, { scaleY: grow.get() }],
  }));
  return <Animated.View style={[styles.fill, { height: `${rate * 100}%` }, top && styles.fillTop, style]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  pct: { fontFamily: fonts.number, fontSize: 13 },
  track: {
    width: '64%',
    height: 110,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(3, 10, 20, 0.6)',
    justifyContent: 'flex-end',
  },
  fill: { width: '100%', backgroundColor: 'rgba(79, 216, 255, 0.55)' },
  fillTop: { backgroundColor: colors.cyan },
  day: { fontSize: 9.5, letterSpacing: 1 },
});
