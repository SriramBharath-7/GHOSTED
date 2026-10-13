import { StyleSheet, View } from 'react-native';
import { colors, fonts, space } from '@/config/theme';
import type { InventoryItem } from '@/repo/inventory';
import { HudFrame } from '../hud/HudFrame';
import { HoloArt } from '../hud/icons';
import { PixelArt } from '../pixel/PixelArt';
import { Text } from '../ui/Text';

export const FACE_W = 240;
export const FACE_H = 300;

/** A little reward receipt, sliced into pixel tiles during consumption. */
export function ItemFace({ item, lite }: { item: InventoryItem; lite?: boolean }) {
  return (
    <View style={styles.card}>
      <HudFrame width={FACE_W} height={FACE_H} chamfer={14} tone="active" fill={colors.panelStrong} double />
      <PixelArt name="star" size={26} />
      <Text variant="label" color={colors.coin}>
        {item.category || 'Reward'}
      </Text>
      <View style={styles.art}><HoloArt name={item.icon} size={86} lite={lite} /></View>
      <Text style={styles.name} numberOfLines={2}>
        {item.name}
      </Text>
      <Text variant="caption">One well-earned reward</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    zIndex: 0,
    width: FACE_W,
    height: FACE_H,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    padding: space.xl,
  },
  art: { paddingVertical: space.sm },
  name: { fontFamily: fonts.bodySemi, fontSize: 22, lineHeight: 27, color: colors.text, textAlign: 'center' },
});
