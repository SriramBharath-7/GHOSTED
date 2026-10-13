import { AlarmClock, CalendarDays, ChartNoAxesColumnIncreasing, type LucideIcon, Pencil } from 'lucide-react-native';
import { useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, fonts, space } from '@/config/theme';
import { formatClock } from '@/domain/dates';
import { describeMask } from '@/domain/schedule';
import type { Habit } from '@/repo/habits';
import { GhostAvatar } from '../hud/GhostAvatar';
import { HudPanel } from '../hud/HudPanel';
import { IconBox } from '../hud/IconBox';
import { SectionTitle } from '../ui/Card';
import { IconButton } from '../ui/IconButton';
import { Text } from '../ui/Text';

interface Props {
  habit: Habit;
  /** Window Y of the row that was tapped; the card grows out of it. */
  fromY: number | null;
  onEdit: () => void;
}

/** Habit identity card. Opens by expanding out of the tapped habit row. */
export function IntelHero({ habit, fromY, onEdit }: Props) {
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();
  const ref = useRef<View>(null);
  const shift = useSharedValue(0);
  const scale = useSharedValue(fromY !== null && !reduced ? 0.94 : 1);
  const shown = useSharedValue(fromY !== null && !reduced ? 0 : 1);

  const onLayout = () => {
    if (fromY === null || reduced || shown.get() === 1) return;
    ref.current?.measureInWindow((_x, y) => {
      shift.set(fromY - y);
      shown.set(1);
      const ease = { duration: 300, easing: Easing.out(Easing.cubic) };
      shift.set(withTiming(0, ease));
      scale.set(withTiming(1, ease));
    });
  };

  const style = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ translateY: shift.get() }, { scale: scale.get() }],
  }));
  const avatar = Math.round((Math.min(width, 520) - space.lg * 2) * 0.27);

  return (
    <Animated.View ref={ref} onLayout={onLayout} style={style}>
      <HudPanel double chamfer={16} padding={space.md} style={styles.panel}>
        <SectionTitle icon={ChartNoAxesColumnIncreasing} title="Habit Intel" right="Analytics" />
        <HudPanel tone="dim" chamfer={10} padding={space.md} style={styles.inner}>
          <View style={styles.top}>
            <GhostAvatar width={avatar} height={Math.round(avatar * 1.15)} variant="thumb" />
            <View style={styles.identity}>
              <View style={styles.titleRow}>
                <IconBox icon={habit.icon} size={30} />
                <Text variant="label" style={[styles.small, styles.flex]}>Habit</Text>
                <IconButton icon={Pencil} label="Edit habit" size={18} onPress={onEdit} />
              </View>
              <Text style={styles.name} numberOfLines={3}>
                {habit.title}
              </Text>
              {habit.question || habit.description ? (
                <Text variant="caption" color={colors.cyanBright} numberOfLines={2}>
                  {habit.question || habit.description}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.rule} />
          <View style={styles.facts}>
            <Fact icon={CalendarDays} label="Schedule" value={habit.archived ? 'Archived' : describeMask(habit.daysMask)} />
            <Fact
              icon={AlarmClock}
              label="Reminder"
              value={habit.reminderEnabled && habit.reminderTime ? formatClock(habit.reminderTime) : 'Off'}
            />
          </View>
        </HudPanel>
      </HudPanel>
    </Animated.View>
  );
}

function Fact({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <HudPanel tone="dim" chamfer={6} padding={space.sm} style={styles.fact}>
      <Icon size={22} color={colors.cyan} strokeWidth={1.6} />
      <View style={styles.flex}>
        <Text variant="label" style={styles.small}>
          {label}
        </Text>
        <Text style={styles.factValue} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      </View>
    </HudPanel>
  );
}

const styles = StyleSheet.create({
  panel: { gap: space.md },
  inner: { gap: space.md, paddingHorizontal: space.sm },
  top: { flexDirection: 'row', gap: space.md },
  identity: { flex: 1, gap: space.sm, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  flex: { flex: 1 },
  small: { fontSize: 9.5 },
  name: { fontFamily: fonts.bodySemi, fontSize: 21, lineHeight: 26, color: colors.text },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong },
  facts: { flexDirection: 'row', gap: space.sm },
  fact: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  factValue: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text },
});
