import { memo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '@/config/theme';
import { seeded } from '@/domain/seeded';
import { chamferPath } from './HudFrame';

/** Faint circuit traces near the edges, fixed per screen size (deterministic). */
function traces(w: number, h: number): string {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const left = i % 2 === 0;
    const y = h * (0.12 + seeded(i + 3) * 0.76);
    const x0 = left ? 6 : w - 6;
    const run = 14 + seeded(i + 11) * 26;
    const drop = 10 + seeded(i + 19) * 40;
    const dir = left ? 1 : -1;
    out.push(`M${x0},${y} H${x0 + dir * run} L${x0 + dir * (run + 10)},${y + 10} V${y + 10 + drop}`);
  }
  return out.join(' ');
}

/**
 * Static System backdrop: deep navy, a faint grid, two pools of light, edge
 * traces and a thin screen frame. Rendered once per screen, never animated.
 */
export const HudBackground = memo(function HudBackground({ tint = colors.cyan }: { tint?: string }) {
  const { width: w, height: h } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const top = insets.top + 2;
  const frameH = h - top - Math.max(insets.bottom, 4) - 2;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={w} height={h}>
        <Defs>
          <Pattern id="grid" width={32} height={32} patternUnits="userSpaceOnUse">
            <Path d="M32 0 L0 0 0 32" fill="none" stroke={tint} strokeOpacity={0.05} strokeWidth={1} />
          </Pattern>
          <RadialGradient id="topGlow" cx="50%" cy="0%" rx="80%" ry="40%">
            <Stop offset="0" stopColor={tint} stopOpacity={0.12} />
            <Stop offset="1" stopColor={tint} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="lowGlow" cx="10%" cy="100%" rx="70%" ry="35%">
            <Stop offset="0" stopColor={colors.blue} stopOpacity={0.1} />
            <Stop offset="1" stopColor={colors.blue} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="vignette" cx="50%" cy="50%" rx="75%" ry="65%">
            <Stop offset="0.6" stopColor="#000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000" stopOpacity={0.55} />
          </RadialGradient>
        </Defs>
        <Rect width={w} height={h} fill={colors.bg} />
        <Rect width={w} height={h} fill="url(#grid)" />
        <Rect width={w} height={h} fill="url(#topGlow)" />
        <Rect width={w} height={h} fill="url(#lowGlow)" />
        <Path d={traces(w, h)} fill="none" stroke={tint} strokeOpacity={0.1} strokeWidth={1} />
        <Rect width={w} height={h} fill="url(#vignette)" />
        <Path
          d={chamferPath(w - 8, frameH, 16, 0.5)}
          transform={`translate(4, ${top})`}
          fill="none"
          stroke={tint}
          strokeOpacity={0.22}
          strokeWidth={1}
        />
      </Svg>
    </View>
  );
});
