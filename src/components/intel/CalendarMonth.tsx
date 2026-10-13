import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, space } from '@/config/theme';
import {
  type DateKey,
  type MonthKey,
  addMonths,
  dayOfMonth,
  daysInMonth,
  firstOfMonth,
  monthLabel,
  monthOf,
  weekdayOf,
  addDays,
} from '@/domain/dates';
import { type HabitHistory, dayStatus } from '@/domain/stats';
import { IconButton } from '../ui/IconButton';
import { PressableScale } from '../ui/PressableScale';
import { Text } from '../ui/Text';

const HEAD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface Props {
  history: HabitHistory;
  month: MonthKey;
  onMonthChange: (month: MonthKey) => void;
  onSelectDay: (date: DateKey) => void;
}

/** Month grid, Monday first. Tap any past day to inspect or correct it. */
export function CalendarMonth({ history, month, onMonthChange, onSelectDay }: Props) {
  const lead = (weekdayOf(firstOfMonth(month)) + 6) % 7; // Monday-first offset
  const cells: (DateKey | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth(month) }, (_, i) => addDays(firstOfMonth(month), i)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const isCurrent = month >= monthOf(history.today);
  const counts = cells.reduce(
    (acc, day) => {
      if (!day) return acc;
      const s = dayStatus(history, day);
      if (s === 'done') acc.done++;
      if (s === 'missed') acc.missed++;
      return acc;
    },
    { done: 0, missed: 0 },
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.nav}>
        <IconButton icon={ChevronLeft} label="Previous month" onPress={() => onMonthChange(addMonths(month, -1))} />
        <View style={styles.navTitle}>
          <Text variant="heading">
            {monthLabel(month, true)} {month.slice(0, 4)}
          </Text>
          <Text variant="caption" color={colors.textMuted}>
            {counts.done} done · {counts.missed} missed
          </Text>
        </View>
        <IconButton
          icon={ChevronRight}
          label="Next month"
          disabled={isCurrent}
          onPress={() => onMonthChange(addMonths(month, 1))}
        />
      </View>
      <View style={styles.grid}>
        {HEAD.map((d, i) => (
          <View key={`h${i}`} style={styles.cell}>
            <Text variant="label" style={styles.head}>
              {d}
            </Text>
          </View>
        ))}
        {cells.map((day, i) =>
          day ? (
            <DayCell key={day} day={day} history={history} onPress={() => onSelectDay(day)} />
          ) : (
            <View key={`e${i}`} style={styles.cell} />
          ),
        )}
      </View>
    </View>
  );
}

function DayCell({ day, history, onPress }: { day: DateKey; history: HabitHistory; onPress: () => void }) {
  const status = dayStatus(history, day);
  const isToday = day === history.today;
  const future = status === 'future';
  return (
    <View style={styles.cell}>
      <PressableScale
        disabled={future}
        onPress={onPress}
        scaleTo={0.88}
        accessibilityRole="button"
        accessibilityLabel={`${day}: ${status}`}
        style={[
          styles.day,
          status === 'done' && styles.done,
          status === 'missed' && styles.missed,
          (status === 'pending' || isToday) && styles.today,
          (status === 'rest' || status === 'untracked' || future) && styles.dim,
        ]}
      >
        <Text
          variant="bodyStrong"
          color={status === 'done' ? colors.bg : status === 'missed' ? colors.textDim : colors.text}
          style={styles.num}
        >
          {dayOfMonth(day)}
        </Text>
        {status === 'missed' ? <View style={styles.slash} pointerEvents="none" /> : null}
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  nav: { flexDirection: 'row', alignItems: 'center' },
  navTitle: { flex: 1, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3, alignItems: 'center', justifyContent: 'center' },
  head: { fontSize: 10 },
  day: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(79, 216, 255, 0.1)',
    overflow: 'hidden',
  },
  done: { backgroundColor: colors.cyan, borderColor: colors.cyanBright },
  missed: { borderColor: 'rgba(79, 216, 255, 0.28)' },
  today: { borderColor: colors.cyanBright, borderWidth: 1.5 },
  dim: { opacity: 0.38 },
  num: { fontSize: 14 },
  slash: {
    position: 'absolute',
    width: '140%',
    height: 1,
    backgroundColor: 'rgba(166, 193, 212, 0.35)',
    transform: [{ rotate: '-45deg' }],
  },
});
