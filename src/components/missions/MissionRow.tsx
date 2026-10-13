import { router } from 'expo-router';
import { Check, ChevronRight, Plus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, fonts, space } from '@/config/theme';
import { type DateKey, diffDays, formatDate } from '@/domain/dates';
import { type Goal, goalProgress } from '@/repo/goals';
import { haptics } from '@/services/haptics';
import { HudPanel } from '../hud/HudPanel';
import { IconBox } from '../hud/IconBox';
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

/** A mission scroll with separate editor and milestone controls. */
export function MissionRow({ goal, today, onAdvance }: { goal: Goal; today: DateKey; onAdvance: (goal: Goal) => void }) {
  const progress = goalProgress(goal);
  const tags = goal.category
    .split(/[·,]/)
    .map((t) => t.trim())
    .filter(Boolean);
  const due = dueText(goal, today);
  const canAdvance = goal.status === 'active' && progress !== null && progress < 1;

  // Editing and advancing remain separate sibling controls.
  return (
    <HudPanel tone="dim" chamfer={6} padding={space.md} style={[styles.row, goal.status !== 'active' && styles.closed]}>
      <PressableScale
        scaleTo={0.985}
        onPress={() => router.push({ pathname: '/mission-editor', params: { id: String(goal.id) } })}
        accessibilityRole="button"
        accessibilityLabel={`${goal.title}${progress !== null ? `, ${Math.round(progress * 100)} percent` : ''}. Edit`}
        style={styles.main}
      >
        <IconBox icon={goal.icon} size={42} />
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {goal.title}
          </Text>
          {tags.length ? (
            <Text variant="caption" color={colors.textMuted} style={styles.tags} numberOfLines={1}>
              {tags.join('  ·  ')}
            </Text>
          ) : null}
          {progress !== null ? <ProgressBar progress={progress} color={colors.xp} height={7} glow={progress > 0} /> : null}
          {goal.stepsTotal ? <Text variant="caption">{goal.stepsDone} / {goal.stepsTotal} milestones</Text> : null}
          {progress !== null && !goal.stepsTotal ? <Text variant="caption">{Math.round(progress * 100)}% complete</Text> : null}
          {due ? (
            <Text variant="label" style={styles.tags} color={due.includes('overdue') ? colors.textDim : colors.textMuted}>
              {due}
            </Text>
          ) : null}
        </View>
        <ChevronRight size={16} color={colors.textMuted} />
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
        accessibilityState={{ disabled: !canAdvance }}
        accessibilityLabel={goal.stepsTotal ? 'Add one step' : 'Add 10 percent'}
        style={[styles.advance, !canAdvance && styles.inactive]}
      >
        {goal.status === 'done' ? <Check size={20} color={colors.cream} strokeWidth={3} /> : <Plus size={20} color={colors.cream} strokeWidth={3} />}
        <Text style={styles.step}>{goal.status === 'done' ? 'Done' : goal.stepsTotal ? 'Step' : '10%'}</Text>
      </PressableScale>
    </HudPanel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  main: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  closed: { opacity: 0.6 },
  body: { flex: 1, minWidth: 0, gap: 5 },
  title: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 21, color: colors.text },
  tags: { fontSize: 10, letterSpacing: 0.3 },
  advance: { width: 48, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 2, borderBottomWidth: 4, borderColor: colors.forest, backgroundColor: colors.success },
  step: { fontFamily: fonts.bodySemi, fontSize: 10, lineHeight: 13, color: colors.cream },
  inactive: { opacity: 0.45 },
});
