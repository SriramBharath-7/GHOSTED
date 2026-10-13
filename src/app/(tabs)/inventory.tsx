import { router } from 'expo-router';
import { Backpack, Box, Clock } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppHeader } from '@/components/hud/AppHeader';
import { HudPanel } from '@/components/hud/HudPanel';
import { HudTabs } from '@/components/hud/HudTabs';
import { LineIcon } from '@/components/hud/icons';
import { Disintegrate } from '@/components/inventory/Disintegrate';
import { ItemFace } from '@/components/inventory/ItemFace';
import { ItemRow } from '@/components/inventory/ItemRow';
import { WorldScene } from '@/components/pixel/WorldScene';
import { EmptyState } from '@/components/ui/EmptyState';
import { Reveal, Screen } from '@/components/ui/Screen';
import { ConfirmSheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { toast } from '@/components/ui/Toast';
import { colors, space } from '@/config/theme';
import { getDb } from '@/db/database';
import { formatDate, isoToDateKey } from '@/domain/dates';
import { type InventoryItem, listInventory, listRedemptions, redeemItem } from '@/repo/inventory';
import { useGame } from '@/state/game';
import { useLiveQuery } from '@/state/useLiveQuery';

const TABS = [
  { value: 'items', label: 'Items', icon: Box },
  { value: 'history', label: 'History', icon: Clock },
] as const;

export default function InventoryScreen() {
  const { width } = useWindowDimensions();
  const items = useLiveQuery(listInventory);
  const used = useLiveQuery(listRedemptions);
  const today = useGame((s) => s.today);
  const commit = useGame((s) => s.commit);
  const [tab, setTab] = useState<'items' | 'history'>('items');
  const [confirm, setConfirm] = useState<InventoryItem | null>(null);
  const [burning, setBurning] = useState<InventoryItem | null>(null);
  const consuming = useRef(false);

  const use = async (item: InventoryItem) => {
    if (consuming.current) return;
    consuming.current = true;
    setConfirm(null);
    try {
      const result = await redeemItem(getDb(), item.id);
      if (!result.ok) {
        toast('That item is already used up.', 'error');
        await commit();
        return;
      }
      setBurning(item);
      await commit();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not use this item. Please try again.', 'error');
    } finally {
      consuming.current = false;
    }
  };
  const finishConsumption = useCallback(() => setBurning(null), []);

  const list = items ?? [];
  return (
    <Screen header={<AppHeader />}>
      <Reveal index={0}>
        <WorldScene variant="inventory" title="Your adventure pack" subtitle="Good things you earned. Ready when you are." height={150} />
      </Reveal>
      <Reveal index={1}>
        <HudTabs options={TABS} value={tab} onChange={setTab} height={54} />
      </Reveal>

      {tab === 'items' ? (
        items && list.length === 0 ? (
          <EmptyState
            icon={Backpack}
            title="Your pack is waiting"
            message="Rewards you buy in the Shop are kept here. Save something for a day that needs it."
            action={{ label: 'Visit the Shop', onPress: () => router.navigate('/shop') }}
          />
        ) : (
          list.map((item, i) => (
            <Reveal key={item.id} index={2 + i}>
              <ItemRow item={item} today={today} compact={width < 440} onUse={() => setConfirm(item)} />
            </Reveal>
          ))
        )
      ) : used && used.length === 0 ? (
        <EmptyState icon={Clock} title="No history yet" message="Items you use are logged here." />
      ) : (
        <HudPanel double style={styles.history}>
          <Text variant="label" style={styles.historyTitle}>Rewards enjoyed</Text>
          {(used ?? []).map((r) => (
            <View key={r.id} style={styles.historyRow}>
              <LineIcon name={r.icon} size={30} />
              <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                {r.name}
              </Text>
              <Text variant="caption">{formatDate(isoToDateKey(r.redeemedAt), today)}</Text>
            </View>
          ))}
        </HudPanel>
      )}

      <ConfirmSheet
        visible={confirm !== null}
        title={confirm ? `Use ${confirm.name}?` : ''}
        message="One copy is consumed. This can’t be undone."
        confirmLabel="Use item"
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && void use(confirm)}
      />

      <Modal visible={burning !== null} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={finishConsumption}>
        <View style={styles.burn}>
          {burning ? (
            <Disintegrate
              face={<ItemFace item={burning} lite />}
              onDone={finishConsumption}
            />
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  history: { gap: 0 },
  historyTitle: { marginBottom: space.sm },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  flex: { flex: 1 },
  burn: { flex: 1, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center' },
});
