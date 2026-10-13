import { StyleSheet, View } from 'react-native';
import { colors, fonts, space } from '@/config/theme';
import type { InventoryItem } from '@/repo/inventory';
import { HudFrame } from '../hud/HudFrame';
import { HoloArt } from '../hud/icons';
import { Text } from '../ui/Text';

export const FACE_W = 240;
export const FACE_H = 300;

/** The large item card shown while an item is used (sliced by the dissolve). */
export function ItemFace({ item, lite }: { item: InventoryItem; lite?: boolean }) {
  return (
    <View style={styles.card}>
      <HudFrame width={FACE_W} height={FACE_H} chamfer={14} tone="active" fill={colors.panelStrong} double />
      <Text variant="label" color={colors.cyan}>
        {item.category || 'Reward'}
      </Text>
      <HoloArt name={item.icon} size={96} lite={lite} />
      <Text style={styles.name} numberOfLines={2}>
        {item.name}
      </Text>
      <Text variant="label">×{item.quantity} owned</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: FACE_W,
    height: FACE_H,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xl,
  },
  name: { fontFamily: fonts.bodySemi, fontSize: 24, lineHeight: 29, color: colors.text, textAlign: 'center' },
});
