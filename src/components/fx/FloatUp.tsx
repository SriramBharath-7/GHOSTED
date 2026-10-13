import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { colors, fonts, glow } from '@/config/theme';

/** "+40 XP" that rises and fades from where the user tapped. Fires when `nonce` changes. */
export function FloatUp({
  nonce,
  text,
  color = colors.cyanBright,
  offset = 0,
  duration = 650,
}: {
  nonce: number;
  text: string;
  color?: string;
  /** Vertical start offset, to stack two floats (XP over coins). */
  offset?: number;
  duration?: number;
}) {
  const t = useSharedValue(1);
  useEffect(() => {
    if (!nonce) return;
    t.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration, easing: Easing.out(Easing.cubic) })));
  }, [duration, nonce, t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.get() >= 1 ? 0 : 1 - t.get() * t.get(),
    transform: [{ translateY: offset - t.get() * 30 }],
  }));
  if (!nonce) return null;
  return (
    <Animated.Text pointerEvents="none" style={[styles.text, glow.textSoft, { color }, style]}>
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    position: 'absolute',
    right: 0,
    top: -8,
    fontFamily: fonts.number,
    fontSize: 14,
    letterSpacing: 0.6,
  },
});
