import { type ReactElement, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, space } from '@/config/theme';
import { haptics } from '@/services/haptics';
import { playSound } from '@/services/sound';
import { seeded } from '@/domain/seeded';
import { ParticleBurst } from '../fx/ParticleBurst';
import { FACE_H, FACE_W } from './ItemFace';
import { Text } from '../ui/Text';

const W = FACE_W;
const H = FACE_H;
const COLS = 4;
const ROWS = 5;
const PW = W / COLS;
const PH = H / ROWS;
const DURATION = 850;

/**
 * Pixel dissolve: the card breaks into tiles that drift up and away
 * left-to-right while gold sparks lift off. Each tile renders the real card
 * clipped to its slice (no snapshot library needed). Pass a lightweight face.
 */
export function Disintegrate({ face, onDone }: { face: ReactElement; onDone: () => void }) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const charge = useSharedValue(0);

  useEffect(() => {
    haptics.success();
    playSound('redeem');
    if (reduced) {
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
    charge.set(withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 240 })));
    progress.set(withDelay(160, withTiming(1, { duration: DURATION, easing: Easing.inOut(Easing.quad) })));
    const done = setTimeout(onDone, 160 + DURATION + 340);
    return () => {
      clearTimeout(done);
    };
  }, [charge, onDone, progress, reduced]);

  const wrap = useAnimatedStyle(() => ({ transform: [{ scale: 1 + charge.get() * 0.04 }] }));

  return (
    <View style={styles.root}>
      <Animated.View style={[{ width: W, height: H }, wrap]}>
        {reduced
          ? face
          : Array.from({ length: COLS * ROWS }, (_, i) => (
              <Piece key={i} index={i} progress={progress}>
                {face}
              </Piece>
            ))}
        {reduced ? null : <ParticleBurst burstKey={1} color={colors.gold} count={12} radius={130} duration={1050} gravity={-30} />}
      </Animated.View>
      <Animated.View entering={reduced ? undefined : FadeIn.delay(680).duration(200)} style={styles.caption}>
        <Text variant="label" color={colors.gold} align="center">Reward redeemed</Text>
        <Text variant="title" color={colors.cream} align="center">
          Enjoy your reward
        </Text>
        <Text variant="caption" color={colors.cream} align="center">
          You earned this little moment.
        </Text>
      </Animated.View>
    </View>
  );
}

function Piece({ index, progress, children }: { index: number; progress: SharedValue<number>; children: ReactElement }) {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const delay = (col / COLS) * 0.5 + seeded(index + 1) * 0.15;
  const dx = 50 + seeded(index + 101) * 90;
  const dy = -(30 + seeded(index + 201) * 110);
  const spin = (seeded(index + 301) - 0.5) * 90;
  const style = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, (progress.get() - delay) / 0.35));
    return {
      opacity: 1 - p,
      transform: [
        { translateX: dx * p },
        { translateY: dy * p },
        { rotate: `${spin * p}deg` },
        { scale: 1 - 0.55 * p },
      ],
    };
  });
  return (
    <Animated.View style={[styles.piece, { left: col * PW, top: row * PH }, style]}>
      <View style={{ position: 'absolute', left: -col * PW, top: -row * PH, width: W, height: H }}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', gap: space.xl },
  piece: { position: 'absolute', width: PW + 0.5, height: PH + 0.5, overflow: 'hidden' },
  caption: { gap: space.xs },
});
