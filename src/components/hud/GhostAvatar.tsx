import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '@/config/theme';
import { type CharacterState, useFx } from '@/state/fx';
import { HudFrame } from './HudFrame';

const GHOST = require('../../../assets/ghost.png');

/** How strongly each character cue lights the portrait. */
const REACTION: Record<CharacterState, { glow: number; scan: boolean }> = {
  idle: { glow: 0, scan: false },
  habitComplete: { glow: 0.55, scan: false },
  training: { glow: 0.45, scan: false },
  reading: { glow: 0.3, scan: false },
  celebrate: { glow: 0.8, scan: true },
  levelUp: { glow: 1, scan: true },
  victory: { glow: 0.9, scan: true },
};

interface Props {
  width: number;
  height: number;
  /** Small header thumbnails skip the frame details and reactions. */
  variant?: 'card' | 'thumb';
}

/**
 * The player: Ghost on a dark HUD plate. Reacts to character cues with a short
 * cyan pulse and, for big moments, a scan sweep.
 */
export function GhostAvatar({ width, height, variant = 'card' }: Props) {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  const scan = useSharedValue(0);
  const thumb = variant === 'thumb';

  useEffect(() => {
    if (thumb) return;
    return useFx.subscribe((state, prev) => {
      const cue = state.character;
      if (cue.nonce === prev.character.nonce || reduced) return;
      const r = REACTION[cue.state];
      if (r.glow > 0) {
        pulse.set(withSequence(withTiming(r.glow, { duration: 160 }), withTiming(0, { duration: 900 })));
      }
      if (r.scan) {
        scan.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })));
      }
    });
  }, [pulse, reduced, scan, thumb]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.35 + pulse.get() * 0.65 }));
  const scanStyle = useAnimatedStyle(() => ({
    opacity: scan.get() > 0 && scan.get() < 1 ? 0.9 : 0,
    transform: [{ translateY: scan.get() * height }],
  }));

  return (
    <View
      style={{ width, height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Ghost, your player"
    >
      <View style={[styles.plate, { width, height }]}>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <Pattern id="ghostGrid" width={16} height={16} patternUnits="userSpaceOnUse">
              <Path d="M16 0 L0 0 0 16" fill="none" stroke={colors.cyan} strokeOpacity={0.07} strokeWidth={1} />
            </Pattern>
          </Defs>
          <Rect width={width} height={height} fill="#040B16" />
          <Rect width={width} height={height} fill="url(#ghostGrid)" />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
          <Svg width={width} height={height}>
            <Defs>
              <RadialGradient id="ghostGlow" cx="50%" cy="38%" rx="55%" ry="50%">
                <Stop offset="0" stopColor={colors.cyan} stopOpacity={0.32} />
                <Stop offset="1" stopColor={colors.cyan} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect width={width} height={height} fill="url(#ghostGlow)" />
          </Svg>
        </Animated.View>
        <Image source={GHOST} style={styles.image} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(4,11,22,0)', 'rgba(4,11,22,0.58)']}
          style={[styles.fade, { height: height * 0.22 }]}
          pointerEvents="none"
        />
        {thumb ? null : <Animated.View style={[styles.scan, scanStyle]} pointerEvents="none" />}
      </View>
      <HudFrame width={width} height={height} chamfer={thumb ? 4 : 10} tone="dim" fill="transparent" corners={!thumb} />
    </View>
  );
}

const styles = StyleSheet.create({
  plate: { position: 'absolute', overflow: 'hidden' },
  image: { position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  scan: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: colors.cyanBright,
  },
});
