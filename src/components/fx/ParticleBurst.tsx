import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { seeded } from '@/domain/seeded';
import { colors } from '@/config/theme';


interface ParticleSpec {
  angle: number;
  distance: number;
  size: number;
  delay: number;
}

function Particle({
  progress,
  spec,
  color,
  gravity,
}: {
  progress: SharedValue<number>;
  spec: ParticleSpec;
  color: string;
  gravity: number;
}) {
  const style = useAnimatedStyle(() => {
    const p = Math.min(1, Math.max(0, (progress.value - spec.delay) / (1 - spec.delay)));
    const travel = 1 - Math.pow(1 - p, 3);
    return {
      opacity: p <= 0 || p >= 1 ? 0 : 1 - p * p,
      transform: [
        { translateX: Math.cos(spec.angle) * spec.distance * travel },
        { translateY: Math.sin(spec.angle) * spec.distance * travel + gravity * p * p },
        { scale: 1 - p * 0.6 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.dot,
        { width: spec.size, height: spec.size, backgroundColor: color },
        style,
      ]}
    />
  );
}

interface Props {
  /** Change this number to fire a burst. 0 = idle. */
  burstKey: number;
  color: string;
  count?: number;
  radius?: number;
  duration?: number;
  /** Positive values pull particles down as they fade. */
  gravity?: number;
}

/** Radial spark burst for completions, level-ups and purchases. Off under reduced motion. */
export function ParticleBurst({ burstKey, color, count = 18, radius = 80, duration = 900, gravity = 18 }: Props) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const specs = useMemo<ParticleSpec[]>(
    () =>
      Array.from({ length: count }, (_, i) => {
        const r = (k: number) => seeded(burstKey * 97 + i * 13 + k);
        return {
          angle: (i / count) * Math.PI * 2 + r(1) * 0.6,
          distance: radius * (0.45 + r(2) * 0.65),
          size: 4 + Math.floor(r(3) * 3) * 2,
          delay: r(4) * 0.18,
        };
      }),
    [burstKey, count, radius],
  );

  useEffect(() => {
    if (!burstKey || reduced) return;
    progress.value = withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(1, { duration, easing: Easing.linear }),
    );
  }, [burstKey, duration, progress, reduced]);

  if (reduced || !burstKey) return null;
  return (
    <View pointerEvents="none" style={styles.origin}>
      {specs.map((spec, i) => (
        <Particle key={i} progress={progress} spec={spec} color={i % 4 === 0 ? colors.gold : i % 4 === 1 ? colors.cream : color} gravity={gravity} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  origin: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { position: 'absolute' },
});
