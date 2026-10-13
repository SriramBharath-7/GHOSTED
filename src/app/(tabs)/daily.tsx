import { router } from 'expo-router';
import { Plus, SlidersHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DailyPanel } from '@/components/daily/DailyPanel';
import { WeekStrip } from '@/components/daily/WeekStrip';
import { AppHeader } from '@/components/hud/AppHeader';
import { SystemButton } from '@/components/hud/SystemButton';
import { WorldScene } from '@/components/pixel/WorldScene';
import { Reveal, Screen } from '@/components/ui/Screen';
import { space } from '@/config/theme';
import { type DateKey, formatLongDay } from '@/domain/dates';
import { useGame } from '@/state/game';

export default function DailyScreen() {
  const today = useGame((s) => s.today);
  const todayXp = useGame((s) => s.player.todayXp);
  // null follows the date across midnight; a correction keeps its chosen date.
  const [picked, setPicked] = useState<DateKey | null>(null);
  const selected = picked ?? today;

  return (
    <Screen header={<AppHeader />}>
      <Reveal index={0}>
        <WorldScene variant="daily" title="Daily quests" subtitle={selected === today ? `${formatLongDay(today)} · ${todayXp} XP earned` : `Journal: ${formatLongDay(selected)}`} height={154} />
      </Reveal>
      <Reveal index={1}><WeekStrip selected={selected} onSelect={(day) => setPicked(day === today ? null : day)} /></Reveal>
      <Reveal index={2}><DailyPanel date={selected} notes /></Reveal>
      <Reveal index={3}>
        <View style={styles.actions}>
          <View style={styles.flex}><SystemButton label="Add habit" icon={Plus} compact onPress={() => router.push('/habit-editor')} /></View>
          <View style={styles.flex}><SystemButton label="Manage" icon={SlidersHorizontal} compact onPress={() => router.push('/habits')} /></View>
        </View>
      </Reveal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
});
