import { StyleSheet } from 'react-native';
import Animated, { type SharedValue, useAnimatedProps } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { colors, glow } from '@/config/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type FrameTone = 'cyan' | 'dim' | 'active' | 'danger' | 'none';

const TONES: Record<FrameTone, { stroke: string; corner: string; fill: string }> = {
  cyan: { stroke: colors.border, corner: colors.cyan, fill: colors.panel },
  dim: { stroke: colors.lineStrong, corner: 'rgba(79, 216, 255, 0.55)', fill: colors.surface },
  active: { stroke: colors.borderActive, corner: colors.cyanBright, fill: 'rgba(20, 74, 112, 0.42)' },
  danger: { stroke: 'rgba(255, 59, 78, 0.72)', corner: colors.danger, fill: 'rgba(42, 6, 14, 0.62)' },
  none: { stroke: 'transparent', corner: 'transparent', fill: 'transparent' },
};

/** Room around the frame for the soft glow strokes. */
export const FRAME_BLEED = 4;

/** Rectangle with all four corners cut at `c`. */
export function chamferPath(w: number, h: number, c: number, inset = 0.5, offset = 0): string {
  const i = inset + offset;
  const x2 = w + offset - inset;
  const y2 = h + offset - inset;
  const k = Math.min(c, w / 3, h / 3);
  return `M${i + k},${i} H${x2 - k} L${x2},${i + k} V${y2 - k} L${x2 - k},${y2} H${i + k} L${i},${y2 - k} V${i + k} Z`;
}

/** Brighter brackets hugging each chamfered corner. */
function cornerPath(w: number, h: number, c: number, o: number): string {
  const k = Math.min(c, w / 3, h / 3);
  const b = Math.min(16, w / 5, h / 4);
  const i = 0.5 + o;
  const x2 = w + o - 0.5;
  const y2 = h + o - 0.5;
  return [
    `M${i},${i + k + b} V${i + k} L${i + k},${i} H${i + k + b}`,
    `M${x2 - k - b},${i} H${x2 - k} L${x2},${i + k} V${i + k + b}`,
    `M${x2},${y2 - k - b} V${y2 - k} L${x2 - k},${y2} H${x2 - k - b}`,
    `M${i + k + b},${y2} H${i + k} L${i},${y2 - k} V${y2 - k - b}`,
  ].join(' ');
}

interface Props {
  width: number;
  height: number;
  chamfer?: number;
  tone?: FrameTone;
  /** Overrides the tone's fill (e.g. a completed row tint). */
  fill?: string;
  /** Second inset hairline, for primary panels. */
  double?: boolean;
  corners?: boolean;
  /** 0..1 extra glow, driven by press or active state. */
  highlight?: SharedValue<number>;
}

/**
 * The HUD frame: translucent chamfered body, thin cyan border, layered glow
 * strokes (no SVG filters, so it stays cheap on Android) and corner brackets.
 * Drawn behind content; it never takes touches.
 */
export function HudFrame({
  width,
  height,
  chamfer = 10,
  tone = 'cyan',
  fill,
  double = false,
  corners = true,
  highlight,
}: Props) {
  const t = TONES[tone];
  const o = FRAME_BLEED;
  const outline = chamferPath(width, height, chamfer, 0.5, o);
  const glowProps = useAnimatedProps(() => ({
    strokeOpacity: glow.frame.mid + (highlight ? highlight.get() * glow.frame.active : 0),
  }));
  const outerProps = useAnimatedProps(() => ({
    strokeOpacity: glow.frame.outer + (highlight ? highlight.get() * glow.frame.mid : 0),
  }));

  if (tone === 'none') return null;
  return (
    <Svg
      pointerEvents="none"
      width={width + o * 2}
      height={height + o * 2}
      style={[styles.svg, { left: -o, top: -o }]}
    >
      <AnimatedPath d={outline} fill="none" stroke={t.stroke} strokeWidth={6} animatedProps={outerProps} />
      <AnimatedPath d={outline} fill="none" stroke={t.stroke} strokeWidth={2.6} animatedProps={glowProps} />
      <Path d={outline} fill={fill ?? t.fill} stroke={t.stroke} strokeWidth={1} />
      {double ? (
        <Path
          d={chamferPath(width - 8, height - 8, Math.max(2, chamfer - 3), 0.5, o + 4)}
          fill="none"
          stroke={t.stroke}
          strokeOpacity={0.35}
          strokeWidth={0.8}
        />
      ) : null}
      {corners ? <Path d={cornerPath(width, height, chamfer, o)} fill="none" stroke={t.corner} strokeWidth={1.8} /> : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  svg: { position: 'absolute' },
});
