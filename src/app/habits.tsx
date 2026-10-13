import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { LineIcon } from '@/components/hud/icons';
import { SectionTitle } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { IconButton } from '@/components/ui/IconButton';
import { ReorderRow } from '@/components/ui/ReorderRow';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { WorldScene } from '@/components/pixel/WorldScene';
import { colors, space } from '@/config/theme';
import type { Db } from '@/db/db';
import { getDb } from '@/db/database';
import { describeMask } from '@/domain/schedule';
import { type Habit, listHabits } from '@/repo/habits';
import { moved, saveOrder } from '@/repo/order';
import { useGame } from '@/state/game';
import { useLiveQuery } from '@/state/useLiveQuery';

const loadAll = (db: Db) => listHabits(db, { includeArchived: true });

export default function HabitsScreen() {
  const all = useLiveQuery(loadAll) ?? [];
  const commit = useGame((s) => s.commit);
  const active = all.filter((h) => !h.archived);
  const archived = all.filter((h) => h.archived);

  const move = async (index: number, direction: -1 | 1) => {
    await saveOrder(getDb(), 'habits', moved(active.map((h) => h.id), index, direction));
    await commit();
  };

  const edit = (habit: Habit) => router.push({ pathname: '/habit-editor', params: { id: String(habit.id) } });

  return (
    <Screen
      header={
        <Header
          back
          eyebrow="Quest workshop"
          title="Habits"
          right={<IconButton icon={Plus} label="Add habit" onPress={() => router.push('/habit-editor')} />}
        />
      }
    >
      <WorldScene variant="daily" title="Build your daily loadout" subtitle="Small quests. A stronger you." compact />
      <Text variant="caption" color={colors.textMuted}>
        Order here is the order on Player and Daily.
      </Text>
      <View style={styles.list}>
        {active.map((habit, i) => (
          <ReorderRow
            key={habit.id}
            label={habit.title}
            onPress={() => edit(habit)}
            onMove={(d) => void move(i, d)}
            first={i === 0}
            last={i === active.length - 1}
          >
            <HabitLine habit={habit} />
          </ReorderRow>
        ))}
      </View>
      <Button label="Add a habit" kind="secondary" icon={Plus} onPress={() => router.push('/habit-editor')} />

      {archived.length > 0 ? (
        <>
          <SectionTitle title="Archived" />
          <Text variant="caption" color={colors.textMuted}>
            Hidden from Daily. History and stats are kept.
          </Text>
          <View style={styles.list}>
            {archived.map((habit) => (
              <ReorderRow key={habit.id} label={habit.title} onPress={() => router.push(`/habit/${habit.id}`)}>
                <HabitLine habit={habit} />
              </ReorderRow>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function HabitLine({ habit }: { habit: Habit }) {
  return (
    <>
      <View style={[styles.dot, { backgroundColor: habit.accent, opacity: habit.archived ? 0.4 : 1 }]} />
      <LineIcon name={habit.icon} size={24} color={habit.archived ? colors.textMuted : colors.cyan} />
      <View style={styles.text}>
        <Text variant="bodyStrong" numberOfLines={1} color={habit.archived ? colors.textDim : colors.text}>
          {habit.title}
        </Text>
        <Text variant="caption">
          {habit.archived ? 'Archived' : describeMask(habit.daysMask)} · {habit.xpReward} XP
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  dot: { width: 4, height: 32 },
  text: { flex: 1, gap: 2 },
});
