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
    <View style={styles.list}>
      {data.map((d) => {
        const top = d.rate !== null && d.rate === best && best > 0;
        return (
          <View
            key={d.weekday}
            style={styles.row}
            accessible
            accessibilityLabel={`${WEEKDAYS_SHORT[d.weekday]}: ${d.rate === null ? 'no data' : `${Math.round(d.rate * 100)} percent, ${d.done} of ${d.scheduled}`}`}
          >
            <Text variant="bodyStrong" style={styles.day}>{WEEKDAYS_SHORT[d.weekday]}</Text>
            <View style={styles.track}>
              <FrequencyFill rate={d.rate ?? 0} grow={grow} top={top} />
            </View>
            <Text style={[styles.pct, { color: top ? colors.success : colors.textDim }]}>
              {d.rate === null ? '—' : `${Math.round(d.rate * 100)}%`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function FrequencyFill({ rate, grow, top }: { rate: number; grow: SharedValue<number>; top: boolean }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ scaleX: grow.get() }],
  }));
  return <Animated.View style={[styles.fill, { width: `${rate * 100}%` }, top && styles.fillTop, style]} />;
}

const styles = StyleSheet.create({
  list: { gap: space.md },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center', minHeight: 28 },
  pct: { width: 44, fontFamily: fonts.number, fontSize: 15, textAlign: 'right' },
  track: {
    flex: 1,
    height: 18,
    borderWidth: 2,
    borderColor: colors.lineStrong,
    backgroundColor: colors.bg,
  },
  fill: { height: '100%', backgroundColor: colors.success, opacity: 0.72, transformOrigin: 'left center' },
  fillTop: { backgroundColor: colors.success, opacity: 1 },
  day: { width: 34, fontSize: 13 },
});
