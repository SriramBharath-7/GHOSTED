import { View } from 'react-native';
import { colors } from '@/config/theme';
import { type FrameTone, HudFrame } from './HudFrame';
import { LineIcon } from './icons';

interface Props {
  icon: string;
  size?: number;
  tone?: FrameTone;
  color?: string;
}

/** A small framed square holding a line icon (rows, headers, tags). */
export function IconBox({ icon, size = 44, tone = 'dim', color = colors.cyan }: Props) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <HudFrame width={size} height={size} chamfer={Math.round(size / 8)} tone={tone} corners={size >= 40} />
      <LineIcon name={icon} size={Math.round(size * 0.5)} color={color} />
    </View>
  );
}
