import { Check } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, fonts, space } from '@/config/theme';
import { type DateKey, WEEKDAYS_SHORT, addDays, dayOfMonth, weekdayOf } from '@/domain/dates';
import { haptics } from '@/services/haptics';
import { useGame } from '@/state/game';
import { dayProgress } from '@/state/selectors';
import { HudFrame } from '../hud/HudFrame';
import { HudPanel, useBox } from '../hud/HudPanel';
import { PressableScale } from '../ui/PressableScale';
import { ProgressBar } from '../ui/ProgressBar';
import { Text } from '../ui/Text';

/** Calendar week, Monday first. Upcoming days stay visible but cannot be completed. */
export function WeekStrip({ selected, onSelect }: { selected: DateKey; onSelect: (date: DateKey) => void }) {
  const today = useGame((s) => s.today);
  const habits = useGame((s) => s.habits);
  const recent = useGame((s) => s.recent);
  const monday = addDays(today, -((weekdayOf(today) + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <HudPanel padding={space.sm} style={styles.strip}>
      {days.map((day, i) => {
        const { done, total } = dayProgress(habits, recent, day);
        return (
          <View key={day} style={styles.cell}>
            {i > 0 ? <View style={styles.sep} /> : null}
            <Day
              day={day}
              label={day === today ? 'Today' : WEEKDAYS_SHORT[weekdayOf(day)]}
              done={done}
              total={total}
              active={day === selected}
              upcoming={day > today}
              onPress={() => {
                if (day === selected) return;
                haptics.tap();
                onSelect(day);
              }}
            />
          </View>
        );
      })}
    </HudPanel>
  );
}

function Day({
  day,
  label,
  done,
  total,
  active,
  upcoming,
  onPress,
}: {
  day: DateKey;
  label: string;
  done: number;
  total: number;
  active: boolean;
  upcoming: boolean;
  onPress: () => void;
}) {
  const { box, onLayout } = useBox();
  const complete = total > 0 && done === total;
  return (
    <PressableScale
      scaleTo={0.92}
      onPress={onPress}
      onLayout={onLayout}
      accessibilityRole="tab"
      disabled={upcoming}
      accessibilityState={{ selected: active, disabled: upcoming }}
      accessibilityLabel={`${label} ${dayOfMonth(day)}: ${upcoming ? 'upcoming' : `${done} of ${total} done`}`}
      style={[styles.day, upcoming && styles.upcoming]}
    >
      {active && box ? <HudFrame width={box.w} height={box.h} chamfer={5} tone="active" corners={false} /> : null}
      <Text style={[styles.weekday, active && styles.lit]} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
      <Text style={[styles.date, active && styles.lit]} glow={active}>
        {dayOfMonth(day)}
      </Text>
      <View style={styles.status}>
        {upcoming ? (
          <View style={styles.rest} />
        ) : complete ? (
          <View style={styles.filled}>
            <Check size={17} color={colors.cream} strokeWidth={3.2} />
          </View>
        ) : total === 0 ? (
          <View style={styles.rest} />
        ) : (
          <View style={styles.progress}><ProgressBar progress={done / total} height={5} color={colors.success} glow={false} /></View>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row' },
  cell: { flex: 1, flexDirection: 'row' },
  sep: { width: 1, backgroundColor: colors.line, marginVertical: space.sm },
  day: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: space.sm, minHeight: 86, zIndex: 0 },
  upcoming: { opacity: 0.42 },
  weekday: { fontFamily: fonts.bodySemi, fontSize: 10, color: colors.textDim, textTransform: 'uppercase' },
  date: { fontFamily: fonts.number, fontSize: 21, lineHeight: 26, color: colors.text },
  lit: { color: colors.success },
  status: { height: 24, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  filled: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.forest,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: { width: 27 },
  rest: { width: 12, height: 2, backgroundColor: colors.lineStrong },
});
