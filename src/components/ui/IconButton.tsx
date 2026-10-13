import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { TOUCH, colors } from '@/config/theme';
import { HudPressable } from '../hud/HudPanel';

interface Props {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  /** Draws a framed square behind the icon. */
  filled?: boolean;
  size?: number;
}

export function IconButton({ icon: Icon, label, onPress, color = colors.cyanBright, disabled, filled, size = 22 }: Props) {
  return (
    <HudPressable
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.9}
      tone={filled ? 'dim' : 'none'}
      chamfer={4}
      padding={0}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={[styles.base, disabled && styles.disabled]}
    >
      <Icon size={size} color={color} strokeWidth={1.8} />
    </HudPressable>
  );
}

const styles = StyleSheet.create({
  base: { width: TOUCH, height: TOUCH, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
});
