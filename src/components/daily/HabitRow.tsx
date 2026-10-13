import { LinearGradient } from 'expo-linear-gradient';
import { Check, ChevronRight } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, motion, space, withAlpha } from '@/config/theme';
import type { Habit } from '@/repo/habits';
import { FloatUp } from '../fx/FloatUp';
import { HudFrame } from '../hud/HudFrame';
import { useBox } from '../hud/HudPanel';
import { LineIcon } from '../hud/icons';
import { PressableScale } from '../ui/PressableScale';
import { ProgressBar } from '../ui/ProgressBar';
import { Text } from '../ui/Text';
import { toast } from '../ui/Toast';

interface Props {
  habit: Habit;
  done: boolean;
  onToggle: () => Promise<boolean>;
  /** Opens Intel; receives the row's window Y so Intel can grow from it. */
  onOpen: (fromY: number) => void;
  /** Quiet second line: streak or missed run. */
  note?: { text: string; tone: 'dim' | 'warn' } | null;
  showRewards?: boolean;
}

/**
 * One habit, one tap. A completed quest stamps green and its earned rewards rise.
 */
export function HabitRow({ habit, done, onToggle, onOpen, note, showRewards = true }: Props) {
  const reduced = useReducedMotion();
  const { box, onLayout } = useBox();
  const rowRef = useRef<View>(null);
  const highlight = useSharedValue(0);
  const fill = useSharedValue(done ? 1 : 0);
  const sweep = useSharedValue(0);
  const contraction = useSharedValue(1);
  const pending = useRef(false);
  const [burst, setBurst] = useState(0);

  useEffect(() => {
    fill.set(withTiming(done ? 1 : 0, { duration: motion.fast, easing: Easing.out(Easing.back(1.6)) }));
  }, [done, fill]);

  const toggle = async () => {
    if (pending.current) return;
    pending.current = true;
    try {
      const completed = await onToggle();
      if (!completed || reduced) return;
      if (showRewards) setBurst((n) => n + 1);
      contraction.set(withSequence(withTiming(0.987, { duration: 80 }), withTiming(1, { duration: 220 })));
      highlight.set(withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 240 })));
      sweep.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 320, easing: Easing.inOut(Easing.quad) })));
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update this habit.', 'error');
    } finally {
      pending.current = false;
    }
  };

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ scale: contraction.get() }] }));
  const dot = useAnimatedStyle(() => ({ opacity: fill.get(), transform: [{ scale: 0.4 + fill.get() * 0.6 }] }));
  const flash = useAnimatedStyle(() => ({
    opacity: sweep.get() > 0 && sweep.get() < 1 ? 1 : 0,
    transform: [{ translateX: -120 + sweep.get() * ((box?.w ?? 300) + 120) }],
  }));

  return (
    <Animated.View ref={rowRef} style={[styles.row, rowStyle]} onLayout={onLayout}>
      {box ? (
        <HudFrame
          width={box.w}
          height={box.h}
          chamfer={5}
          tone={done ? 'active' : 'dim'}
          fill={done ? '#E5F1D1' : colors.panel}
          corners={false}
          highlight={highlight}
        />
      ) : null}
      <View style={styles.clip} pointerEvents="none">
        <Animated.View style={[styles.flash, flash]}>
          <LinearGradient
            colors={[withAlpha(colors.gold, 0), withAlpha(colors.gold, 0.45), withAlpha(colors.gold, 0)]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      <PressableScale
        scaleTo={0.985}
        onPress={() => rowRef.current?.measureInWindow((_x, y) => onOpen(y))}
        accessibilityRole="button"
        accessibilityLabel={`${habit.title}. Open Intel`}
        style={styles.body}
      >
        <View style={[styles.icon, { borderBottomColor: habit.accent }]}>
          <LineIcon name={habit.icon} size={35} color={colors.success} />
        </View>
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={2}>
            {habit.title}
          </Text>
          {note ? (
            <Text variant="label" style={styles.note} color={note.tone === 'warn' ? colors.textDim : colors.textMuted}>
              {note.text}
            </Text>
          ) : habit.description ? <Text variant="caption" style={styles.description} numberOfLines={1}>{habit.description}</Text> : null}
          <View style={styles.progressLine}>
            <View style={styles.progress}><ProgressBar progress={done ? 1 : 0} height={4} color={colors.success} glow={false} /></View>
            <Text variant="caption" style={styles.reward}>{done ? '1/1' : showRewards ? `+${habit.xpReward} XP · ${habit.coinReward} GC` : '0/1'}</Text>
          </View>
        </View>
        <ChevronRight size={16} color={colors.textMuted} />
      </PressableScale>
      <PressableScale
        scaleTo={0.86}
        hitSlop={8}
        onPress={() => void toggle()}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={habit.title}
        accessibilityHint={done ? 'Double tap to undo' : 'Double tap to mark complete'}
        style={styles.checkHit}
      >
        <View style={[styles.circle, done && styles.circleDone]}>
          <Animated.View style={[styles.dot, dot]}>
            <Check size={24} color={colors.cream} strokeWidth={3.5} />
          </Animated.View>
        </View>
        <FloatUp nonce={burst} text={`+${habit.xpReward} XP`} offset={-4} />
        <FloatUp nonce={burst} text={`+${habit.coinReward} GC`} color={colors.coin} offset={26} />
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 94, paddingRight: 4, zIndex: 0 },
  clip: { position: 'absolute', top: 1, bottom: 1, left: 1, right: 1, overflow: 'hidden' },
  flash: { position: 'absolute', top: 0, bottom: 0, width: 120 },
  body: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', paddingLeft: space.md, gap: space.sm },
  icon: { width: 44, height: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.lineStrong, borderBottomWidth: 4, backgroundColor: colors.surfaceHigh },
  text: { flex: 1, minWidth: 0, gap: 3, paddingVertical: space.md },
  name: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 20, color: colors.text },
  note: { fontSize: 9, letterSpacing: 0.25 },
  description: { fontSize: 11, lineHeight: 14 },
  progressLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  progress: { flex: 1 },
  reward: { fontSize: 10, lineHeight: 13 },
  checkHit: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: 36,
    height: 36,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.wood,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: { borderColor: colors.forest },
  dot: {
    width: 30,
    height: 30,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
