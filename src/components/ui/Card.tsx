import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, space } from '@/config/theme';
import { HudPanel } from '../hud/HudPanel';
import { Text } from './Text';

/** Translucent HUD surface (alias kept for screens that only need a panel). */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <HudPanel style={style} tone="dim" chamfer={10}>
      {children}
    </HudPanel>
  );
}

/** Section header: optional icon, wide-tracked title, trailing meta. */
export function SectionTitle({ title, right, icon: Icon }: { title: string; right?: ReactNode; icon?: LucideIcon }) {
  return (
    <View style={styles.section}>
      <View style={styles.left}>
        {Icon ? (
          <View style={styles.icon}>
            <Icon size={20} color={colors.cyan} strokeWidth={1.8} />
          </View>
        ) : null}
        <Text variant="title" accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.title}>
          {title}
        </Text>
      </View>
      {typeof right === 'string' ? (
        <Text variant="label" numberOfLines={1} style={styles.right}>
          {right}
        </Text>
      ) : (
        right
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    minHeight: 30,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1, minWidth: 0 },
  icon: { flexShrink: 0 },
  title: { flexShrink: 1, fontSize: 13, letterSpacing: 1.7 },
  right: { flexShrink: 0, fontSize: 9, letterSpacing: 1.2 },
});
