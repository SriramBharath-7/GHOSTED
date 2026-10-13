import { router } from 'expo-router';
import { Bell, ChevronLeft, type LucideIcon, Settings } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { TOUCH, colors, fonts, space } from '@/config/theme';
import { formatClock } from '@/domain/dates';
import { remindersSupported } from '@/services/notifications';
import { useGame } from '@/state/game';
import { completedSet, dueOn, remindersActive } from '@/state/selectors';
import { Sheet } from '../ui/Sheet';
import { Text } from '../ui/Text';
import { PixelArt } from '../pixel/PixelArt';
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
  const compact = useWindowDimensions().width < 360;
  const habits = useGame((s) => s.habits);
  const recent = useGame((s) => s.recent);
  const today = useGame((s) => s.today);
  const remindersOn = useGame(remindersActive);
  const [open, setOpen] = useState(false);
  const due = dueOn(habits, today);
  const pending = due.filter((h) => !completedSet(recent, h.id).has(today));

  return (
    <View style={[styles.row, compact && styles.compactRow]}>
      {back ? <HeaderButton icon={ChevronLeft} label="Back" onPress={() => router.back()} /> : null}
      {!back || ghost ? <GhostAvatar width={32} height={36} variant="companion" /> : null}
      <View style={styles.brand} accessibilityRole="header">
        <View style={styles.wordRow}>
          <Text style={[styles.wordmark, compact && styles.compactWordmark]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
            GHOSTED
          </Text>
        </View>
        <Text style={styles.tagline} numberOfLines={1}>
          A better you. Every day.
        </Text>
      </View>
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
        <Text variant="title">Today’s quest log</Text>
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
                  {done ? 'Done' : remindersOn && habit.reminderEnabled && habit.reminderTime ? formatClock(habit.reminderTime) : 'Open'}
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
      fill={colors.wood}
      chamfer={4}
      padding={0}
      scaleTo={0.92}
      feedback
      style={styles.button}
    >
      {Icon === Bell ? <PixelArt name="bell" size={25} /> : Icon === Settings ? <PixelArt name="settings" size={25} /> : <Icon size={22} color={colors.cream} strokeWidth={2.5} />}
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
  brand: { flex: 1, gap: 2, minWidth: 0 },
  compactRow: { paddingHorizontal: space.md, gap: 6 },
  compactWordmark: { fontSize: 20, lineHeight: 26 },
  wordRow: { flexDirection: 'row', alignItems: 'flex-start' },
  wordmark: {
    fontFamily: fonts.wordmark,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: 0,
    color: colors.cream,
    flexShrink: 1,
  },
  tagline: { fontFamily: fonts.bodyMedium, fontSize: 10, letterSpacing: 0.2, color: '#D7DFC1' },
  button: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderWidth: 1,
    borderColor: colors.woodDark,
    backgroundColor: colors.gold,
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
