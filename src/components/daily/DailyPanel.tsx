import { router } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, space } from '@/config/theme';
import type { DateKey } from '@/domain/dates';
import { useGame } from '@/state/game';
import { completedSet, dueOn, habitNote } from '@/state/selectors';
import { HudPanel } from '../hud/HudPanel';
import { SectionTitle } from '../ui/Card';
import { Text } from '../ui/Text';
import { HabitRow } from './HabitRow';

/** The Daily Discipline list for one day: header with progress, then habit rows. */
export function DailyPanel({ date, notes = false }: { date: DateKey; notes?: boolean }) {
  const habits = useGame((s) => s.habits);
  const recent = useGame((s) => s.recent);
  const today = useGame((s) => s.today);
  const setHabitDone = useGame((s) => s.setHabitDone);
  const due = dueOn(habits, date);
  const done = due.filter((h) => completedSet(recent, h.id).has(date)).length;

  return (
    <HudPanel double chamfer={14} style={styles.panel}>
      <SectionTitle icon={CalendarDays} title="Daily Discipline" right={`${done} / ${due.length} complete`} />
      {due.length === 0 ? (
        <Text variant="caption" style={styles.empty}>
          {habits.length === 0 ? 'No habits yet. Add the ones you already track.' : 'Rest day. Nothing is scheduled.'}
        </Text>
      ) : (
        <View style={styles.rows}>
          {due.map((habit) => {
            const isDone = completedSet(recent, habit.id).has(date);
            return (
              <HabitRow
                key={habit.id}
                habit={habit}
                done={isDone}
                showRewards={date === today}
                note={notes ? habitNote(habit, recent, today) : null}
                onToggle={async () => (await setHabitDone(habit.id, date, !isDone))?.completed ?? false}
                onOpen={(fromY) =>
                  router.push({ pathname: '/habit/[id]', params: { id: String(habit.id), y: String(Math.round(fromY)) } })
                }
              />
            );
          })}
        </View>
      )}
    </HudPanel>
  );
}

const styles = StyleSheet.create({
  panel: { gap: space.md },
  rows: { gap: space.sm },
  empty: { color: colors.textMuted, paddingVertical: space.lg, textAlign: 'center' },
});
