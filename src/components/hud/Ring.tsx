import { useEffect } from 'react';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/config/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  /** 0..1 */
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
}

/** Circular progress (missions, week days). Animates to new values. */
export function Ring({ progress, size = 36, stroke = 3, color = colors.cyan, track = 'rgba(79, 216, 255, 0.18)' }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const value = useSharedValue(0);
  useEffect(() => {
    value.set(withTiming(Math.min(1, Math.max(0, progress)), { duration: 320, easing: Easing.out(Easing.cubic) }));
  }, [progress, value]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - value.get()) }));
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="butt"
        fill="none"
        strokeDasharray={`${c} ${c}`}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}
