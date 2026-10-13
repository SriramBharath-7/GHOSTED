import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { TOUCH, chamfer, colors, fonts, space } from '@/config/theme';
import { Text } from '../ui/Text';
import { HudPressable } from './HudPanel';

type Kind = 'primary' | 'outline' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  kind?: Kind;
  icon?: LucideIcon;
  disabled?: boolean;
  busy?: boolean;
  compact?: boolean;
  accessibilityHint?: string;
}

const FILL: Record<Kind, string | undefined> = {
  primary: 'rgba(79, 216, 255, 0.16)',
  outline: 'rgba(5, 16, 30, 0.5)',
  ghost: 'transparent',
  danger: 'rgba(255, 59, 78, 0.12)',
};

/** Letter-spaced HUD button. Primary glows; danger is the only red control. */
export function SystemButton({ label, onPress, kind = 'outline', icon: Icon, disabled, busy, compact, accessibilityHint }: Props) {
  const ink = kind === 'danger' ? colors.danger : kind === 'ghost' ? colors.textDim : colors.cyanBright;
  return (
    <HudPressable
      onPress={onPress}
      disabled={disabled || busy}
      feedback
      tone={kind === 'danger' ? 'danger' : kind === 'ghost' ? 'none' : kind === 'primary' ? 'active' : 'cyan'}
      fill={FILL[kind]}
      chamfer={chamfer.sm}
      padding={0}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      style={[styles.base, compact && styles.compact, disabled && styles.disabled]}
    >
      {busy ? (
        <ActivityIndicator color={ink} />
      ) : (
        <View style={styles.row}>
          {Icon ? <Icon size={18} color={ink} strokeWidth={1.9} /> : null}
          <Text
            style={[styles.label, { color: ink }]}
            glow={kind === 'primary' ? true : kind === 'danger' ? 'danger' : undefined}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      )}
    </HudPressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: TOUCH + 2, paddingHorizontal: space.xl, alignItems: 'center', justifyContent: 'center' },
  compact: { minHeight: TOUCH - 4, paddingHorizontal: space.lg },
  disabled: { opacity: 0.42 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  label: { fontFamily: fonts.displaySemi, fontSize: 13, letterSpacing: 3, textTransform: 'uppercase' },
});
