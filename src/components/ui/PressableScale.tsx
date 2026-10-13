import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics } from '@/services/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** How far it sinks on press. */
  scaleTo?: number;
  /** Light tick on press-in. */
  feedback?: boolean;
}

/** Pressable with a quick, subtle sink. The base press affordance for cards and buttons. */
export function PressableScale({
  style,
  scaleTo = 0.97,
  feedback = false,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <AnimatedPressable
      aria-checked={rest.accessibilityState?.checked}
      aria-selected={rest.accessibilityState?.selected}
      aria-expanded={rest.accessibilityState?.expanded}
      aria-busy={rest.accessibilityState?.busy}
      aria-disabled={rest.disabled || rest.accessibilityState?.disabled}
      {...rest}
      onPressIn={(e) => {
        scale.set(withTiming(reduced ? 1 : scaleTo, { duration: 80 }));
        if (feedback) haptics.tap();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withTiming(1, { duration: 160 }));
        onPressOut?.(e);
      }}
      style={[style, animated]}
    />
  );
}
