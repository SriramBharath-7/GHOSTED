import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, space } from '@/config/theme';
import { HudPanel } from '../hud/HudPanel';
import { SystemButton } from '../hud/SystemButton';
import { Text } from './Text';
import { PixelArt } from '../pixel/PixelArt';

interface Props {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: { label: string; onPress: () => void };
  tint?: string;
}

/** Designed placeholder for "nothing here yet" and error-ish states. */
export function EmptyState({ icon: Icon, title, message, action, tint = colors.cyan }: Props) {
  return (
    <HudPanel tone="dim" chamfer={10} style={styles.wrap} padding={space.xxl}>
      <View style={styles.badge}>
        <PixelArt name="ghost" size={56} />
        <View style={styles.marker}><Icon size={16} color={tint} strokeWidth={2} /></View>
      </View>
      <Text variant="title" align="center">
        {title}
      </Text>
      <Text variant="caption" align="center" style={styles.message}>
        {message}
      </Text>
      {action ? <SystemButton label={action.label} compact onPress={action.onPress} /> : null}
    </HudPanel>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.md },
  badge: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  marker: {
    position: 'absolute',
    right: -7, bottom: 0, padding: 3,
    borderWidth: 2, borderColor: colors.border, backgroundColor: colors.cream,
  },
  message: { maxWidth: 290 },
});
