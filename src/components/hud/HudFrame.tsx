import { StyleSheet } from 'react-native';
import Animated, { type SharedValue, useAnimatedProps } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '@/config/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
export type FrameTone = 'cyan' | 'dim' | 'active' | 'danger' | 'none';
export const FRAME_BLEED = 3;

/** Stepped corners on a three-pixel grid; the original component API stays stable. */
export function chamferPath(w: number, h: number, c: number, inset = 1.5, offset = 0): string {
  const i = inset + offset;
  const r = w + offset - inset;
  const b = h + offset - inset;
  const k = Math.max(2, Math.min(c, 6, w / 4, h / 4));
  return `M${i+k},${i} H${r-k} V${i+k} H${r} V${b-k} H${r-k} V${b} H${i+k} V${b-k} H${i} V${i+k} H${i+k} Z`;
}
interface Props {
  width: number; height: number; chamfer?: number; tone?: FrameTone; fill?: string;
  double?: boolean; corners?: boolean; highlight?: SharedValue<number>;
}
/** Opaque parchment, a crisp ink edge and brass corners, sized to real content. */
export function HudFrame({ width, height, chamfer = 6, tone = 'cyan', fill, double = false, corners = true, highlight }: Props) {
  const dark = tone === 'danger';
  const active = tone === 'active';
  const path = chamferPath(width, height, chamfer);
  const press = useAnimatedProps(() => ({ opacity: highlight ? highlight.get() * 0.18 : 0 }));
  if (tone === 'none') return null;
  return (
    <Svg pointerEvents="none" width={width} height={height + 3} style={styles.svg}>
      <Path d={path} transform="translate(0 3)" fill={colors.woodDark} />
      <Path d={path} fill={fill ?? (dark ? colors.vaultPanel : active ? '#E9F0CB' : tone === 'dim' ? colors.surface : colors.panel)} stroke={dark ? '#97714D' : colors.woodDark} strokeWidth={3} />
      <Path d={chamferPath(width - 6, height - 6, 3, 1, 3)} fill="none" stroke={dark ? '#4D4044' : active ? '#6AA251' : '#D5A660'} strokeWidth={2} />
      <Path d={`M9 5 H${Math.max(9, width-9)} M5 9 V${Math.max(9, height-9)}`} stroke={dark ? '#AD8555' : '#FFFBE8'} strokeWidth={2} opacity={0.75} />
      {double ? <Path d={chamferPath(width - 12, height - 12, 2, 0.5, 6)} fill="none" stroke={dark ? '#594951' : colors.line} strokeWidth={1} /> : null}
      {corners && width > 54 && height > 36 ? [[7,7],[width-10,7],[7,height-10],[width-10,height-10]].map(([x,y], i) => <Rect key={i} x={x} y={y} width={3} height={3} fill={dark ? colors.gold : colors.border} />) : null}
      <AnimatedPath d={path} fill={colors.gold} animatedProps={press} />
    </Svg>
  );
}
const styles = StyleSheet.create({ svg: { position: 'absolute', left: 0, top: 0, zIndex: -1 } });
