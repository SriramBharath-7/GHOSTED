import { router } from 'expo-router';
import { Plus, SlidersHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { DailyPanel } from '@/components/daily/DailyPanel';
import { WeekStrip } from '@/components/daily/WeekStrip';
import { AppHeader } from '@/components/hud/AppHeader';
import { GhostAvatar } from '@/components/hud/GhostAvatar';
import { HudPanel } from '@/components/hud/HudPanel';
import { SystemButton } from '@/components/hud/SystemButton';
import { Reveal, Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { colors, space } from '@/config/theme';
import { type DateKey, formatLongDay } from '@/domain/dates';
import { useGame } from '@/state/game';

export default function DailyScreen() {
  const { width } = useWindowDimensions();
  const today = useGame((s) => s.today);
  const todayXp = useGame((s) => s.player.todayXp);
  // null = "today", so the screen follows the date across midnight on its own.
  const [picked, setPicked] = useState<DateKey | null>(null);
  const selected = picked ?? today;
  const avatarW = Math.round((Math.min(width, 520) - space.lg * 2) * 0.5);

  return (
    <Screen header={<AppHeader />}>
      <Reveal index={0}>
        <HudPanel double chamfer={16} padding={space.md} style={styles.hero}>
          <GhostAvatar width={avatarW} height={Math.round(avatarW * 1.08)} />
          <View style={styles.heroText}>
            <Text variant="title" glow style={styles.heroTitle}>
              Daily Discipline
            </Text>
            <View style={styles.rule} />
            <Text variant="label" style={styles.line}>
              Build the man you’re meant to be.
            </Text>
            <Text variant="label" color={colors.textMuted} style={styles.line}>
              “Small disciplines compound into an unstoppable you.”
            </Text>
            <View style={styles.rule} />
            <Text variant="caption" color={colors.textDim}>
              {selected === today ? `${formatLongDay(today)} · +${todayXp} XP` : `Editing ${formatLongDay(selected)}`}
            </Text>
          </View>
        </HudPanel>
      </Reveal>
      <Reveal index={1}>
        <WeekStrip selected={selected} onSelect={(day) => setPicked(day === today ? null : day)} />
      </Reveal>
      <Reveal index={2}>
        <DailyPanel date={selected} notes />
      </Reveal>
      <Reveal index={3}>
        <View style={styles.actions}>
          <View style={styles.flex}>
            <SystemButton label="Add habit" icon={Plus} compact onPress={() => router.push('/habit-editor')} />
          </View>
          <View style={styles.flex}>
            <SystemButton label="Manage" icon={SlidersHorizontal} compact onPress={() => router.push('/habits')} />
          </View>
        </View>
      </Reveal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', gap: space.md, alignItems: 'stretch' },
  heroText: { flex: 1, justifyContent: 'center', gap: space.sm },
  heroTitle: { fontSize: 14, letterSpacing: 3 },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong },
  line: { fontSize: 10, lineHeight: 16, letterSpacing: 2 },
  actions: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
});
