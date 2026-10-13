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
  primary: colors.success,
  outline: colors.panelStrong,
  ghost: 'transparent',
  danger: colors.wood,
};

/** Letter-spaced HUD button. Primary glows; danger is the only red control. */
export function SystemButton({ label, onPress, kind = 'outline', icon: Icon, disabled, busy, compact, accessibilityHint }: Props) {
  const ink = kind === 'primary' || kind === 'danger' ? colors.cream : kind === 'ghost' ? colors.textDim : colors.text;
  return (
    <HudPressable
      onPress={onPress}
      disabled={disabled || busy}
      feedback
      tone={kind === 'ghost' ? 'none' : 'cyan'}
      fill={FILL[kind]}
      chamfer={chamfer.sm}
      padding={0}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
      style={[styles.base, compact && styles.compact, disabled && styles.disabled]}
    >
      {busy ? (
        <ActivityIndicator color={ink} />
      ) : (
        <View style={styles.row}>
          {Icon ? <Icon size={18} color={ink} strokeWidth={1.9} /> : null}
          <Text
            style={[styles.label, { color: ink }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
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
  compact: { minHeight: TOUCH, paddingHorizontal: space.md },
  disabled: { opacity: 0.42 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, maxWidth: '100%' },
  label: { fontFamily: fonts.displaySemi, fontSize: 13, letterSpacing: 0.2, textTransform: 'uppercase', flexShrink: 1 },
});
