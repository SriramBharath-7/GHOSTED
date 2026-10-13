import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
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
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        scale.set(withTiming(scaleTo, { duration: 90 }));
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
