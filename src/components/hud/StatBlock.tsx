import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { PixelArt } from '../pixel/PixelArt';
import { colors, space } from '@/config/theme';
import { Text } from '../ui/Text';

interface Props {
  icon?: LucideIcon;
  label: string;
  /** The value line; strings render as glowing numbers. */
  value: ReactNode;
  unit?: string;
  children?: ReactNode;
  accessibilityLabel?: string;
  align?: 'left' | 'center';
}

/** Icon + small-caps label + glowing value. Columns of these form stat strips. */
export function StatBlock({ icon: Icon, label, value, unit, children, accessibilityLabel, align = 'left' }: Props) {
  const center = align === 'center';
  return (
    <View
      style={[styles.block, center && styles.center]}
      accessible
      accessibilityLabel={accessibilityLabel ?? `${label} ${typeof value === 'string' || typeof value === 'number' ? value : ''}`}
    >
      <View style={[styles.head, center && styles.headCenter]}>
        {Icon ? (
          <View style={styles.icon}>
            <Icon size={center ? 22 : 18} color={colors.cyan} strokeWidth={1.8} />
          </View>
        ) : null}
        <Text variant="label" style={[styles.label, center && styles.labelCenter]} numberOfLines={2}>
          {label}
        </Text>
      </View>
      <View style={[styles.valueRow, center && styles.headCenter]}>
        {typeof value === 'string' || typeof value === 'number' ? (
          <Text variant="number" glow style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </Text>
        ) : (
          value
        )}
        {unit ? (
          <Text variant="label" style={styles.unit}>
            {unit}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** The Ghost Coin mark from the concepts: a doubled cyan ring. */
export function CoinRing({ size = 22 }: { size?: number; color?: string }) {
  return <PixelArt name="coin" size={size} />;
}

const styles = StyleSheet.create({
  block: { flex: 1, minWidth: 0, gap: 6, paddingHorizontal: space.xs },
  center: { alignItems: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  icon: { flexShrink: 0 },
  headCenter: { flexDirection: 'column', alignItems: 'center', gap: 4 },
  label: { fontSize: 10, lineHeight: 14, letterSpacing: 1.4, flexShrink: 1 },
  labelCenter: { textAlign: 'center', minHeight: 28, fontSize: 9, letterSpacing: 0.7 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { fontSize: 26, lineHeight: 31 },
  unit: { fontSize: 10 },
});
