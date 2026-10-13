import { CalendarDays } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, fonts, space } from '@/config/theme';
import { type DateKey, formatDate, isoToDateKey } from '@/domain/dates';
import type { InventoryItem } from '@/repo/inventory';
import { HudPanel } from '../hud/HudPanel';
import { SystemButton } from '../hud/SystemButton';
import { HoloArt } from '../hud/icons';
import { Text } from '../ui/Text';

const ART = 82;

/** An owned reward: art, name, description, count and acquired date, then Use. */
export function ItemRow({ item, today, onUse, compact }: { item: InventoryItem; today: DateKey; onUse: () => void; compact: boolean }) {
  return (
    <HudPanel double padding={space.md} style={styles.row}>
      <View style={styles.art}>
        <HoloArt name={item.icon} size={50} lite />
        <View style={styles.quantity}><Text style={styles.quantityText}>×{item.quantity}</Text></View>
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        {item.description ? (
          <Text variant="caption" numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.rule} />
        <View style={styles.meta}>
          <CalendarDays size={13} color={colors.textMuted} strokeWidth={1.7} />
          <Text style={styles.metaText} numberOfLines={1} accessibilityLabel={`Acquired ${formatDate(isoToDateKey(item.lastAcquiredAt), today)}`}>
            {formatDate(isoToDateKey(item.lastAcquiredAt), today)}
          </Text>
        </View>
        {compact ? <View style={styles.compactUse}><SystemButton label="Use item" kind="primary" compact onPress={onUse} /></View> : null}
      </View>
      {compact ? null : <View style={styles.use}>
        <SystemButton label="Use item" kind="primary" compact onPress={onUse} />
      </View>}
    </HudPanel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  art: { width: ART, height: ART, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.lineStrong, backgroundColor: colors.surfaceHigh },
  quantity: { position: 'absolute', right: -4, bottom: -4, minWidth: 30, paddingHorizontal: 4, paddingVertical: 1, borderWidth: 2, borderColor: colors.wood, backgroundColor: colors.cream, alignItems: 'center' },
  quantityText: { fontFamily: fonts.number, fontSize: 13, lineHeight: 18, color: colors.text },
  body: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontFamily: fonts.bodySemi, fontSize: 18, lineHeight: 23, color: colors.text },
  rule: { height: 1, backgroundColor: colors.line, marginVertical: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textDim, flexShrink: 1 },
  use: { width: 114 },
  compactUse: { marginTop: space.sm, alignSelf: 'flex-start', minWidth: 122 },
});
