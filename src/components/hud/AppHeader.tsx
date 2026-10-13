import { router } from 'expo-router';
import { Bell, ChevronLeft, type LucideIcon, Settings } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { TOUCH, colors, fonts, space } from '@/config/theme';
import { formatClock } from '@/domain/dates';
import { remindersSupported } from '@/services/notifications';
import { useGame } from '@/state/game';
import { completedSet, dueOn } from '@/state/selectors';
import { Sheet } from '../ui/Sheet';
import { Text } from '../ui/Text';
import { GhostAvatar } from './GhostAvatar';
import { HudPressable } from './HudPanel';
import { LineIcon } from './icons';

interface Props {
  /** Ghost thumbnail beside the wordmark (Missions, Vault). */
  ghost?: boolean;
  back?: boolean;
  /** Hide the bell/settings controls (Vault). */
  controls?: boolean;
  /** Extra trailing control (e.g. the Vault lock). */
  right?: ReactNode;
}

/** GHOSTED wordmark with the System controls. Top of every main screen. */
export function AppHeader({ ghost, back, controls = true, right }: Props) {
  const { width } = useWindowDimensions();
  // Size the wordmark to the room left beside the controls (no reliance on auto-shrink).
  const room = Math.min(width, 520) - space.lg * 2 - (back ? 56 : 0) - (ghost ? 68 : 0) - (controls ? 112 : 0) - (right ? 56 : 0);
  const markSize = Math.max(18, Math.min(34, room / 6.4));
  const habits = useGame((s) => s.habits);
  const recent = useGame((s) => s.recent);
  const today = useGame((s) => s.today);
  const [open, setOpen] = useState(false);
  const due = dueOn(habits, today);
  const pending = due.filter((h) => !completedSet(recent, h.id).has(today));

  return (
    <View style={styles.row}>
      {back ? <HeaderButton icon={ChevronLeft} label="Back" onPress={() => router.back()} /> : null}
      <View style={styles.brand} accessibilityRole="header">
        <View style={styles.wordRow}>
          <Text style={[styles.wordmark, { fontSize: markSize, lineHeight: markSize * 1.18 }]} numberOfLines={1} glow="strong">
            GHOSTED
          </Text>
          <Text style={styles.tm}>™</Text>
        </View>
        <Text style={[styles.tagline, { fontSize: Math.min(11, markSize * 0.33), letterSpacing: Math.min(4, markSize * 0.085) }]} numberOfLines={1}>
          Discipline creates freedom
        </Text>
      </View>
      {ghost ? <GhostAvatar width={60} height={64} variant="thumb" /> : null}
      {right}
      {controls ? (
        <>
          <View>
            <HeaderButton icon={Bell} label={`Today: ${pending.length} open`} onPress={() => setOpen(true)} />
            {pending.length > 0 ? <View style={styles.dot} pointerEvents="none" /> : null}
          </View>
          <HeaderButton icon={Settings} label="Settings" onPress={() => router.push('/settings')} />
        </>
      ) : null}

      <Sheet visible={open} onClose={() => setOpen(false)}>
        <Text variant="title">System · Today</Text>
        <Text variant="caption">
          {pending.length === 0
            ? due.length
              ? 'Every habit is done. Nothing is waiting on you.'
              : 'Nothing is scheduled today.'
            : `${pending.length} of ${due.length} still open.`}
        </Text>
        <View style={styles.list}>
          {due.map((habit) => {
            const done = completedSet(recent, habit.id).has(today);
            return (
              <View key={habit.id} style={styles.item}>
                <LineIcon name={habit.icon} size={20} color={done ? colors.cyan : colors.textDim} />
                <Text variant="bodyStrong" style={styles.flex} numberOfLines={1} color={done ? colors.textDim : colors.text}>
                  {habit.title}
                </Text>
                <Text variant="label" color={done ? colors.cyan : colors.textMuted}>
                  {done ? 'Done' : habit.reminderEnabled && habit.reminderTime ? formatClock(habit.reminderTime) : 'Open'}
                </Text>
              </View>
            );
          })}
        </View>
        {!remindersSupported ? (
          <Text variant="caption" color={colors.textMuted}>
            Reminders run in the installed app (not Expo Go on Android or the web preview).
          </Text>
        ) : null}
      </Sheet>
    </View>
  );
}

function HeaderButton({ icon: Icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <HudPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      tone="cyan"
      chamfer={4}
      padding={0}
      scaleTo={0.92}
      feedback
      style={styles.button}
    >
      <Icon size={22} color={colors.cyanBright} strokeWidth={1.7} />
    </HudPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.md,
  },
  brand: { flex: 1, gap: 2 },
  wordRow: { flexDirection: 'row', alignItems: 'flex-start' },
  wordmark: {
    fontFamily: fonts.wordmark,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 1.5,
    color: colors.cyanBright,
    flexShrink: 1,
  },
  tm: { fontFamily: fonts.bodySemi, fontSize: 9, color: colors.textDim, marginLeft: 2, marginTop: 4 },
  tagline: { fontFamily: fonts.body, fontSize: 11, letterSpacing: 4, color: colors.textDim },
  button: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.cyan,
  },
  list: { gap: space.xs },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 46,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  flex: { flex: 1 },
});
