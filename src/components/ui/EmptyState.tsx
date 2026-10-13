import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, space } from '@/config/theme';
import { HudPanel } from '../hud/HudPanel';
import { SystemButton } from '../hud/SystemButton';
import { Text } from './Text';

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
        <View style={[styles.diamond, { borderColor: tint }]} />
        <Icon size={24} color={tint} strokeWidth={1.5} />
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
  diamond: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderWidth: 1,
    transform: [{ rotate: '45deg' }],
  },
  message: { maxWidth: 290 },
});
