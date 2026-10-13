import { router, useLocalSearchParams } from 'expo-router';
import { Trash } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { IconPicker } from '@/components/hud/IconPicker';
import { HudPanel } from '@/components/hud/HudPanel';
import { HoloArt, REWARD_ICONS } from '@/components/hud/icons';
import { SectionTitle } from '@/components/ui/Card';
import { Header } from '@/components/ui/Header';
import { ToggleRow } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { ConfirmSheet } from '@/components/ui/Sheet';
import { Stepper } from '@/components/ui/Stepper';
import { TextField } from '@/components/ui/TextField';
import { Text } from '@/components/ui/Text';
import { REWARD_LIMITS } from '@/config/game';
import { colors, space } from '@/config/theme';
import type { Db } from '@/db/db';
import { getDb } from '@/db/database';
import { type RewardInput, createReward, deleteReward, getReward, updateReward } from '@/repo/rewards';
import { useGame } from '@/state/game';
import { useLiveQuery } from '@/state/useLiveQuery';


export default function RewardEditorScreen() {
  const params = useLocalSearchParams<{ id?: string; name?: string; icon?: string; cost?: string; category?: string }>();
  const id = params.id ? Number(params.id) : null;
  const load = useCallback((db: Db) => (id ? getReward(db, id) : Promise.resolve(null)), [id]);
  const existing = useLiveQuery(load);
  if (existing === undefined) return <Screen header={<Header back title="Reward" />}>{null}</Screen>;
  const initial: RewardInput = existing
    ? {
        name: existing.name,
        icon: existing.icon,
        description: existing.description,
        category: existing.category,
        cost: existing.cost,
        stock: existing.stock,
      }
    : {
        name: params.name ?? '',
        icon: params.icon ?? 'gift',
        description: '',
        category: params.category ?? '',
        cost: Number(params.cost) || 100,
        stock: null,
      };
  return <RewardForm id={existing ? id : null} initial={initial} />;
}

function RewardForm({ id, initial }: { id: number | null; initial: RewardInput }) {
  const commit = useGame((s) => s.commit);
  const [form, setForm] = useState<RewardInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof RewardInput>(key: K, value: RewardInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.name.trim()) return setError('Name the reward.');
    if (form.cost < 1) return setError('Cost must be at least 1 coin.');
    const db = getDb();
    if (id) await updateReward(db, id, form);
    else await createReward(db, form);
    await commit();
    router.back();
  };

  return (
    <Screen header={<Header back eyebrow={id ? 'Edit reward' : 'New reward'} title={form.name || 'Untitled'} />}>
      <HudPanel style={styles.preview}>
        <HoloArt name={form.icon} size={64} />
        <View style={styles.previewCopy}>
          <Text variant="heading">A reward worth earning</Text>
          <Text variant="caption">Put something you love on the shop shelf.</Text>
        </View>
      </HudPanel>
      <TextField
        label="Name"
        value={form.name}
        onChangeText={(t) => {
          setError(null);
          set('name', t);
        }}
        placeholder="e.g. Cheat Meal"
        error={error}
        maxLength={50}
      />
      <TextField label="Description" value={form.description} onChangeText={(t) => set('description', t)} placeholder="Optional" maxLength={160} />
      <TextField label="Category" value={form.category} onChangeText={(t) => set('category', t)} placeholder="Optional · e.g. Food, Fun" maxLength={24} />

      <SectionTitle title="Icon" />
      <IconPicker icons={REWARD_ICONS} value={form.icon} onChange={(icon) => set('icon', icon)} />

      <SectionTitle title="Price" />
      <Stepper label="Cost in Ghost Coins" value={form.cost} onChange={(v) => set('cost', v)} min={1} max={REWARD_LIMITS.maxRewardCost} step={10} color={colors.coin} />

      <ToggleRow
        title="Limited stock"
        subtitle="Off = buy as often as you can afford"
        value={form.stock !== null}
        onChange={(on) => set('stock', on ? (initial.stock ?? 1) : null)}
      />
      {form.stock !== null ? (
        <Stepper label="In stock" value={form.stock} onChange={(v) => set('stock', v)} max={999} step={1} />
      ) : null}

      <Button label={id ? 'Save' : 'Add to shop'} onPress={() => void save()} />
      {id ? <Button label="Delete reward" kind="ghost" icon={Trash} onPress={() => setConfirmDelete(true)} /> : null}

      <ConfirmSheet
        visible={confirmDelete}
        title="Delete this reward?"
        message="It leaves the shop. Copies you already own stay in your Inventory."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (!id) return;
          setConfirmDelete(false);
          await deleteReward(getDb(), id);
          await commit();
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  previewCopy: { flex: 1, gap: space.xs },
});
