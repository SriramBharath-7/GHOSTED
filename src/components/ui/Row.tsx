import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { TOUCH, colors, space } from '@/config/theme';
import { haptics } from '@/services/haptics';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface RowProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  danger?: boolean;
  onLongPress?: () => void;
}

/** List row for settings-style panels. */
export function Row({ icon: Icon, title, subtitle, onPress, right, danger, onLongPress }: RowProps) {
  const color = danger ? colors.danger : colors.text;
  const body = (
    <>
      {Icon ? <Icon size={20} color={danger ? colors.danger : colors.cyan} strokeWidth={1.7} /> : null}
      <View style={styles.text}>
        <Text variant="bodyStrong" color={color}>
          {title}
        </Text>
        {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <ChevronRight size={18} color={colors.textMuted} /> : null)}
    </>
  );
  if (!onPress && !onLongPress) return <View style={styles.row}>{body}</View>;
  return (
    <PressableScale scaleTo={0.985} onPress={onPress} onLongPress={onLongPress} accessibilityRole="button" style={styles.row}>
      {body}
    </PressableScale>
  );
}

interface ToggleProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  tint?: string;
  disabled?: boolean;
}

export function ToggleRow({ icon, title, subtitle, value, onChange, tint = colors.cyan, disabled }: ToggleProps) {
  return (
    <Row
      icon={icon}
      title={title}
      subtitle={subtitle}
      right={
        <Switch
          value={value}
          disabled={disabled}
          onValueChange={(next) => {
            haptics.tap();
            onChange(next);
          }}
          trackColor={{ false: 'rgba(79, 216, 255, 0.14)', true: tint }}
          thumbColor={value ? colors.cyanBright : colors.textDim}
          accessibilityLabel={title}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: TOUCH + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
  },
  text: { flex: 1, gap: 2 },
});
