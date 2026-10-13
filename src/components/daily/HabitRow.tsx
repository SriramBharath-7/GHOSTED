import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
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
import { colors, fonts, motion, space } from '@/config/theme';
import type { Habit } from '@/repo/habits';
import { FloatUp } from '../fx/FloatUp';
import { HudFrame } from '../hud/HudFrame';
import { useBox } from '../hud/HudPanel';
import { LineIcon } from '../hud/icons';
import { PressableScale } from '../ui/PressableScale';
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
 * One habit, one tap. Completing it fills the circle, pulses the border, sweeps
 * a cyan flash across the row and floats the rewards up, then settles.
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
          fill={done ? 'rgba(79, 216, 255, 0.07)' : 'rgba(5, 16, 30, 0.45)'}
          corners={false}
          highlight={highlight}
        />
      ) : null}
      <View style={styles.clip} pointerEvents="none">
        <Animated.View style={[styles.flash, flash]}>
          <LinearGradient
            colors={['rgba(79,216,255,0)', 'rgba(79,216,255,0.32)', 'rgba(79,216,255,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      <View style={[styles.tick, { backgroundColor: habit.accent }]} />
      <PressableScale
        scaleTo={0.985}
        onPress={() => rowRef.current?.measureInWindow((_x, y) => onOpen(y))}
        accessibilityRole="button"
        accessibilityLabel={`${habit.title}. Open Intel`}
        style={styles.body}
      >
        <View style={styles.icon}>
          <LineIcon name={habit.icon} size={24} color={colors.cyan} />
        </View>
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={2}>
            {habit.title}
          </Text>
          {note ? (
            <Text variant="label" style={styles.note} color={note.tone === 'warn' ? colors.textDim : colors.textMuted}>
              {note.text}
            </Text>
          ) : null}
        </View>
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
            <Check size={16} color={colors.bg} strokeWidth={3} />
          </Animated.View>
        </View>
        <FloatUp nonce={burst} text={`+${habit.xpReward} XP`} offset={-4} />
        <FloatUp nonce={burst} text={`+${habit.coinReward} ◎`} color={colors.text} offset={14} />
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 58, paddingRight: space.sm },
  clip: { position: 'absolute', top: 1, bottom: 1, left: 1, right: 1, overflow: 'hidden' },
  flash: { position: 'absolute', top: 0, bottom: 0, width: 120 },
  tick: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 2, opacity: 0.8 },
  body: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', paddingLeft: space.md, gap: space.md },
  icon: { width: 30, alignItems: 'center' },
  text: { flex: 1, gap: 1, paddingVertical: space.sm },
  name: { fontFamily: fonts.bodyMedium, fontSize: 16.5, lineHeight: 22, color: colors.text },
  note: { fontSize: 9.5, letterSpacing: 1.4 },
  checkHit: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.6,
    borderColor: colors.cyanBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: { borderColor: colors.cyan },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
