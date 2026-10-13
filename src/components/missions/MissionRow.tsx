import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, fonts, space } from '@/config/theme';
import { type DateKey, diffDays, formatDate } from '@/domain/dates';
import { type Goal, goalProgress } from '@/repo/goals';
import { haptics } from '@/services/haptics';
import { HudPanel } from '../hud/HudPanel';
import { IconBox } from '../hud/IconBox';
import { Ring } from '../hud/Ring';
import { PressableScale } from '../ui/PressableScale';
import { ProgressBar } from '../ui/ProgressBar';
import { Text } from '../ui/Text';

function dueText(goal: Goal, today: DateKey): string | null {
  if (goal.status !== 'active') return goal.status === 'done' ? 'Complete' : 'Dropped';
  if (goal.startDate && goal.startDate > today) return `Starts ${formatDate(goal.startDate, today)}`;
  if (!goal.targetDate) return null;
  const days = diffDays(today, goal.targetDate);
  if (days < 0) return `${-days}d overdue`;
  if (days === 0) return 'Due today';
  return `${days}d left`;
}

/** A mission: icon, title, tags, progress; the ring adds one step. */
export function MissionRow({ goal, today, onAdvance }: { goal: Goal; today: DateKey; onAdvance: (goal: Goal) => void }) {
  const progress = goalProgress(goal);
  const tags = goal.category
    .split(/[·,]/)
    .map((t) => t.trim())
    .filter(Boolean);
  const due = dueText(goal, today);
  const canAdvance = goal.status === 'active' && progress !== null && progress < 1;

  // The row body and the "+1" ring are sibling controls, never nested.
  return (
    <HudPanel tone="dim" chamfer={6} padding={space.md} style={[styles.row, goal.status !== 'active' && styles.closed]}>
      <PressableScale
        scaleTo={0.985}
        onPress={() => router.push({ pathname: '/mission-editor', params: { id: String(goal.id) } })}
        accessibilityRole="button"
        accessibilityLabel={`${goal.title}${progress !== null ? `, ${Math.round(progress * 100)} percent` : ''}. Edit`}
        style={styles.main}
      >
        <IconBox icon={goal.icon} size={46} />
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {goal.title}
          </Text>
          {tags.length ? (
            <Text variant="label" color={colors.cyan} style={styles.tags} numberOfLines={1}>
              {tags.join('  ·  ')}
            </Text>
          ) : null}
          {progress !== null ? <ProgressBar progress={progress} height={5} glow={progress > 0} /> : null}
          {due ? (
            <Text variant="label" style={styles.tags} color={due.includes('overdue') ? colors.textDim : colors.textMuted}>
              {due}
            </Text>
          ) : null}
        </View>
        <View style={styles.side}>
          {goal.stepsTotal ? (
            <Text style={styles.count}>
              {goal.stepsDone} / {goal.stepsTotal}
            </Text>
          ) : null}
          {progress !== null ? <Text style={styles.pct}>{Math.round(progress * 100)}%</Text> : null}
        </View>
      </PressableScale>
      <PressableScale
        disabled={!canAdvance}
        scaleTo={0.88}
        hitSlop={6}
        onPress={() => {
          haptics.complete();
          onAdvance(goal);
        }}
        accessibilityRole="button"
        accessibilityLabel={goal.stepsTotal ? 'Add one step' : 'Add 10 percent'}
        style={styles.ring}
      >
        <Ring progress={progress ?? 0} size={34} stroke={3} />
      </PressableScale>
      <ChevronRight size={20} color={colors.textDim} />
    </HudPanel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  closed: { opacity: 0.6 },
  body: { flex: 1, gap: 5 },
  title: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 21, color: colors.text },
  tags: { fontSize: 9, letterSpacing: 1 },
  side: { alignItems: 'flex-end' },
  count: { fontFamily: fonts.number, fontSize: 17, color: colors.text, fontVariant: ['tabular-nums'] },
  pct: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textDim },
  ring: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
});
