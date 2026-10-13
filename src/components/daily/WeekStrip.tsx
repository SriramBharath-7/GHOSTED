import { Check } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, fonts, space } from '@/config/theme';
import { type DateKey, WEEKDAYS_SHORT, addDays, dayOfMonth, weekdayOf } from '@/domain/dates';
import { haptics } from '@/services/haptics';
import { useGame } from '@/state/game';
import { dayProgress } from '@/state/selectors';
import { HudFrame } from '../hud/HudFrame';
import { HudPanel, useBox } from '../hud/HudPanel';
import { Ring } from '../hud/Ring';
import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';

/** Calendar week, Monday first. Upcoming days stay visible but cannot be completed. */
export function WeekStrip({ selected, onSelect }: { selected: DateKey; onSelect: (date: DateKey) => void }) {
  const today = useGame((s) => s.today);
  const habits = useGame((s) => s.habits);
  const recent = useGame((s) => s.recent);
  const monday = addDays(today, -((weekdayOf(today) + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <HudPanel chamfer={12} padding={space.sm} style={styles.strip}>
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
            <Check size={15} color={colors.bg} strokeWidth={3.2} />
          </View>
        ) : total === 0 ? (
          <View style={styles.rest} />
        ) : (
          <Ring progress={done / total} size={28} stroke={2} color={colors.cyan} track="rgba(194, 244, 255, 0.55)" />
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row' },
  cell: { flex: 1, flexDirection: 'row' },
  sep: { width: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong, marginVertical: space.sm },
  day: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.sm, minHeight: 84 },
  upcoming: { opacity: 0.42 },
  weekday: { fontFamily: fonts.displayMedium, fontSize: 10, letterSpacing: 1, color: colors.textDim, textTransform: 'uppercase' },
  date: { fontFamily: fonts.number, fontSize: 20, lineHeight: 25, color: colors.text },
  lit: { color: colors.cyanBright },
  status: { height: 30, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  filled: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rest: { width: 12, height: 2, backgroundColor: colors.lineStrong },
});
