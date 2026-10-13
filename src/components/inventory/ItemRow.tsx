import { CalendarDays, Package } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, fonts, space } from '@/config/theme';
import { type DateKey, formatDate, isoToDateKey } from '@/domain/dates';
import type { InventoryItem } from '@/repo/inventory';
import { HudFrame } from '../hud/HudFrame';
import { HudPanel } from '../hud/HudPanel';
import { SystemButton } from '../hud/SystemButton';
import { HoloArt } from '../hud/icons';
import { Text } from '../ui/Text';

const ART = 72;

/** An owned reward: art, name, description, count and acquired date, then Use. */
export function ItemRow({ item, today, onUse, compact }: { item: InventoryItem; today: DateKey; onUse: () => void; compact: boolean }) {
  return (
    <HudPanel chamfer={12} padding={space.md} style={styles.row}>
      <View style={styles.art}>
        <HudFrame width={ART} height={ART} chamfer={8} tone="dim" />
        <HoloArt name={item.icon} size={42} lite />
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
          <Package size={15} color={colors.cyan} strokeWidth={1.7} />
          <Text style={styles.metaText}>× {item.quantity}</Text>
          <View style={styles.bar} />
          <CalendarDays size={15} color={colors.cyan} strokeWidth={1.7} />
          <Text style={styles.metaText} numberOfLines={1} accessibilityLabel={`Acquired ${formatDate(isoToDateKey(item.lastAcquiredAt), today)}`}>
            {formatDate(isoToDateKey(item.lastAcquiredAt), today)}
          </Text>
        </View>
        {compact ? <View style={styles.compactUse}><SystemButton label="Use item" compact onPress={onUse} /></View> : null}
      </View>
      {compact ? null : <View style={styles.use}>
        <SystemButton label="Use item" compact onPress={onUse} />
      </View>}
    </HudPanel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  art: { width: ART, height: ART, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.bodySemi, fontSize: 18, lineHeight: 23, color: colors.text },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.lineStrong, marginVertical: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textDim, flexShrink: 1 },
  bar: { width: 1, height: 14, backgroundColor: colors.lineStrong, marginHorizontal: 4 },
  use: { width: 128 },
  compactUse: { marginTop: space.sm, alignSelf: 'flex-start', minWidth: 134 },
});
