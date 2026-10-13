import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useFx } from '@/state/fx';
import { HudFrame } from './HudFrame';
import { PixelArt } from '../pixel/PixelArt';

interface Props { width: number; height: number; variant?: 'card' | 'thumb' | 'companion' }

/** The companion reacts to existing engine cues; no new reward or event logic. */
export function GhostAvatar({ width, height, variant = 'card' }: Props) {
  const reduced = useReducedMotion();
  const jump = useSharedValue(0);
  const [happy, setHappy] = useState(false);
  useFocusEffect(useCallback(() => {
    if (variant === 'thumb') return;
    let reset: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useFx.subscribe((state, previous) => {
      if (state.character.nonce === previous.character.nonce || state.character.state === 'idle') return;
      setHappy(true);
      if (!reduced) jump.set(withSequence(withTiming(1, { duration: 150 }), withTiming(0, { duration: 240 })));
      clearTimeout(reset);
      reset = setTimeout(() => setHappy(false), 1100);
    });
    return () => { unsubscribe(); clearTimeout(reset); cancelAnimation(jump); setHappy(false); };
  }, [jump, reduced, variant]));
  const reaction = useAnimatedStyle(() => ({ transform: [{ translateY: -jump.get() * 6 }, { scale: 1 + jump.get() * 0.12 }] }));
  return (
    <View style={{ width, height, zIndex: 0 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {variant === 'card' ? <HudFrame width={width} height={height} tone="dim" /> : null}
      <Animated.View style={[styles.center, reaction]}>
        <PixelArt name={happy ? 'ghostCelebrate' : 'ghost'} width={width} height={height} />
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center' } });
